/**
 * Cart removal contract
 *
 * The cart screen and cart store stay deleted BY DESIGN: template purchases
 * are single-item, direct from the template detail screen
 * (TemplateBuySection, US storefront only). Reintroducing a cart would
 * complicate the per-booth checkout flow for no benefit.
 */
import { existsSync } from "fs";
import { join } from "path";

const REPO = join(__dirname, "..", "..");

describe("Cart surface — Apple-compliance contract", () => {
	it("app/store/cart.tsx no longer exists", () => {
		expect(existsSync(join(REPO, "app", "store", "cart.tsx"))).toBe(false);
	});

	it("stores/cart-store.ts no longer exists", () => {
		expect(existsSync(join(REPO, "stores", "cart-store.ts"))).toBe(false);
	});
});
