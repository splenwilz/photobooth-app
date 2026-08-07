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

	it("cold start: mounts the right screen for the website's /redirect universal links", () => {
		// Web URLs have a real host — the leading PATH segment is what matches,
		// and the token-bearing transfers target mounts the bare list route.
		expect(
			redirectSystemPath({
				path: "https://www.boothiq.com/redirect?target=transfers&transfer_id=6f0c6f2e-1234-4abc-9def-0123456789ab&token=secret",
				initial: true,
			}),
		).toBe("/transfers");
		expect(
			redirectSystemPath({
				path: "https://www.boothiq.com/redirect?target=booths",
				initial: true,
			}),
		).toBe("/(tabs)/booths");
		expect(
			redirectSystemPath({
				path: "https://www.boothiq.com/redirect?target=alerts",
				initial: true,
			}),
		).toBe("/(tabs)/alerts");
		// Unknown target still mounts a sensible screen, and prototype-member
		// names can't walk the chain past the fallback
		expect(
			redirectSystemPath({
				path: "https://www.boothiq.com/redirect?target=constructor",
				initial: true,
			}),
		).toBe("/(tabs)/booths");
	});

	it("cold start: mounts the bare transfers list for token-bearing transfer links", () => {
		// The accept token must not enter navigation state as a search param;
		// use-deep-links receives the original URL and routes the review screen.
		expect(
			redirectSystemPath({
				path: "boothiq://transfers?transfer_id=6f0c6f2e-1234-4abc-9def-0123456789ab&token=secret",
				initial: true,
			}),
		).toBe("/transfers");
	});

	it("warm links: suppresses the router's own navigation for transfers/redirect", () => {
		// expo-router ALSO navigates on this function's return value for warm
		// URL events — returning "" leaves use-deep-links as the single
		// navigator, so the bare list can't land on top of the review screen.
		expect(
			redirectSystemPath({ path: "boothiq://transfers", initial: false }),
		).toBe("");
		expect(
			redirectSystemPath({
				path: "https://www.boothiq.com/redirect?target=transfers&transfer_id=6f0c6f2e-1234-4abc-9def-0123456789ab&token=secret",
				initial: false,
			}),
		).toBe("");
		expect(
			redirectSystemPath({
				path: "https://www.boothiq.com/redirect?target=alerts",
				initial: false,
			}),
		).toBe("");
	});

	it("leaves every other URL untouched", () => {
		expect(
			redirectSystemPath({ path: "boothiq://settings", initial: false }),
		).toBe("boothiq://settings");
		expect(redirectSystemPath({ path: "/booths", initial: true })).toBe(
			"/booths",
		);
	});

	it("passes prototype-member segment names through untouched", () => {
		// A plain object index would resolve these via the prototype chain and
		// hand Expo Router a function/object instead of a route string.
		for (const hostile of ["constructor", "__proto__", "toString"]) {
			expect(
				redirectSystemPath({ path: `boothiq://${hostile}`, initial: false }),
			).toBe(`boothiq://${hostile}`);
		}
	});

	it("matches only the leading path segment, not substrings elsewhere", () => {
		// A checkout-return name in a query param is NOT a checkout return.
		expect(
			redirectSystemPath({
				path: "/store?ref=payment-success",
				initial: false,
			}),
		).toBe("/store?ref=payment-success");
		// Nor is one buried in a deeper segment.
		expect(
			redirectSystemPath({
				path: "boothiq://checkout/payment-success",
				initial: false,
			}),
		).toBe("boothiq://checkout/payment-success");
	});
});
