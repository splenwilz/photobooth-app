/**
 * Stranded Sessions Utilities Tests
 */
import type {
	BoothCriticalEvent,
	SyncedTransaction,
} from "@/api/booths/types";
import {
	formatCriticalEventTag,
	formatStrandedReason,
	joinCriticalEventsWithTransactions,
} from "../stranded-sessions";

const makeEvent = (
	overrides: Partial<BoothCriticalEvent>,
): BoothCriticalEvent => ({
	id: 1,
	tag: "STRANDED_PAID_SESSION",
	details: "",
	transaction_code: "TXN-A",
	occurred_at: "2026-04-21T14:30:22Z",
	received_at: "2026-04-21T14:30:51Z",
	transaction_total_price: null,
	refund: null,
	...overrides,
});

const makeTx = (overrides: Partial<SyncedTransaction>): SyncedTransaction => ({
	id: "cloud-1",
	local_id: 1,
	transaction_code: "TXN-A",
	product_type: "strips",
	template_name: null,
	quantity: 1,
	base_price: 5,
	total_price: 5,
	payment_method: "cash",
	payment_status: "completed",
	local_created_at: "2026-04-21T14:30:00Z",
	synced_at: "2026-04-21T14:30:30Z",
	stranded_at: "2026-04-21T14:30:01Z",
	stranded_reason: "payment_completion_handler_exception",
	refunded_at: null,
	refunded_by_user_id: null,
	refund_amount: null,
	refund_method: null,
	refund_note: null,
	...overrides,
});

describe("joinCriticalEventsWithTransactions", () => {
	it("pairs each event with its matching transaction by code", () => {
		const events = [
			makeEvent({ id: 1, transaction_code: "TXN-A" }),
			makeEvent({ id: 2, transaction_code: "TXN-B" }),
		];
		const transactions = [
			makeTx({ id: "tx-a", transaction_code: "TXN-A", total_price: 5 }),
			makeTx({ id: "tx-b", transaction_code: "TXN-B", total_price: 8 }),
		];

		const result = joinCriticalEventsWithTransactions(events, transactions);

		expect(result).toHaveLength(2);
		expect(result[0].event.id).toBe(1);
		expect(result[0].transaction?.id).toBe("tx-a");
		expect(result[1].event.id).toBe(2);
		expect(result[1].transaction?.id).toBe("tx-b");
	});

	it("returns null transaction when no match is found", () => {
		const events = [makeEvent({ id: 1, transaction_code: "TXN-MISSING" })];
		const transactions = [makeTx({ transaction_code: "TXN-OTHER" })];

		const result = joinCriticalEventsWithTransactions(events, transactions);

		expect(result[0].transaction).toBeNull();
	});

	it("returns null transaction when event has no transaction_code", () => {
		const events = [makeEvent({ id: 1, transaction_code: null })];
		const transactions = [makeTx({ transaction_code: "TXN-A" })];

		const result = joinCriticalEventsWithTransactions(events, transactions);

		expect(result[0].transaction).toBeNull();
	});

	it("deduplicates events by (tag, occurred_at, transaction_code)", () => {
		// Per API docs: at-least-once delivery can produce duplicates
		const events = [
			makeEvent({
				id: 1,
				tag: "STRANDED_PAID_SESSION",
				occurred_at: "2026-04-21T14:30:22Z",
				transaction_code: "TXN-DUP",
			}),
			makeEvent({
				id: 2,
				tag: "STRANDED_PAID_SESSION",
				occurred_at: "2026-04-21T14:30:22Z",
				transaction_code: "TXN-DUP",
			}),
		];

		const result = joinCriticalEventsWithTransactions(events, []);

		expect(result).toHaveLength(1);
		expect(result[0].event.id).toBe(1);
	});

	it("preserves input ordering (newest first from API)", () => {
		const events = [
			makeEvent({ id: 3, transaction_code: "TXN-3" }),
			makeEvent({ id: 1, transaction_code: "TXN-1" }),
			makeEvent({ id: 2, transaction_code: "TXN-2" }),
		];

		const result = joinCriticalEventsWithTransactions(events, []);

		expect(result.map((r) => r.event.id)).toEqual([3, 1, 2]);
	});

	it("keeps distinct null-code events with same tag + occurred_at", () => {
		// Per API spec, the uniqueness tuple is
		// (booth_id, tag, occurred_at, transaction_code). When code is null,
		// each event must remain distinct (we use event.id as a tiebreaker).
		const events = [
			makeEvent({
				id: 10,
				tag: "PAYMENT_RESULT_INVALID",
				occurred_at: "2026-04-21T14:30:22Z",
				transaction_code: null,
			}),
			makeEvent({
				id: 11,
				tag: "PAYMENT_RESULT_INVALID",
				occurred_at: "2026-04-21T14:30:22Z",
				transaction_code: null,
			}),
		];

		const result = joinCriticalEventsWithTransactions(events, []);

		expect(result).toHaveLength(2);
		expect(result.map((r) => r.event.id)).toEqual([10, 11]);
	});
});

describe("formatCriticalEventTag", () => {
	it("returns short badge labels for known tags", () => {
		expect(formatCriticalEventTag("STRANDED_PAID_SESSION")).toBe("Stranded");
		expect(formatCriticalEventTag("PAYMENT_RESULT_INVALID")).toBe("Bad Payment");
	});

	it("falls back to spaced lowercase for unknown tags", () => {
		expect(formatCriticalEventTag("NEW_FUTURE_TAG")).toBe("New future tag");
	});
});

describe("formatStrandedReason", () => {
	it("formats known reason tags as human-readable strings", () => {
		expect(formatStrandedReason("payment_completion_handler_exception")).toBe(
			"Payment completion failed",
		);
		expect(formatStrandedReason("thank_you_navigation_failure")).toBe(
			"Thank-you screen failed",
		);
		expect(formatStrandedReason("print_thank_you_navigation_failure")).toBe(
			"Post-print navigation failed",
		);
		expect(formatStrandedReason("extra_prints_completion_failure")).toBe(
			"Extra prints failed",
		);
	});

	it("falls back to title-cased tag for unknown reasons", () => {
		expect(formatStrandedReason("some_new_reason_tag")).toBe(
			"Some new reason tag",
		);
	});

	it("returns a default label when reason is null", () => {
		expect(formatStrandedReason(null)).toBe("Unknown reason");
	});
});
