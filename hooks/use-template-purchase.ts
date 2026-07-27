/**
 * Template purchase round-trip via Stripe web checkout.
 *
 * US storefront only — callers must gate the CTA behind
 * useExternalPurchases() (Guideline 3.1.1(a)).
 *
 * Flow: create a checkout session for one template + booth, open the
 * Stripe-hosted page in an auth-session browser, and interpret the
 * intercepted boothiq:// redirect. The website's success page redirects to
 * boothiq://template-purchase-success, the cancel path to
 * boothiq://template-purchase-cancel — both are intercepted here (same
 * scheme), so the redirect URL, not the result type alone, decides the
 * outcome. Cold-start returns (user killed the app mid-checkout) are
 * handled by the same-named cases in use-deep-links.ts.
 */

import { useRef, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { useQueryClient } from "@tanstack/react-query";
import { useTemplateCheckout } from "@/api/templates/queries";
import { queryKeys } from "@/api/utils/query-keys";
import { EXTERNAL_PURCHASES } from "@/constants/config";

export type TemplatePurchaseOutcome = "success" | "cancelled";

const SUCCESS_REDIRECT = "boothiq://template-purchase-success";

export function useTemplatePurchase(): {
	purchase: (args: {
		templateId: string;
		boothId: string;
	}) => Promise<TemplatePurchaseOutcome>;
	isPurchasing: boolean;
} {
	const queryClient = useQueryClient();
	const checkout = useTemplateCheckout();
	const [isPurchasing, setIsPurchasing] = useState(false);
	// Ref guard: state-based `disabled` only applies from the next render, so
	// a same-frame double-tap would open two checkout sessions without this.
	const inFlightRef = useRef(false);

	async function purchase({
		templateId,
		boothId,
	}: {
		templateId: string;
		boothId: string;
	}): Promise<TemplatePurchaseOutcome> {
		if (inFlightRef.current) return "cancelled";
		inFlightRef.current = true;
		setIsPurchasing(true);
		try {
			const site = EXTERNAL_PURCHASES.WEBSITE_URL;
			const session = await checkout.mutateAsync({
				booth_id: boothId,
				items: [{ template_id: templateId, quantity: 1 }],
				// {CHECKOUT_SESSION_ID} is substituted by Stripe on redirect.
				success_url: `${site}/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=templates`,
				cancel_url: `${site}/templates`,
			});

			if (!session.success || !session.checkout_url) {
				throw new Error(
					session.error_message || "Could not start checkout. Try again.",
				);
			}

			const result = await WebBrowser.openAuthSessionAsync(
				session.checkout_url,
				SUCCESS_REDIRECT,
				// Skips the system consent alert and Safari cookie sharing —
				// Stripe checkout needs neither.
				{ preferEphemeralSession: true },
			);

			// Refresh on ANY browser return: the user may have paid and closed
			// the sheet before the success redirect fired — only the server
			// knows the outcome. Invalidation is cheap and idempotent.
			queryClient.invalidateQueries({
				queryKey: ["templates", "purchased"],
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.templates.detail(templateId),
			});

			// Both success and cancel redirects share the boothiq:// scheme and
			// are intercepted as type "success" — the URL decides the outcome.
			if (
				result.type === "success" &&
				result.url.includes("template-purchase-success")
			) {
				return "success";
			}
			return "cancelled";
		} finally {
			inFlightRef.current = false;
			setIsPurchasing(false);
		}
	}

	return { purchase, isPurchasing };
}
