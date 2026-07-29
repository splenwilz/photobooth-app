/**
 * Critical Event Details Modal Tests
 *
 * The modal serves two event categories:
 * - Transaction events (transaction_code set): full refund workflow.
 * - Operational events (transaction_code null): incident report only — no
 *   refund UI, which would otherwise render a permanently dead form.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

import type { BoothCriticalEvent } from "@/api/booths/types";
import type { CriticalEventRow } from "@/utils";
import { CriticalEventDetailsModal } from "../CriticalEventDetailsModal";

// The modal only pulls useRefundBoothTransaction from the barrel — mock it
// so submit-flow tests can assert the exact mutation payload.
jest.mock("@/api/booths", () => ({
	useRefundBoothTransaction: jest.fn(),
}));
const { useRefundBoothTransaction } = require("@/api/booths");

const mutateAsync = jest.fn();
beforeEach(() => {
	jest.clearAllMocks();
	mutateAsync.mockResolvedValue({});
	(useRefundBoothTransaction as jest.Mock).mockReturnValue({
		mutateAsync,
		isPending: false,
		reset: jest.fn(),
	});
});

const makeEvent = (
	overrides: Partial<BoothCriticalEvent>,
): BoothCriticalEvent => ({
	id: 1,
	tag: "STRANDED_PAID_SESSION",
	details: "Payment completion handler threw",
	transaction_code: "TXN-A",
	occurred_at: "2026-07-27T10:42:02Z",
	received_at: "2026-07-27T10:42:12Z",
	transaction_total_price: 6,
	refund: null,
	...overrides,
});

function renderModal(row: CriticalEventRow) {
	const qc = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: Infinity },
			mutations: { retry: false, gcTime: Infinity },
		},
	});
	return render(
		<QueryClientProvider client={qc}>
			<CriticalEventDetailsModal
				visible
				boothId="booth-1"
				row={row}
				onClose={jest.fn()}
			/>
		</QueryClientProvider>,
	);
}

describe("CriticalEventDetailsModal", () => {
	it("shows the refund workflow for transaction events", () => {
		renderModal({ event: makeEvent({}), transaction: null });

		// Header title, form card label, and footer button all say it.
		expect(screen.getAllByText("Record Refund").length).toBeGreaterThan(0);
		expect(screen.getByText("Customer Reference Code")).toBeTruthy();
	});

	it("shows an incident report without refund UI for operational events", () => {
		renderModal({
			event: makeEvent({
				tag: "PRINTER_RECOVERY_FAILED",
				transaction_code: null,
				transaction_total_price: null,
				details: "Recovery ladder exhausted after 3 attempts",
			}),
			transaction: null,
		});

		expect(screen.getByText("Incident Details")).toBeTruthy();
		expect(
			screen.getByText("Recovery ladder exhausted after 3 attempts"),
		).toBeTruthy();
		expect(screen.queryByText("Record Refund")).toBeNull();
		expect(screen.queryByText("Customer Reference Code")).toBeNull();
	});

	it("shows operator guidance for printer-recovery failures", () => {
		renderModal({
			event: makeEvent({
				tag: "PRINTER_RECOVERY_FAILED",
				transaction_code: null,
			}),
			transaction: null,
		});

		expect(
			screen.getByText("Booth can't fix its printer — needs an on-site visit."),
		).toBeTruthy();
	});

	it("submits a refund with the parsed amount and inferred method", async () => {
		const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
		renderModal({ event: makeEvent({}), transaction: null });

		// Amount prefills from transaction_total_price (6 → "6.00"); with no
		// transaction row the method infers to "other".
		fireEvent.press(screen.getByTestId("record-refund-button"));

		await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
		expect(mutateAsync).toHaveBeenCalledWith({
			boothId: "booth-1",
			transactionCode: "TXN-A",
			amount: 6,
			method: "other",
		});
		await waitFor(() => expect(alertSpy).toHaveBeenCalled());
		alertSpy.mockRestore();
	});

	it("blocks submission when the amount exceeds the refundable maximum", () => {
		renderModal({ event: makeEvent({}), transaction: null });

		fireEvent.changeText(screen.getByPlaceholderText("0.00"), "7.50");
		fireEvent.press(screen.getByTestId("record-refund-button"));

		expect(mutateAsync).not.toHaveBeenCalled();
	});

	it("renders the refund note on refunded events", () => {
		renderModal({
			event: makeEvent({
				refund: {
					refunded_at: "2026-07-27T12:00:00Z",
					refunded_by_user_id: "user_1",
					refund_amount: 6,
					refund_method: "cash",
					refund_note: "Customer came back with code",
				},
			}),
			transaction: null,
		});

		expect(screen.getByText("Customer came back with code")).toBeTruthy();
	});
});
