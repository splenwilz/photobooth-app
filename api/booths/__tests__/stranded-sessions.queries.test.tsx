/**
 * Stranded Paid Sessions Queries Tests
 *
 * Tests for useBoothTransactions, useBoothCriticalEvents, and
 * useRefundBoothTransaction React Query hooks.
 */
import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	useBoothCriticalEvents,
	useBoothTransactions,
	useRefundBoothTransaction,
} from "../queries";
import {
	getBoothCriticalEvents,
	getBoothTransactions,
	refundBoothTransaction,
} from "../services";

jest.mock("../services", () => ({
	getBoothTransactions: jest.fn(),
	getBoothCriticalEvents: jest.fn(),
	refundBoothTransaction: jest.fn(),
}));

const mockGetBoothTransactions = getBoothTransactions as jest.MockedFunction<
	typeof getBoothTransactions
>;
const mockGetBoothCriticalEvents = getBoothCriticalEvents as jest.MockedFunction<
	typeof getBoothCriticalEvents
>;
const mockRefundBoothTransaction =
	refundBoothTransaction as jest.MockedFunction<typeof refundBoothTransaction>;

function createWrapper() {
	const qc = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
}

describe("useBoothTransactions", () => {
	beforeEach(() => jest.clearAllMocks());

	it("fetches transactions for the given booth", async () => {
		const mockResponse = {
			booth_id: "booth-123",
			booth_name: "Downtown",
			transactions: [],
			count: 0,
			limit: 50,
			offset: 0,
		};
		mockGetBoothTransactions.mockResolvedValue(mockResponse);

		const { result } = renderHook(() => useBoothTransactions("booth-123"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockGetBoothTransactions).toHaveBeenCalledWith(
			"booth-123",
			undefined,
		);
		expect(result.current.data).toEqual(mockResponse);
	});

	it("passes pagination options through to the service", async () => {
		mockGetBoothTransactions.mockResolvedValue({
			booth_id: "booth-123",
			booth_name: "Downtown",
			transactions: [],
			count: 0,
			limit: 200,
			offset: 100,
		});

		renderHook(
			() => useBoothTransactions("booth-123", { limit: 200, offset: 100 }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() =>
			expect(mockGetBoothTransactions).toHaveBeenCalledWith("booth-123", {
				limit: 200,
				offset: 100,
			}),
		);
	});

	it("is disabled when boothId is null", () => {
		const { result } = renderHook(() => useBoothTransactions(null), {
			wrapper: createWrapper(),
		});

		expect(result.current.fetchStatus).toBe("idle");
		expect(mockGetBoothTransactions).not.toHaveBeenCalled();
	});
});

describe("useBoothCriticalEvents", () => {
	beforeEach(() => jest.clearAllMocks());

	it("fetches critical events for the given booth", async () => {
		const mockResponse = {
			booth_id: "booth-123",
			booth_name: "Downtown",
			events: [],
			count: 0,
			limit: 50,
			offset: 0,
		};
		mockGetBoothCriticalEvents.mockResolvedValue(mockResponse);

		const { result } = renderHook(
			() => useBoothCriticalEvents("booth-123"),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockGetBoothCriticalEvents).toHaveBeenCalledWith(
			"booth-123",
			undefined,
		);
		expect(result.current.data).toEqual(mockResponse);
	});

	it("passes pagination options through to the service", async () => {
		mockGetBoothCriticalEvents.mockResolvedValue({
			booth_id: "booth-123",
			booth_name: "Downtown",
			events: [],
			count: 0,
			limit: 25,
			offset: 0,
		});

		renderHook(
			() => useBoothCriticalEvents("booth-123", { limit: 25, offset: 0 }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() =>
			expect(mockGetBoothCriticalEvents).toHaveBeenCalledWith("booth-123", {
				limit: 25,
				offset: 0,
			}),
		);
	});

	it("is disabled when boothId is null", () => {
		const { result } = renderHook(() => useBoothCriticalEvents(null), {
			wrapper: createWrapper(),
		});

		expect(result.current.fetchStatus).toBe("idle");
		expect(mockGetBoothCriticalEvents).not.toHaveBeenCalled();
	});
});

describe("useRefundBoothTransaction", () => {
	beforeEach(() => jest.clearAllMocks());

	const mockResponse = {
		transaction_code: "TXN-ABC",
		refunded_at: "2026-04-21T15:04:12Z",
		refunded_by_user_id: "user_01KK",
		refund_amount: 5.0,
		refund_method: "cash_till",
		refund_note: null,
	};

	it("calls refundBoothTransaction with boothId, code, and body", async () => {
		mockRefundBoothTransaction.mockResolvedValue(mockResponse);

		const { result } = renderHook(() => useRefundBoothTransaction(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			boothId: "booth-123",
			transactionCode: "TXN-ABC",
			amount: 5,
			method: "cash_till",
			note: "receipt #9",
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockRefundBoothTransaction).toHaveBeenCalledWith(
			"booth-123",
			"TXN-ABC",
			{ amount: 5, method: "cash_till", note: "receipt #9" },
		);
		expect(result.current.data).toEqual(mockResponse);
	});

	it("exposes error state on 409 / other API failures", async () => {
		mockRefundBoothTransaction.mockRejectedValue(
			new Error("Transaction already refunded"),
		);

		const { result } = renderHook(() => useRefundBoothTransaction(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			boothId: "booth-123",
			transactionCode: "TXN-ABC",
			amount: 5,
			method: "cash_till",
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Transaction already refunded",
		);
	});
});
