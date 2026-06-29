/**
 * Payments API surface contract
 *
 * Asserts that subscription PURCHASE hooks/services and subscription
 * MANAGEMENT hooks/services (billing portal + cancel) have been removed
 * (Apple compliance), while the subscription READ surface remains exported.
 */
import * as payments from "@/api/payments";

const paymentsExports = payments as unknown as Record<string, unknown>;

describe("api/payments — Apple-compliance contract", () => {
	describe("removed (purchase initiation)", () => {
		it("does not export useCreateCheckout", () => {
			expect(paymentsExports.useCreateCheckout).toBeUndefined();
		});

		it("does not export useCreateBoothCheckout", () => {
			expect(paymentsExports.useCreateBoothCheckout).toBeUndefined();
		});

		it("does not export createSubscriptionCheckout", () => {
			expect(paymentsExports.createSubscriptionCheckout).toBeUndefined();
		});

		it("does not export createBoothCheckout", () => {
			expect(paymentsExports.createBoothCheckout).toBeUndefined();
		});
	});

	describe("removed (subscription management)", () => {
		it("does not export useCustomerPortal", () => {
			expect(paymentsExports.useCustomerPortal).toBeUndefined();
		});

		it("does not export useCancelSubscription", () => {
			expect(paymentsExports.useCancelSubscription).toBeUndefined();
		});

		it("does not export useCancelBoothSubscription", () => {
			expect(paymentsExports.useCancelBoothSubscription).toBeUndefined();
		});

		it("does not export getCustomerPortal", () => {
			expect(paymentsExports.getCustomerPortal).toBeUndefined();
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
