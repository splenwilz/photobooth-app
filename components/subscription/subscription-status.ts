/**
 * One status→label/colour mapping for every subscription surface.
 *
 * Previously the card and the details sheet each had their own switch. The
 * sheet's covered four cases and its `default` returned the raw value, so a
 * booth in `unpaid` or `incomplete_expired` rendered the backend enum verbatim
 * — and the two components disagreed about the same booth.
 */

import { BRAND_COLOR, StatusColors } from "@/constants/theme";
import type { BoothSubscriptionState } from "@/api/payments";

export interface StatusDisplay {
	color: string;
	text: string;
}

/**
 * Covers the full `SubscriptionStatus` union plus the `null` / unknown cases.
 * Never echoes an unrecognised server value back to the user.
 */
export function getStatusDisplay(status: string | null | undefined): StatusDisplay {
	switch (status) {
		case "active":
			return { color: StatusColors.success, text: "Active" };
		case "trialing":
			return { color: BRAND_COLOR, text: "Trial" };
		case "past_due":
			return { color: StatusColors.warning, text: "Past Due" };
		case "canceled":
			return { color: StatusColors.error, text: "Canceled" };
		case "unpaid":
			return { color: StatusColors.error, text: "Unpaid" };
		case "incomplete":
			return { color: StatusColors.error, text: "Incomplete" };
		case "incomplete_expired":
			return { color: StatusColors.error, text: "Expired" };
		case null:
		case undefined:
			return { color: StatusColors.neutral, text: "No Subscription" };
		default:
			return { color: StatusColors.neutral, text: "Unknown" };
	}
}

/**
 * States from which a NEW subscription may be started.
 *
 * `past_due` / `unpaid` are excluded deliberately: those booths still have a
 * subscription, so a Subscribe CTA would create a second one alongside the
 * unpaid original. `canceled` is included — that subscription has ended, so
 * subscribing is the correct action and duplicates nothing.
 */
export function canStartNewSubscription(
	state: BoothSubscriptionState | undefined,
): boolean {
	return state === "none" || state === "canceled";
}

/**
 * States where the subscription has actually ended, as opposed to merely being
 * inactive.
 *
 * `past_due` and `unpaid` are inactive but NOT ended — Stripe retries them, so
 * their period end is still a renewal date. Keying "ended" on `!is_active`
 * instead of this predicate is what made the sheet say "Ended on" for a booth
 * the card called "Renews:".
 */
export function hasSubscriptionEnded(
	state: BoothSubscriptionState | undefined,
): boolean {
	return state === "canceled";
}

/**
 * States where a Stripe `payment_method_update` flow can succeed.
 *
 * A cancelled subscription has nothing to re-card: minting the flow against it
 * returns `flow_not_available` / `no_subscription`, so the button would render
 * and be guaranteed to fail. `past_due` and `unpaid` are included deliberately —
 * fixing the card is the whole point for those.
 */
export function canUpdatePaymentCard(
	state: BoothSubscriptionState | undefined,
): boolean {
	return (
		state === "active" ||
		state === "trialing" ||
		state === "past_due" ||
		state === "unpaid"
	);
}
