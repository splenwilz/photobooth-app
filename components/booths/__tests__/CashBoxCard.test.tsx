/**
 * CashBoxCard Tests
 *
 * The card shows the PHYSICAL cash sitting in the booth's bill acceptors —
 * not revenue. Key contracts under test (see Cash Box API docs):
 * - null/undefined cash_box renders "not available", never $0
 * - a real expected_total of 0 renders $0.00 (empty box is meaningful)
 * - the inserted-vs-expected gap renders as refunds info, never as an error
 * - nullable fragments (updated_at, last_collection fields) are omitted,
 *   never rendered as "null" or $0
 */
import { render, screen } from "@testing-library/react-native";
import React from "react";
import type { CashBox } from "@/api/booths/types";
import { CashBoxCard } from "../CashBoxCard";

const NOW = new Date("2026-07-04T12:00:00Z");

function makeCashBox(overrides: Partial<CashBox> = {}): CashBox {
	return {
		expected_total: 35.0,
		bill1_inserted: 20.0,
		bill2_inserted: 15.0,
		updated_at: "2026-07-04T11:59:30Z", // 30s before NOW — fresh
		last_collection: {
			total_amount: 42.0,
			collected_at: "2026-06-28T09:12:00Z",
			collected_by_name: "Alice Operator",
		},
		...overrides,
	};
}

describe("CashBoxCard", () => {
	beforeEach(() => {
		jest.useFakeTimers({ doNotFake: ["queueMicrotask"] });
		jest.setSystemTime(NOW);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("renders the expected total and both acceptor amounts", () => {
		render(<CashBoxCard cashBox={makeCashBox()} />);

		expect(screen.getByText("$35.00")).toBeTruthy();
		expect(screen.getByText("Acceptor 1")).toBeTruthy();
		expect(screen.getByText("Acceptor 2")).toBeTruthy();
		expect(screen.getByText("$20.00")).toBeTruthy();
		expect(screen.getByText("$15.00")).toBeTruthy();
	});

	it("keeps the physical-cash framing distinct from revenue", () => {
		render(<CashBoxCard cashBox={makeCashBox()} />);

		expect(screen.getByText(/not revenue/i)).toBeTruthy();
	});

	it("renders 'not available' for a null cash box and never $0", () => {
		render(<CashBoxCard cashBox={null} />);

		expect(screen.getByText(/not available/i)).toBeTruthy();
		expect(screen.queryByText(/\$0\.00/)).toBeNull();
		expect(screen.queryByText(/\$\d/)).toBeNull();
	});

	it("renders the same unavailable state for undefined (older backend)", () => {
		render(<CashBoxCard cashBox={undefined} />);

		expect(screen.getByText(/not available/i)).toBeTruthy();
		expect(screen.queryByText(/\$\d/)).toBeNull();
	});

	it("renders $0.00 for a genuinely empty box (not the unavailable state)", () => {
		render(
			<CashBoxCard
				cashBox={makeCashBox({
					expected_total: 0,
					bill1_inserted: 0,
					bill2_inserted: 0,
				})}
			/>,
		);

		expect(screen.getAllByText("$0.00").length).toBeGreaterThan(0);
		expect(screen.queryByText(/not available/i)).toBeNull();
	});

	it("shows the refund gap informatively when inserted exceeds expected", () => {
		render(
			<CashBoxCard
				cashBox={makeCashBox({
					expected_total: 145.0,
					bill1_inserted: 100.0,
					bill2_inserted: 50.0,
				})}
			/>,
		);

		expect(screen.getByText(/\$5\.00 paid out as refunds/)).toBeTruthy();
		expect(screen.queryByText(/discrepancy|missing|error/i)).toBeNull();
	});

	it("omits the refund line when there is no gap", () => {
		render(<CashBoxCard cashBox={makeCashBox()} />);

		expect(screen.queryByText(/paid out as refunds/)).toBeNull();
	});

	it("omits the refund line on a backend invariant violation (inserted < expected)", () => {
		render(
			<CashBoxCard
				cashBox={makeCashBox({
					expected_total: 50.0,
					bill1_inserted: 10.0,
					bill2_inserted: 10.0,
				})}
			/>,
		);

		expect(screen.queryByText(/paid out as refunds/)).toBeNull();
		expect(screen.queryByText(/discrepancy|missing|error/i)).toBeNull();
	});

	it("shows an 'as of' line for a fresh snapshot without the offline warning", () => {
		render(<CashBoxCard cashBox={makeCashBox()} />);

		expect(screen.getByText(/as of/i)).toBeTruthy();
		expect(screen.queryByText(/booth may be offline/i)).toBeNull();
	});

	it("flags a stale snapshot as possibly offline", () => {
		render(
			<CashBoxCard
				cashBox={makeCashBox({ updated_at: "2026-07-04T11:50:00Z" })}
			/>,
		);

		expect(screen.getByText(/booth may be offline/i)).toBeTruthy();
	});

	it("never renders 'Invalid Date' for a malformed updated_at", () => {
		render(
			<CashBoxCard cashBox={makeCashBox({ updated_at: "not-a-date" })} />,
		);

		expect(screen.queryByText(/invalid date/i)).toBeNull();
		expect(screen.queryByText(/as of/i)).toBeNull();
		expect(screen.getByText(/awaiting first report/i)).toBeTruthy();
	});

	it("shows an awaiting-first-report line when updated_at is null", () => {
		render(<CashBoxCard cashBox={makeCashBox({ updated_at: null })} />);

		expect(screen.getByText(/awaiting first report/i)).toBeTruthy();
		expect(screen.queryByText(/as of/i)).toBeNull();
	});

	it("shows 'No collections yet' when last_collection is null", () => {
		render(<CashBoxCard cashBox={makeCashBox({ last_collection: null })} />);

		expect(screen.getByText(/no collections yet/i)).toBeTruthy();
	});

	it("renders the full last-collection line when all fields are present", () => {
		render(<CashBoxCard cashBox={makeCashBox()} />);

		expect(
			screen.getByText(/Last collected \$42\.00 .* by Alice Operator/),
		).toBeTruthy();
	});

	it("omits the collector fragment when collected_by_name is null", () => {
		render(
			<CashBoxCard
				cashBox={makeCashBox({
					last_collection: {
						total_amount: 42.0,
						collected_at: "2026-06-28T09:12:00Z",
						collected_by_name: null,
					},
				})}
			/>,
		);

		expect(screen.getByText(/Last collected \$42\.00/)).toBeTruthy();
		expect(screen.queryByText(/ by /)).toBeNull();
	});

	it("omits the time fragment when collected_at is null", () => {
		render(
			<CashBoxCard
				cashBox={makeCashBox({
					last_collection: {
						total_amount: 42.0,
						collected_at: null,
						collected_by_name: "Alice Operator",
					},
				})}
			/>,
		);

		expect(
			screen.getByText(/Last collected \$42\.00 by Alice Operator/),
		).toBeTruthy();
	});

	it("exposes a composed accessibility label", () => {
		render(
			<CashBoxCard
				cashBox={makeCashBox({
					expected_total: 145.0,
					bill1_inserted: 100.0,
					bill2_inserted: 50.0,
				})}
			/>,
		);

		const label = screen.getByLabelText(/Cash box: \$145\.00 in machine/);
		expect(label).toBeTruthy();
	});

	it("exposes an accessibility label for the unavailable state", () => {
		render(<CashBoxCard cashBox={null} />);

		expect(
			screen.getByLabelText(/cash tracking not available/i),
		).toBeTruthy();
	});
});
