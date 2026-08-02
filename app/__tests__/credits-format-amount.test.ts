/**
 * formatAmount tests
 *
 * The API returns usage amounts already negative (e.g. -27). The formatter
 * must render exactly one sign — "--27 credits" was showing in Credit
 * History.
 */
import { formatAmount } from "@/app/credits/history";

describe("formatAmount", () => {
	it("prefixes additions with a single plus", () => {
		expect(formatAmount(50, "Add")).toBe("+50");
	});

	it("renders already-negative deduction amounts with a single minus", () => {
		expect(formatAmount(-27, "Deduct")).toBe("-27");
	});

	it("renders positive deduction amounts with a single minus", () => {
		expect(formatAmount(27, "Deduct")).toBe("-27");
	});

	it("renders Reset amounts as-is", () => {
		expect(formatAmount(0, "Reset")).toBe("0");
	});

	it("keeps thousands separators", () => {
		// Grouping follows the environment's ICU locale — compute the expected
		// separator the same way the code does so CI locale can't break this.
		expect(formatAmount(-1250, "Deduct")).toBe(`-${(1250).toLocaleString()}`);
	});

	it("renders negative Reset amounts as-is (single sign)", () => {
		expect(formatAmount(-500, "Reset")).toBe((-500).toLocaleString());
	});
});
