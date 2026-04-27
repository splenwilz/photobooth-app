/**
 * Payments API surface contract
 *
 * Asserts that subscription PURCHASE hooks/services have been removed
 * (Apple compliance) while subscription READ + MANAGE-EXISTING surface
 * remains exported.
 */
import * as payments from "@/api/payments";

const exports = payments as unknown as Record<string, unknown>;

describe("api/payments — Apple-compliance contract", () => {
	describe("removed (purchase initiation)", () => {
		it("does not export useCreateCheckout", () => {
			expect(exports.useCreateCheckout).toBeUndefined();
		});

		it("does not export useCreateBoothCheckout", () => {
			expect(exports.useCreateBoothCheckout).toBeUndefined();
		});

		it("does not export createSubscriptionCheckout", () => {
			expect(exports.createSubscriptionCheckout).toBeUndefined();
		});

		it("does not export createBoothCheckout", () => {
			expect(exports.createBoothCheckout).toBeUndefined();
		});
	});

	describe("kept (read state + manage existing subscription)", () => {
		it("still exports useSubscriptionAccess", () => {
			expect(typeof exports.useSubscriptionAccess).toBe("function");
		});

		it("still exports useSubscriptionDetails", () => {
			expect(typeof exports.useSubscriptionDetails).toBe("function");
		});

		it("still exports useBoothSubscription", () => {
			expect(typeof exports.useBoothSubscription).toBe("function");
		});

		it("still exports useBoothSubscriptions", () => {
			expect(typeof exports.useBoothSubscriptions).toBe("function");
		});

		it("still exports useCancelSubscription", () => {
			expect(typeof exports.useCancelSubscription).toBe("function");
		});

		it("still exports useCancelBoothSubscription", () => {
			expect(typeof exports.useCancelBoothSubscription).toBe("function");
		});

		it("still exports useCustomerPortal (Stripe portal access)", () => {
			expect(typeof exports.useCustomerPortal).toBe("function");
		});

		it("still exports getSubscriptionAccess service", () => {
			expect(typeof exports.getSubscriptionAccess).toBe("function");
		});

		it("still exports getCustomerPortal service", () => {
			expect(typeof exports.getCustomerPortal).toBe("function");
		});
	});
});
