/**
 * Cart removal contract
 *
 * The cart screen and cart store have been deleted. There is no
 * in-app purchase surface for templates; users browse and use
 * already-owned templates only.
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
