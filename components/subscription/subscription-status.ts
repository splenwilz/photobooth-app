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
			return { color: StatusColors.warning, text: "Incomplete" };
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
