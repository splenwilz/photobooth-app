/**
 * Cash Collections Query Hook Tests
 *
 * Tests for useBoothCashCollectionsInfinite — offset-based infinite
 * pagination driven by the response's `total` count.
 * @see docs Cash Box API — GET /api/v1/booths/{booth_id}/cash-collections
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import { useBoothCashCollectionsInfinite } from "../queries";
import { getBoothCashCollections } from "../services";
import type { BoothCashCollectionsResponse, CashCollection } from "../types";

jest.mock("../services");

const mockGetBoothCashCollections =
	getBoothCashCollections as jest.MockedFunction<
		typeof getBoothCashCollections
	>;

function makeCollection(overrides: Partial<CashCollection> = {}): CashCollection {
	return {
		id: "3f6c1a9e-8d2b-4c11-9f7a-2e5b8c4d0a61",
		local_id: 12,
		total_amount: 42.0,
		bill1_amount: 30.0,
		bill2_amount: 12.0,
		collected_by_name: "Alice Operator",
		note: "weekly pickup",
		collected_at: "2026-06-28T09:12:00Z",
		synced_at: "2026-06-28T09:12:31Z",
		...overrides,
	};
}

function makePage(
	overrides: Partial<BoothCashCollectionsResponse> = {},
): BoothCashCollectionsResponse {
	return {
		booth_id: "booth-123",
		booth_name: "Downtown Booth",
		collections: [],
		total: 0,
		limit: 50,
		offset: 0,
		...overrides,
	};
}

function createQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
}

function createWrapper(queryClient: QueryClient) {
	function QueryClientWrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		);
	}
	QueryClientWrapper.displayName = "QueryClientWrapper";
	return QueryClientWrapper;
}

describe("useBoothCashCollectionsInfinite", () => {
	beforeEach(() => jest.clearAllMocks());

	it("fetches the first page with default limit and offset 0", async () => {
		const rows = Array.from({ length: 2 }, (_, i) =>
			makeCollection({ id: `row-${i}`, local_id: 12 - i }),
		);
		mockGetBoothCashCollections.mockResolvedValue(
			makePage({ collections: rows, total: 2 }),
		);

		const { result } = renderHook(
			() => useBoothCashCollectionsInfinite("booth-123"),
			{ wrapper: createWrapper(createQueryClient()) },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockGetBoothCashCollections).toHaveBeenCalledWith("booth-123", {
			limit: 50,
			offset: 0,
		});
		expect(result.current.data?.pages[0].collections).toHaveLength(2);
	});

	it("exposes hasNextPage and fetches the next offset when more rows exist", async () => {
		const pageOne = makePage({
			collections: Array.from({ length: 50 }, (_, i) =>
				makeCollection({ id: `p1-${i}`, local_id: 120 - i }),
			),
			total: 120,
		});
		const pageTwo = makePage({
			collections: Array.from({ length: 50 }, (_, i) =>
				makeCollection({ id: `p2-${i}`, local_id: 70 - i }),
			),
			total: 120,
			offset: 50,
		});
		mockGetBoothCashCollections
			.mockResolvedValueOnce(pageOne)
			.mockResolvedValueOnce(pageTwo);

		const { result } = renderHook(
			() => useBoothCashCollectionsInfinite("booth-123"),
			{ wrapper: createWrapper(createQueryClient()) },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.hasNextPage).toBe(true);

		result.current.fetchNextPage();

		await waitFor(() =>
			expect(result.current.data?.pages).toHaveLength(2),
		);
		expect(mockGetBoothCashCollections).toHaveBeenLastCalledWith(
			"booth-123",
			{ limit: 50, offset: 50 },
		);
		// 100 of 120 loaded — still more
		expect(result.current.hasNextPage).toBe(true);
	});

	it("reports no next page once all rows are loaded", async () => {
		mockGetBoothCashCollections.mockResolvedValue(
			makePage({
				collections: [makeCollection()],
				total: 1,
			}),
		);

		const { result } = renderHook(
			() => useBoothCashCollectionsInfinite("booth-123"),
			{ wrapper: createWrapper(createQueryClient()) },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.hasNextPage).toBe(false);
	});

	it("stops paginating when a page comes back empty even if total claims more rows", async () => {
		// Server count/read skew: total says 120 but only 50 rows are actually
		// returnable. Without an empty-page guard, getNextPageParam would return
		// the same offset forever → endless "Loading more…" + request hammering.
		const pageOne = makePage({
			collections: Array.from({ length: 50 }, (_, i) =>
				makeCollection({ id: `p1-${i}`, local_id: 120 - i }),
			),
			total: 120,
		});
		const emptyPage = makePage({ collections: [], total: 120, offset: 50 });
		mockGetBoothCashCollections
			.mockResolvedValueOnce(pageOne)
			.mockResolvedValue(emptyPage);

		const { result } = renderHook(
			() => useBoothCashCollectionsInfinite("booth-123"),
			{ wrapper: createWrapper(createQueryClient()) },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.hasNextPage).toBe(true);

		result.current.fetchNextPage();
		await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

		expect(result.current.hasNextPage).toBe(false);
	});

	it("reports no next page for an empty history (total 0)", async () => {
		mockGetBoothCashCollections.mockResolvedValue(makePage());

		const { result } = renderHook(
			() => useBoothCashCollectionsInfinite("booth-123"),
			{ wrapper: createWrapper(createQueryClient()) },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.hasNextPage).toBe(false);
	});

	it("respects a custom limit", async () => {
		mockGetBoothCashCollections.mockResolvedValue(
			makePage({ limit: 20 }),
		);

		const { result } = renderHook(
			() => useBoothCashCollectionsInfinite("booth-123", { limit: 20 }),
			{ wrapper: createWrapper(createQueryClient()) },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(mockGetBoothCashCollections).toHaveBeenCalledWith("booth-123", {
			limit: 20,
			offset: 0,
		});
	});

	it("stays disabled when boothId is null", async () => {
		const { result } = renderHook(
			() => useBoothCashCollectionsInfinite(null),
			{ wrapper: createWrapper(createQueryClient()) },
		);

		// Give the hook a tick to (incorrectly) fire if enabled were wrong
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(mockGetBoothCashCollections).not.toHaveBeenCalled();
		expect(result.current.fetchStatus).toBe("idle");
	});

	it("is invalidated by the 3-element key prefix ['booths','cashCollections',boothId]", async () => {
		mockGetBoothCashCollections.mockResolvedValue(
			makePage({ collections: [makeCollection()], total: 1 }),
		);

		const queryClient = createQueryClient();
		const { result } = renderHook(
			() => useBoothCashCollectionsInfinite("booth-123"),
			{ wrapper: createWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(mockGetBoothCashCollections).toHaveBeenCalledTimes(1);

		// The documented invalidation contract (see useRefundBoothTransaction):
		// a params-less 3-element prefix must match every paginated cache entry.
		queryClient.invalidateQueries({
			queryKey: ["booths", "cashCollections", "booth-123"],
		});

		await waitFor(() =>
			expect(mockGetBoothCashCollections).toHaveBeenCalledTimes(2),
		);
	});
});
