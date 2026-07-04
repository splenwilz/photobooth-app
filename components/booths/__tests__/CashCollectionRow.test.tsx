/**
 * CashCollectionRow Tests
 *
 * One row per operator "Collect" action in the cash-collections history.
 * Key contracts (see Cash Box API docs):
 * - bill1/bill2 null (pre-tracking rows) → acceptor line entirely absent,
 *   never "$0.00"
 * - collected_by_name null → "Collector unknown" (deleted admin / no login)
 * - collected_at null → "Time not recorded"
 * - synced_at must never appear anywhere (backfill makes it misleading)
 */
import { render, screen } from "@testing-library/react-native";
import React from "react";
import type { CashCollection } from "@/api/booths/types";
import { CashCollectionRow } from "../CashCollectionRow";

const NOW = new Date("2026-07-04T12:00:00Z");
const SYNCED_AT = "2026-06-28T09:12:31Z";

function makeCollection(
	overrides: Partial<CashCollection> = {},
): CashCollection {
	return {
		id: "3f6c1a9e-8d2b-4c11-9f7a-2e5b8c4d0a61",
		local_id: 12,
		total_amount: 42.0,
		bill1_amount: 30.0,
		bill2_amount: 12.0,
		collected_by_name: "Alice Operator",
		note: "weekly pickup",
		collected_at: "2026-07-01T09:12:00Z", // 3 days before NOW
		synced_at: SYNCED_AT,
		...overrides,
	};
}

function renderRow(collection: CashCollection) {
	return render(
		<CashCollectionRow
			collection={collection}
			cardBg="#ffffff"
			borderColor="#e0e0e0"
			textSecondary="#666666"
		/>,
	);
}

describe("CashCollectionRow", () => {
	beforeEach(() => {
		jest.useFakeTimers({ doNotFake: ["queueMicrotask"] });
		jest.setSystemTime(NOW);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("renders amount, collector, relative time, and note for a full row", () => {
		renderRow(makeCollection());

		expect(screen.getByText("$42.00")).toBeTruthy();
		expect(screen.getByText("by Alice Operator")).toBeTruthy();
		expect(screen.getByText("3d ago")).toBeTruthy();
		expect(screen.getByText("weekly pickup")).toBeTruthy();
	});

	it("renders the acceptor split when both amounts are present", () => {
		renderRow(makeCollection());

		expect(
			screen.getByText("Acceptor 1 $30.00 · Acceptor 2 $12.00"),
		).toBeTruthy();
	});

	it("omits the acceptor line entirely on pre-tracking rows (both null)", () => {
		renderRow(makeCollection({ bill1_amount: null, bill2_amount: null }));

		expect(screen.queryByText(/Acceptor/)).toBeNull();
		expect(screen.queryByText(/\$0\.00/)).toBeNull();
	});

	it("renders only acceptor 1 when acceptor 2 is null", () => {
		renderRow(makeCollection({ bill2_amount: null }));

		expect(screen.getByText("Acceptor 1 $30.00")).toBeTruthy();
		expect(screen.queryByText(/Acceptor 2/)).toBeNull();
	});

	it("renders only acceptor 2 when acceptor 1 is null", () => {
		renderRow(makeCollection({ bill1_amount: null }));

		expect(screen.getByText("Acceptor 2 $12.00")).toBeTruthy();
		expect(screen.queryByText(/Acceptor 1/)).toBeNull();
	});

	it("omits the note when null", () => {
		renderRow(makeCollection({ note: null }));

		expect(screen.queryByText("weekly pickup")).toBeNull();
	});

	it("falls back to 'Collector unknown' when collected_by_name is null", () => {
		renderRow(makeCollection({ collected_by_name: null }));

		expect(screen.getByText("Collector unknown")).toBeTruthy();
		expect(screen.queryByText(/^by /)).toBeNull();
	});

	it("shows 'Time not recorded' when collected_at is null and never shows synced_at", () => {
		renderRow(makeCollection({ collected_at: null }));

		expect(screen.getByText("Time not recorded")).toBeTruthy();
		// synced_at (2026-06-28) would format as "6d ago" / "Jun 28" — neither
		// may appear: sync time is not collection time.
		expect(screen.queryByText(/6d ago/)).toBeNull();
		expect(screen.queryByText(/Jun 28/)).toBeNull();
	});

	it("exposes a composed accessibility label", () => {
		renderRow(makeCollection());

		expect(
			screen.getByLabelText(
				"Collected $42.00 by Alice Operator, 3d ago",
			),
		).toBeTruthy();
	});

	it("composes a null-safe accessibility label for sparse rows", () => {
		renderRow(
			makeCollection({
				bill1_amount: null,
				bill2_amount: null,
				collected_by_name: null,
				note: null,
				collected_at: null,
			}),
		);

		expect(
			screen.getByLabelText(
				"Collected $42.00 by unknown collector, time not recorded",
			),
		).toBeTruthy();
	});
});
