/**
 * Checkout return links must never land on the "Unmatched Route" screen —
 * they are rewritten to the tab the deep-link handler navigates to anyway.
 */
import { redirectSystemPath } from "../+native-intent";

describe("+native-intent — external checkout return links", () => {
	it("routes subscription checkout returns to the Booths tab", () => {
		expect(
			redirectSystemPath({
				path: "boothiq://payment-success?session_id=cs_1&booth_id=b1",
				initial: true,
			}),
		).toBe("/(tabs)/booths");
		expect(
			redirectSystemPath({ path: "boothiq://payment-cancel", initial: false }),
		).toBe("/(tabs)/booths");
	});

	it("routes template checkout returns to the Store tab", () => {
		expect(
			redirectSystemPath({
				path: "boothiq://template-purchase-success?session_id=cs_1",
				initial: true,
			}),
		).toBe("/(tabs)/store");
		expect(
			redirectSystemPath({
				path: "boothiq://template-purchase-cancel",
				initial: false,
			}),
		).toBe("/(tabs)/store");
	});

	it("leaves every other URL untouched", () => {
		expect(
			redirectSystemPath({ path: "boothiq://settings", initial: false }),
		).toBe("boothiq://settings");
		expect(redirectSystemPath({ path: "/booths", initial: true })).toBe(
			"/booths",
		);
	});
});
