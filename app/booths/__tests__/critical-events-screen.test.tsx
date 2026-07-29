/**
 * Critical Events Screen Tests
 *
 * The screen lists BOTH event categories for one booth:
 * - transaction events with the refund workflow
 * - operational incidents (details text, no refund UI)
 * and records the operator's "seen" marker for the badge logic.
 */
import { render, screen, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import React from "react";

import type { BoothCriticalEvent } from "@/api/booths/types";
import { useAttentionStore } from "@/stores/attention-store";
import CriticalEventsScreen from "../[boothId]/critical-events";

jest.mock("@/api/booths/queries", () => ({
	useBoothCriticalEventsInfinite: jest.fn(),
	useBoothTransactions: jest.fn(),
	useRefundBoothTransaction: jest.fn(() => ({
		mutateAsync: jest.fn(),
		isPending: false,
		reset: jest.fn(),
	})),
}));

const {
	useBoothCriticalEventsInfinite,
	useBoothTransactions,
} = require("@/api/booths/queries");

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

function mockFeed(
	events: BoothCriticalEvent[],
	overrides: Record<string, unknown> = {},
) {
	(useBoothCriticalEventsInfinite as jest.Mock).mockReturnValue({
		data: {
			pages: [
				{
					booth_id: "booth-1",
					booth_name: "Downtown",
					events,
					count: events.length,
					limit: 50,
					offset: 0,
				},
			],
			pageParams: [0],
		},
		isLoading: false,
		isRefetching: false,
		error: null,
		refetch: jest.fn(),
		hasNextPage: false,
		isFetchingNextPage: false,
		fetchNextPage: jest.fn(),
		...overrides,
	});
	(useBoothTransactions as jest.Mock).mockReturnValue({
		data: undefined,
		isLoading: false,
		isRefetching: false,
		error: null,
		refetch: jest.fn(),
	});
}

const initialStoreState = useAttentionStore.getState();

beforeEach(() => {
	jest.clearAllMocks();
	useAttentionStore.setState(initialStoreState, true);
	(useLocalSearchParams as jest.Mock).mockReturnValue({ boothId: "booth-1" });
});

describe("CriticalEventsScreen", () => {
	it("renders a refund row for transaction events", () => {
		mockFeed([makeEvent({ id: 1 })]);
		render(<CriticalEventsScreen />);

		expect(screen.getByText("TXN-A")).toBeTruthy();
		expect(screen.getByText(/Refund \$6\.00/)).toBeTruthy();
	});

	it("renders an incident row for operational events without refund UI", () => {
		mockFeed([
			makeEvent({
				id: 2,
				tag: "PRINTER_RECOVERY_FAILED",
				transaction_code: null,
				transaction_total_price: null,
				details: "Recovery ladder exhausted",
			}),
		]);
		render(<CriticalEventsScreen />);

		expect(screen.getByText("Printer Down")).toBeTruthy();
		expect(screen.getByText("Recovery ladder exhausted")).toBeTruthy();
		expect(screen.queryByText(/Refund/)).toBeNull();
		expect(screen.queryByText("Amount pending sync")).toBeNull();
	});

	it("marks the booth's events seen up to the newest event id", async () => {
		mockFeed([
			makeEvent({ id: 9, transaction_code: null, tag: "PRINT_JOB_STUCK" }),
			makeEvent({ id: 4, transaction_code: null, tag: "PRINT_JOB_STUCK" }),
		]);
		render(<CriticalEventsScreen />);

		await waitFor(() =>
			expect(
				useAttentionStore.getState().lastSeenEventIdByBooth["booth-1"],
			).toBe(9),
		);
	});

	it("does not mark events seen when an error hides the list", async () => {
		// A failed refetch keeps cached data but renders ErrorState — the
		// operator never saw the list, so the marker must not advance.
		mockFeed(
			[makeEvent({ id: 9, transaction_code: null, tag: "PRINT_JOB_STUCK" })],
			{ error: new Error("network down") },
		);
		render(<CriticalEventsScreen />);

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(
			useAttentionStore.getState().lastSeenEventIdByBooth["booth-1"],
		).toBeUndefined();
	});

	it("fetches the next page when the end of the list is reached", () => {
		const fetchNextPage = jest.fn();
		mockFeed([makeEvent({ id: 1 })], { hasNextPage: true, fetchNextPage });
		render(<CriticalEventsScreen />);

		screen.getByTestId("critical-events-list").props.onEndReached();

		expect(fetchNextPage).toHaveBeenCalledTimes(1);
	});

	it("does not fetch past the last page", () => {
		const fetchNextPage = jest.fn();
		mockFeed([makeEvent({ id: 1 })], { hasNextPage: false, fetchNextPage });
		render(<CriticalEventsScreen />);

		screen.getByTestId("critical-events-list").props.onEndReached();

		expect(fetchNextPage).not.toHaveBeenCalled();
	});

	it("summarizes both categories in the header subtitle", () => {
		mockFeed([
			makeEvent({ id: 1 }),
			makeEvent({
				id: 2,
				tag: "PRINT_JOB_STUCK",
				transaction_code: null,
				transaction_total_price: null,
			}),
		]);
		render(<CriticalEventsScreen />);

		expect(screen.getByText(/1 needs review · 1 incident/)).toBeTruthy();
	});
});
