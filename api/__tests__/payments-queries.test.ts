/**
 * Payments API surface contract
 *
 * Asserts that subscription PURCHASE hooks/services have been removed
 * (Apple compliance) while subscription READ + MANAGE-EXISTING surface
 * remains exported.
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

	describe("kept (read state + manage existing subscription)", () => {
		it("still paymentsExports useSubscriptionAccess", () => {
			expect(typeof paymentsExports.useSubscriptionAccess).toBe("function");
		});

		it("still paymentsExports useSubscriptionDetails", () => {
			expect(typeof paymentsExports.useSubscriptionDetails).toBe("function");
		});

		it("still paymentsExports useBoothSubscription", () => {
			expect(typeof paymentsExports.useBoothSubscription).toBe("function");
		});

		it("still paymentsExports useBoothSubscriptions", () => {
			expect(typeof paymentsExports.useBoothSubscriptions).toBe("function");
		});

		it("still paymentsExports useCancelSubscription", () => {
			expect(typeof paymentsExports.useCancelSubscription).toBe("function");
		});

		it("still paymentsExports useCancelBoothSubscription", () => {
			expect(typeof paymentsExports.useCancelBoothSubscription).toBe("function");
		});

		it("still paymentsExports useCustomerPortal (Stripe portal access)", () => {
			expect(typeof paymentsExports.useCustomerPortal).toBe("function");
		});

		it("still paymentsExports getSubscriptionAccess service", () => {
			expect(typeof paymentsExports.getSubscriptionAccess).toBe("function");
		});

		it("still paymentsExports getCustomerPortal service", () => {
			expect(typeof paymentsExports.getCustomerPortal).toBe("function");
		});
	});
});
