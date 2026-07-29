/**
 * Critical Events Queries Tests
 *
 * Tests for useBoothTransactions, useBoothCriticalEvents,
 * useBoothsCriticalEvents (fleet fan-out), and useRefundBoothTransaction
 * React Query hooks.
 */
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	useBoothCriticalEvents,
	useBoothCriticalEventsInfinite,
	useBoothsCriticalEvents,
	useBoothTransactions,
	useRefundBoothTransaction,
} from "../queries";
import { queryKeys } from "../../utils/query-keys";
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
			// gcTime: Infinity avoids scheduling cache-GC timers that keep the
			// jest process alive ("Jest did not exit…"), per the testing docs.
			queries: { retry: false, gcTime: Infinity },
			mutations: { retry: false, gcTime: Infinity },
		},
	});
	return function TestQueryWrapper({
		children,
	}: {
		children: React.ReactNode;
	}) {
		return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
	};
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

describe("useBoothsCriticalEvents", () => {
	beforeEach(() => jest.clearAllMocks());

	const makeResponse = (boothId: string, eventIds: number[]) => ({
		booth_id: boothId,
		booth_name: `Booth ${boothId}`,
		events: eventIds.map((id) => ({
			id,
			tag: "PRINT_JOB_STUCK",
			details: "stuck",
			transaction_code: null,
			occurred_at: "2026-07-27T10:00:00Z",
			received_at: "2026-07-27T10:00:10Z",
			transaction_total_price: null,
			refund: null,
		})),
		count: eventIds.length,
		limit: 50,
		offset: 0,
	});

	it("fetches every booth and keys events by booth id", async () => {
		mockGetBoothCriticalEvents.mockImplementation((boothId) =>
			Promise.resolve(
				makeResponse(boothId, boothId === "booth-a" ? [1, 2] : [7]),
			),
		);

		const { result } = renderHook(
			() => useBoothsCriticalEvents(["booth-a", "booth-b"]),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => expect(result.current.isPending).toBe(false));

		expect(mockGetBoothCriticalEvents).toHaveBeenCalledTimes(2);
		expect(mockGetBoothCriticalEvents).toHaveBeenCalledWith("booth-a");
		expect(mockGetBoothCriticalEvents).toHaveBeenCalledWith("booth-b");
		expect(result.current.eventsByBooth["booth-a"].map((e) => e.id)).toEqual([
			1, 2,
		]);
		expect(result.current.eventsByBooth["booth-b"].map((e) => e.id)).toEqual([
			7,
		]);
		expect(result.current.isError).toBe(false);
	});

	it("stores results under the shared criticalEvents query key (cache contract)", async () => {
		// The fan-out, single-booth hook, and refund invalidation all rely on
		// this exact key shape — changing it silently breaks cache sharing.
		mockGetBoothCriticalEvents.mockImplementation((boothId) =>
			Promise.resolve(makeResponse(boothId, [1])),
		);
		const qc = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: Infinity } },
		});
		const wrapper = ({ children }: { children: React.ReactNode }) => (
			<QueryClientProvider client={qc}>{children}</QueryClientProvider>
		);

		const { result } = renderHook(
			() => useBoothsCriticalEvents(["booth-a"]),
			{ wrapper },
		);
		await waitFor(() => expect(result.current.isPending).toBe(false));

		expect(
			qc.getQueryData(queryKeys.booths.criticalEvents("booth-a")),
		).toBeDefined();
	});

	it("flags truncated feeds so badges can render a lower-bound count", async () => {
		mockGetBoothCriticalEvents.mockImplementation((boothId) =>
			Promise.resolve({
				...makeResponse(boothId, [1, 2]),
				// Server reports more events than the page returned
				count: 75,
			}),
		);

		const { result } = renderHook(() => useBoothsCriticalEvents(["booth-a"]), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isPending).toBe(false));

		expect(result.current.truncatedByBooth["booth-a"]).toBe(true);
	});

	it("reports isError when any booth's fetch fails, without dropping others", async () => {
		mockGetBoothCriticalEvents.mockImplementation((boothId) =>
			boothId === "booth-bad"
				? Promise.reject(new Error("boom"))
				: Promise.resolve(makeResponse(boothId, [1])),
		);

		const { result } = renderHook(
			() => useBoothsCriticalEvents(["booth-a", "booth-bad"]),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.eventsByBooth["booth-a"]).toBeDefined();
		expect(result.current.eventsByBooth["booth-bad"]).toBeUndefined();
	});

	it("is not pending while unsubscribed (disabled queries are idle, not loading)", () => {
		const { result } = renderHook(
			() => useBoothsCriticalEvents(["booth-a"], { subscribed: false }),
			{ wrapper: createWrapper() },
		);

		expect(result.current.isPending).toBe(false);
	});

	it("returns an empty map without fetching when there are no booths", () => {
		const { result } = renderHook(() => useBoothsCriticalEvents([]), {
			wrapper: createWrapper(),
		});

		expect(result.current.eventsByBooth).toEqual({});
		expect(result.current.isPending).toBe(false);
		expect(mockGetBoothCriticalEvents).not.toHaveBeenCalled();
	});

	it("fetches duplicate booth ids only once", async () => {
		mockGetBoothCriticalEvents.mockImplementation((boothId) =>
			Promise.resolve(makeResponse(boothId, [1])),
		);

		const { result } = renderHook(
			() => useBoothsCriticalEvents(["booth-a", "booth-a"]),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => expect(result.current.isPending).toBe(false));

		expect(mockGetBoothCriticalEvents).toHaveBeenCalledTimes(1);
	});

	it("is pending until every booth's first fetch resolves", async () => {
		let resolveB!: (v: unknown) => void;
		mockGetBoothCriticalEvents.mockImplementation((boothId) =>
			boothId === "booth-a"
				? Promise.resolve(makeResponse("booth-a", [1]))
				: (new Promise((res) => {
						resolveB = res;
					}) as never),
		);

		const { result } = renderHook(
			() => useBoothsCriticalEvents(["booth-a", "booth-b"]),
			{ wrapper: createWrapper() },
		);

		await waitFor(() =>
			expect(result.current.eventsByBooth["booth-a"]).toBeDefined(),
		);
		expect(result.current.isPending).toBe(true);

		resolveB(makeResponse("booth-b", [2]));
		await waitFor(() => expect(result.current.isPending).toBe(false));
	});

	it("does not fetch when unsubscribed (screen not focused)", () => {
		const { result } = renderHook(
			() => useBoothsCriticalEvents(["booth-a"], { subscribed: false }),
			{ wrapper: createWrapper() },
		);

		expect(result.current.eventsByBooth).toEqual({});
		expect(mockGetBoothCriticalEvents).not.toHaveBeenCalled();
	});
});

