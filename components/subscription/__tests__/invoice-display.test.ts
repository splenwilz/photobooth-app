/**
 * Invoice presentation rules.
 *
 * Three of these encode warnings from the backend contract that are easy to get
 * wrong and expensive when wrong — see BOOTH_BILLING_INTEGRATION.md.
 */
import {
	describeInvoice,
	formatInvoiceAmount,
} from "../invoice-display";

describe("formatInvoiceAmount", () => {
	it("divides by 100 for normal currencies", () => {
		expect(formatInvoiceAmount(2900, "usd")).toBe("$29.00");
	});

	it("does NOT divide for zero-decimal currencies", () => {
		// ¥2900 is 2900 yen, not 29. Dividing would under-report by 100x.
		expect(formatInvoiceAmount(2900, "jpy")).toMatch(/2,900/);
		expect(formatInvoiceAmount(2900, "jpy")).not.toMatch(/29\.00/);
		expect(formatInvoiceAmount(5000, "krw")).toMatch(/5,000/);
	});

	it("accepts uppercase or lowercase currency codes", () => {
		expect(formatInvoiceAmount(2900, "USD")).toBe("$29.00");
	});

	it("falls back to a readable string for an unknown code", () => {
		const out = formatInvoiceAmount(2900, "zzz");
		expect(out).toContain("29");
		expect(out.toUpperCase()).toContain("ZZZ");
	});

	it("renders zero without crashing", () => {
		expect(formatInvoiceAmount(0, "usd")).toBe("$0.00");
	});
});

describe("describeInvoice", () => {
	// describeInvoice only needs the three fields it branches on.
	const base = { attempt_count: 1 };

	it("treats `paid` as the authority, not `status`", () => {
		// A collected invoice can sit in an unusual Stripe status. Branching on
		// status would tell a user who HAS paid that they owe money.
		const odd = describeInvoice({
			...base,
			paid: true,
			status: "uncollectible",
		});
		expect(odd.label).toBe("Paid");
		expect(odd.tone).toBe("success");
	});

	it("never shows the raw Stripe status to the user", () => {
		// "uncollectible" tells a user nothing about whether they owe money.
		const out = describeInvoice({ ...base, paid: false, status: "uncollectible" });
		expect(out.label.toLowerCase()).not.toContain("uncollectible");
		expect(out.label).toMatch(/couldn't collect|unpaid/i);
	});

	it("distinguishes a first attempt from a retried failure", () => {
		const first = describeInvoice({ ...base, paid: false, status: "open" });
		const retried = describeInvoice({
			...base,
			paid: false,
			status: "open",
			attempt_count: 3,
		});
		expect(first.label).not.toBe(retried.label);
		expect(retried.label).toMatch(/retr/i);
	});

	it("translates the remaining unpaid statuses", () => {
		expect(
			describeInvoice({ ...base, paid: false, status: "void" }).label,
		).toMatch(/cancelled/i);
		expect(
			describeInvoice({ ...base, paid: false, status: "draft" }).label,
		).toMatch(/not yet issued/i);
	});

	it("falls back safely for a status the app has never seen", () => {
		const out = describeInvoice({
			...base,
			paid: false,
			status: "some_future_status" as never,
		});
		expect(out.label).toBe("Unpaid");
		expect(out.label).not.toContain("some_future_status");
	});
});
