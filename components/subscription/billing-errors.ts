/**
 * Shared mapping from backend billing error codes to user-facing copy.
 *
 * Lives outside the details sheet because the account-level billing entry point
 * in Settings hits the same Stripe portal and the same error surface — when the
 * mapping lived only in the sheet, that row dumped raw backend prose into an
 * alert while the sheet next to it showed considered copy for the identical
 * code.
 */

import { type BoothBillingErrorCode, isBoothBillingErrorCode } from "@/api/payments";

/**
 * True when a message is a serialised object rather than prose.
 *
 * The API client falls back to `JSON.stringify` for error bodies with no
 * human-readable text (e.g. `{"detail": {"code": "flow_not_available"}}`).
 * That is useful for logs and useless to a user, so the copy helpers below
 * fall through to their own wording instead of echoing it.
 */
function looksLikeSerialisedObject(message: string): boolean {
	const trimmed = message.trim();
	return (
		(trimmed.startsWith("{") && trimmed.endsWith("}")) ||
		(trimmed.startsWith("[") && trimmed.endsWith("]"))
	);
}

/**
 * `error.message`, unless it is unusable as user-facing copy.
 *
 * Exported so every surface that shows an API error can apply the same filter —
 * the raw-JSON problem this guards against is not specific to one screen.
 */
export function readableMessage(error: unknown): string | undefined {
	const message = error instanceof Error ? error.message.trim() : "";
	if (!message) return undefined;
	return looksLikeSerialisedObject(message) ? undefined : message;
}

/**
 * Read the backend's machine-readable code off an error, narrowed to codes this
 * app actually routes on.
 *
 * Duck-typed rather than `instanceof ApiError` so a re-thrown or wrapped error
 * still routes. Narrowed because `ApiError.code` extraction is permissive: a
 * bare `{"detail": "unauthorized"}` parses as a code, and without the guard it
 * could match a branch by accident.
 */
export function errorCodeOf(error: unknown): BoothBillingErrorCode | undefined {
	if (typeof error === "object" && error !== null && "code" in error) {
		const { code } = error as { code?: unknown };
		if (typeof code === "string" && isBoothBillingErrorCode(code)) {
			return code;
		}
	}
	return undefined;
}

/**
 * Portal-session failures, mapped to what the user should do.
 *
 * `invalid_return_url` (422) and `flow_not_available` (409) are both
 * configuration faults rather than user errors, but they have different owners
 * and different fixes, so they get different copy — collapsing them into one
 * "contact support" makes a misconfigured build indistinguishable from a
 * missing Stripe portal feature.
 */
export function portalErrorMessage(error: unknown): string {
	const code = errorCodeOf(error);

	if (__DEV__ && code) {
		// The code, never the session URL — that is a bearer credential.
		console.warn(`[Billing] portal session refused: ${code}`);
	}

	switch (code) {
		case "invalid_return_url":
			// Our return_url host is not on the backend's allowlist. In dev this is
			// normally the tunnel host, which the backend has to add to
			// PORTAL_RETURN_URL_ALLOWED_HOSTS. In production it means
			// EXPO_PUBLIC_WEBSITE_URL and the backend's allowlist disagree.
			return __DEV__
				? "Backend rejected the return URL (422). Add this tunnel host to PORTAL_RETURN_URL_ALLOWED_HOSTS."
				: "Billing isn't available in this version of the app. Please contact support.";
		case "flow_not_available":
			return "That billing action isn't set up yet. Please contact support.";
		case "no_subscription":
			return "This booth has no subscription to update.";
		case "booth_not_found":
			return "This booth is no longer available on your account.";
		case "stripe_unavailable":
			return "Billing is temporarily unavailable. Try again in a moment.";
		default:
			return readableMessage(error) ?? "Could not open the billing page.";
	}
}

/**
 * Cancel/resume failures, mapped to copy the user can act on.
 *
 * Previously only the resume path routed codes and cancel dumped raw
 * `error.message` into an alert, so identical backend codes produced different
 * quality of message depending on which button was pressed.
 */
export function mutationErrorMessage(
	error: unknown,
	action: "cancel" | "resume",
): string {
	switch (errorCodeOf(error)) {
		case "period_elapsed":
			return "This booth's subscription has already ended.";
		case "not_scheduled_to_cancel":
			return "This subscription isn't scheduled to cancel.";
		case "no_subscription":
			return "This booth no longer has a subscription.";
		case "booth_not_found":
			return "This booth is no longer available on your account.";
		case "stripe_unavailable":
			return "Billing is temporarily unavailable. Try again in a moment.";
		default:
			return (
				readableMessage(error) ?? `Could not ${action} the subscription.`
			);
	}
}
