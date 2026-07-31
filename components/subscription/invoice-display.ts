/**
 * Presentation rules for owner-facing invoices.
 *
 * Kept out of the screen so the two contract rules that are easy to get wrong
 * are stated once and tested directly:
 *
 * - `paid` is the authority for "was this collected", not `status`.
 * - amounts are minor units, and dividing by 100 is WRONG for zero-decimal
 *   currencies.
 *
 * @see api/docs/BOOTH_BILLING_INTEGRATION.md
 */

import type { OwnerInvoice } from "@/api/payments";

/**
 * Currencies Stripe treats as having no minor unit, so `amount_cents` is
 * already the whole amount.
 *
 * @see https://docs.stripe.com/currencies#zero-decimal
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
	"bif",
	"clp",
	"djf",
	"gnf",
	"jpy",
	"kmf",
	"krw",
	"mga",
	"pyg",
	"rwf",
	"ugx",
	"vnd",
	"vuv",
	"xaf",
	"xof",
	"xpf",
]);

/**
 * Format a minor-unit amount for display.
 *
 * Dividing unconditionally by 100 would under-report a ¥2,900 invoice as ¥29 —
 * a hundredfold error on the screen a user opens to check what they were
 * charged.
 */
export function formatInvoiceAmount(
	amountCents: number,
	currency: string,
): string {
	const code = currency.toUpperCase();
	const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase());
	const value = isZeroDecimal ? amountCents : amountCents / 100;

	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: code,
		}).format(value);
	} catch {
		// Unknown or unsupported code — better a readable fallback than a crash
		// on a screen whose whole job is showing money.
		return `${code} ${value.toFixed(isZeroDecimal ? 0 : 2)}`;
	}
}

/** Semantic, not a colour: the screen owns the palette. */
export type InvoiceTone = "success" | "warning" | "error" | "neutral" | "info";

export interface InvoiceDescription {
	label: string;
	tone: InvoiceTone;
}

/**
 * Describe an invoice in words a booth owner can act on.
 *
 * Branches on `paid` first, deliberately: a collected invoice can sit in an
 * unusual Stripe status, and reading `status` there would tell someone who has
 * already paid that they still owe money. `status` is used only to explain WHY
 * something is unpaid, and is always translated — "uncollectible" tells a user
 * nothing about whether money is owed.
 */
export function describeInvoice(
	invoice: Pick<OwnerInvoice, "paid" | "status" | "attempt_count">,
): InvoiceDescription {
	if (invoice.paid) {
		return { label: "Paid", tone: "success" };
	}

	switch (invoice.status) {
		case "open":
			return invoice.attempt_count > 1
				? {
						label: `Payment failed — retried ${invoice.attempt_count} times`,
						tone: "error",
					}
				: { label: "Payment due", tone: "warning" };
		case "uncollectible":
			return { label: "Unpaid — we couldn't collect this", tone: "error" };
		case "void":
			return { label: "Cancelled", tone: "neutral" };
		case "draft":
			return { label: "Not yet issued", tone: "info" };
		default:
			// Never echo an unrecognised status: it is Stripe vocabulary, not
			// anything a user can act on.
			return { label: "Unpaid", tone: "neutral" };
	}
}
