/**
 * Payments API surface contract
 *
 * Storefront policy, Guideline 3.1.1(a). The guideline prohibits "buttons,
 * external links, or other calls to action that direct customers to purchasing
 * mechanisms other than in-app purchase" — and states the prohibition does not
 * apply to the United States storefront. That splits this surface in two:
 *
 * - **External purchase surfaces** (checkout, the account portal, the
 *   per-booth `portal` flows) open Stripe on the web. They are exported, but
 *   every UI entry point must sit behind `useExternalPurchases()`.
 * - **Native management** (cancel, resume) calls only our own API and presents
 *   no purchasing mechanism. Cancelling is the opposite of purchasing, and
 *   Apple's own reader-app provisions contemplate "account management
 *   functionality for existing customers". These ship on every storefront.
 *
 * POLICY CHANGE (2026-07-30): native cancel was removed in 0d2c19f ("update
 * payments API for Apple compliance") as a precaution, and left out when
 * purchases returned in b82229a. No App Review rejection prompted it — the
 * commit cites no rejection and none is recorded anywhere in the repo. It is
 * reinstated here, together with resume, because:
 *   1. the guideline text targets purchase CTAs, which these are not; and
 *   2. it was the only per-booth management the app could offer at all outside
 *      the US, where the Stripe-web portal is unavailable by policy.
 * If App Review ever objects, the fix is to gate these two hooks' UI behind
 * useExternalPurchases() — the API layer can stay as it is.
 */
import * as payments from "@/api/payments";

const paymentsExports = payments as unknown as Record<string, unknown>;

describe("api/payments — external-purchase surface contract", () => {
	describe("external purchase surfaces (US storefront, gated UI)", () => {
		it("exports useCreateBoothCheckout", () => {
			expect(typeof paymentsExports.useCreateBoothCheckout).toBe("function");
		});

		it("exports createBoothCheckout", () => {
			expect(typeof paymentsExports.createBoothCheckout).toBe("function");
		});

		it("exports useCustomerPortal", () => {
			expect(typeof paymentsExports.useCustomerPortal).toBe("function");
		});

		it("exports getCustomerPortal", () => {
			expect(typeof paymentsExports.getCustomerPortal).toBe("function");
		});

		it("exports the per-booth portal session hook", () => {
			expect(typeof paymentsExports.useBoothPortalSession).toBe("function");
		});

		it("exports the per-booth portal session service", () => {
			expect(typeof paymentsExports.createBoothPortalSession).toBe("function");
		});
	});

	describe("native management (all storefronts — no purchase surface)", () => {
		it("exports useCancelBoothSubscription", () => {
			expect(typeof paymentsExports.useCancelBoothSubscription).toBe(
				"function",
			);
		});

		it("exports cancelBoothSubscription", () => {
			expect(typeof paymentsExports.cancelBoothSubscription).toBe("function");
		});

		it("exports useResumeBoothSubscription", () => {
			expect(typeof paymentsExports.useResumeBoothSubscription).toBe(
				"function",
			);
		});

		it("exports resumeBoothSubscription", () => {
			expect(typeof paymentsExports.resumeBoothSubscription).toBe("function");
		});
	});

	describe("still absent (account-wide cancel has no per-booth meaning)", () => {
		// A user-level cancel would hit every booth at once, which is the
		// six-identical-rows problem this whole feature exists to remove.
		it("does not export useCancelSubscription", () => {
			expect(paymentsExports.useCancelSubscription).toBeUndefined();
		});

		it("does not export cancelSubscription", () => {
			expect(paymentsExports.cancelSubscription).toBeUndefined();
		});
	});

	describe("kept (read subscription state)", () => {
		it("still exports useSubscriptionAccess", () => {
			expect(typeof paymentsExports.useSubscriptionAccess).toBe("function");
		});

		it("still exports useSubscriptionDetails", () => {
			expect(typeof paymentsExports.useSubscriptionDetails).toBe("function");
		});

		it("no longer exports the 404-on-empty per-booth read", () => {
			// Removed, not deprecated: keeping it alongside the state endpoint
			// meant two reads of the same booth's billing under two cache keys,
			// which could disagree and of which only one was ever patched.
			expect(paymentsExports.useBoothSubscription).toBeUndefined();
			expect(paymentsExports.getBoothSubscription).toBeUndefined();
		});

		it("still exports useBoothSubscriptions", () => {
			expect(typeof paymentsExports.useBoothSubscriptions).toBe("function");
		});

		it("exports the always-200 state read that replaces the 404 endpoint", () => {
			expect(typeof paymentsExports.useBoothSubscriptionState).toBe("function");
			expect(typeof paymentsExports.getBoothSubscriptionState).toBe("function");
		});

		it("still exports getSubscriptionAccess service", () => {
			expect(typeof paymentsExports.getSubscriptionAccess).toBe("function");
		});

		it("still exports getSubscriptionDetails service", () => {
			expect(typeof paymentsExports.getSubscriptionDetails).toBe("function");
		});
	});
});
