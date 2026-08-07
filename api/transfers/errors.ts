/**
 * Booth Transfer Error Handling
 *
 * The API reports transfer errors as `detail: { code, message }`. The client
 * lifts the code onto `ApiError.code` and passes the whole detail object
 * through on `ApiError.detail`. Branch on the code (never on message text)
 * and map to user-facing copy here.
 *
 * Mirrors the web dashboard's core/api/transfers/errors.ts — keep in sync.
 */

import { ApiError } from "../client";
import type { SubscriptionIncludedDetail } from "./types";

/**
 * Extract the structured error code from an ApiError.
 * Returns null for network errors, non-ApiErrors, and unstructured bodies.
 */
export function getTransferErrorCode(error: unknown): string | null {
	if (!(error instanceof ApiError)) return null;
	return error.code ?? null;
}

/**
 * The 409 `subscription_included` checkout guard, or null for any other
 * error. Raised by the booth checkout endpoint while a completed transfer
 * rides out the previous owner's subscription.
 */
export function getSubscriptionIncludedDetail(
	error: unknown,
): SubscriptionIncludedDetail | null {
	if (getTransferErrorCode(error) !== "subscription_included") return null;
	const detail = ((error as ApiError).detail ?? {}) as Record<string, unknown>;
	return {
		code: "subscription_included",
		message: typeof detail.message === "string" ? detail.message : "",
		included_until:
			typeof detail.included_until === "string" ? detail.included_until : null,
	};
}

const MINUTE = 60;
/** Above a day the number stops being useful copy ("in about 27777778 hours"). */
const MAX_HUMANIZED_RETRY_SECONDS = 24 * 60 * MINUTE;

function formatRetryAfter(seconds: number | undefined): string {
	if (!seconds || seconds <= 0 || seconds > MAX_HUMANIZED_RETRY_SECONDS) {
		return "later";
	}
	if (seconds < MINUTE) return "in a minute";
	const minutes = Math.ceil(seconds / MINUTE);
	if (minutes < 90) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
	const hours = Math.round(minutes / MINUTE);
	return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * User-facing message for a transfer API error. Falls back to the server's
 * `detail.message`, then the generic ApiError message.
 */
export function transferErrorMessage(error: unknown): string {
	const code = getTransferErrorCode(error);
	switch (code) {
		case "booth_not_found":
			return "This booth could not be found. It may have been deleted or transferred already.";
		case "self_transfer":
			return "You can't transfer a booth to your own email address.";
		case "transfer_already_pending":
			return "This booth already has a pending transfer offer. Withdraw it before sending a new one.";
		case "rate_limited": {
			const retryAfter =
				error instanceof ApiError ? error.retryAfterSeconds : undefined;
			return `Too many transfer offers. Please try again ${formatRetryAfter(retryAfter)}.`;
		}
		case "no_pending_transfer":
			// Shared by withdraw AND resend, so the copy can't name either.
			return "This offer is no longer open.";
		case "not_addressed_to_you":
			return "This offer was sent to a different email address. Sign in with the account the offer was addressed to.";
		case "invalid_token":
			return "This accept link is no longer valid. It may have been replaced by a newer offer email; open the link in the most recent one.";
		case "transfer_not_found":
			return "This transfer offer no longer exists. The link may be stale.";
		case "transfer_not_pending":
			return "This offer is no longer pending.";
		case "booth_owner_changed":
			return "The booth changed hands since this offer was made, so the offer is no longer valid.";
		case "transfer_expired":
			return "This offer has expired. Ask the seller to re-send the offer email.";
		case "subscription_included":
			return "This booth's subscription is already included from its previous owner.";
		default: {
			if (error instanceof ApiError) {
				const detail = error.detail as Record<string, unknown> | undefined;
				if (detail && typeof detail.message === "string" && detail.message) {
					return detail.message;
				}
				return error.message;
			}
			return error instanceof Error ? error.message : "Something went wrong.";
		}
	}
}