describe("useBoothCriticalEventsInfinite", () => {
	beforeEach(() => jest.clearAllMocks());

	const makePage = (ids: number[], count: number, offset: number) => ({
		booth_id: "booth-1",
		booth_name: "Downtown",
		events: ids.map((id) => ({
			id,
			tag: "PRINT_JOB_STUCK",
			details: "stuck",
			transaction_code: null,
			occurred_at: "2026-07-27T10:00:00Z",
			received_at: "2026-07-27T10:00:10Z",
			transaction_total_price: null,
			refund: null,
		})),
		count,
		limit: 2,
		offset,
	});

	it("fetches the first page and exposes hasNextPage from the count", async () => {
		mockGetBoothCriticalEvents.mockResolvedValue(makePage([9, 8], 5, 0));

		const { result } = renderHook(
			() => useBoothCriticalEventsInfinite("booth-1", 2),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockGetBoothCriticalEvents).toHaveBeenCalledWith("booth-1", {
			limit: 2,
			offset: 0,
		});
		expect(result.current.hasNextPage).toBe(true);
	});

	it("fetches subsequent pages by offset until count is reached", async () => {
		// Implementation keyed on offset (not call order) so incidental
		// extra fetches can't starve the second page.
		mockGetBoothCriticalEvents.mockImplementation((_boothId, params) =>
			Promise.resolve(
				params?.offset === 2 ? makePage([7], 3, 2) : makePage([9, 8], 3, 0),
			),
		);

		const { result } = renderHook(
			() => useBoothCriticalEventsInfinite("booth-1", 2),
			{ wrapper: createWrapper() },
		);
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.hasNextPage).toBe(true);
		expect(mockGetBoothCriticalEvents).toHaveBeenCalledTimes(1);
		await act(async () => {
			await result.current.fetchNextPage();
		});

		expect(mockGetBoothCriticalEvents.mock.calls).toEqual([
			["booth-1", { limit: 2, offset: 0 }],
			["booth-1", { limit: 2, offset: 2 }],
		]);
		await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
		await waitFor(() => expect(result.current.hasNextPage).toBe(false));
		expect(mockGetBoothCriticalEvents).toHaveBeenLastCalledWith("booth-1", {
			limit: 2,
			offset: 2,
		});
		expect(
			result.current.data?.pages.flatMap((p) => p.events.map((e) => e.id)),
		).toEqual([9, 8, 7]);
	});

	it("reports no next page when the first page covers the count", async () => {
		mockGetBoothCriticalEvents.mockResolvedValue(makePage([9], 1, 0));

		const { result } = renderHook(
			() => useBoothCriticalEventsInfinite("booth-1", 2),
			{ wrapper: createWrapper() },
		);
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.hasNextPage).toBe(false);
	});

	it("is disabled when boothId is null", () => {
		const { result } = renderHook(
			() => useBoothCriticalEventsInfinite(null),
			{ wrapper: createWrapper() },
		);

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
