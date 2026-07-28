/**
 * Payments API surface contract
 *
 * Dual-storefront policy (Guideline 3.1.1(a)): external checkout and
 * customer-portal services/hooks ARE exported — purchase initiation is
 * legal on the US storefront — but every UI entry point must sit behind
 * useExternalPurchases(). Native cancel endpoints stay removed: canceling
 * happens in the Stripe customer portal, not via an in-app API.
 */
import * as payments from "@/api/payments";

const paymentsExports = payments as unknown as Record<string, unknown>;

describe("api/payments — external-purchase surface contract", () => {
	describe("present (US-storefront external checkout + portal)", () => {
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
	});

	describe("still removed (no in-app cancel — the portal owns management)", () => {
		it("does not export useCancelSubscription", () => {
			expect(paymentsExports.useCancelSubscription).toBeUndefined();
		});

		it("does not export useCancelBoothSubscription", () => {
			expect(paymentsExports.useCancelBoothSubscription).toBeUndefined();
		});

		it("does not export cancelSubscription", () => {
			expect(paymentsExports.cancelSubscription).toBeUndefined();
		});

		it("does not export cancelBoothSubscription", () => {
			expect(paymentsExports.cancelBoothSubscription).toBeUndefined();
		});
	});

	describe("kept (read subscription state)", () => {
		it("still exports useSubscriptionAccess", () => {
			expect(typeof paymentsExports.useSubscriptionAccess).toBe("function");
		});

		it("still exports useSubscriptionDetails", () => {
			expect(typeof paymentsExports.useSubscriptionDetails).toBe("function");
		});

		it("still exports useBoothSubscription", () => {
			expect(typeof paymentsExports.useBoothSubscription).toBe("function");
		});

		it("still exports useBoothSubscriptions", () => {
			expect(typeof paymentsExports.useBoothSubscriptions).toBe("function");
		});

		it("still exports getSubscriptionAccess service", () => {
			expect(typeof paymentsExports.getSubscriptionAccess).toBe("function");
		});

		it("still exports getSubscriptionDetails service", () => {
			expect(typeof paymentsExports.getSubscriptionDetails).toBe("function");
		});
	});
});
