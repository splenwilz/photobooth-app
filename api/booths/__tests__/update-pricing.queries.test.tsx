/**
 * useUpdatePricing Cache Tests
 *
 * The pricing PATCH is applied asynchronously on the booth (WebSocket
 * command), so GET /pricing lags behind the update. The hook must write
 * the new pricing into the cache from the mutation response (which carries
 * the authoritative values in `updates`) instead of invalidating — an
 * immediate refetch would re-cache the OLD value for the query's staleTime
 * and the UI would stay stale until an app reload.
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import { queryKeys } from "../../utils/query-keys";
import { useUpdatePricing } from "../queries";
import { getBoothPricing, updateBoothPricing } from "../services";
import type { BoothPricingResponse, UpdatePricingResponse } from "../types";

jest.mock("../services");

const mockUpdateBoothPricing = updateBoothPricing as jest.MockedFunction<
	typeof updateBoothPricing
>;
const mockGetBoothPricing = getBoothPricing as jest.MockedFunction<
	typeof getBoothPricing
>;

const BOOTH_ID = "booth-123";

function makeCachedPricing(): BoothPricingResponse {
	return {
		booth_id: BOOTH_ID,
		booth_name: "Downtown Booth",
		pricing: {
			PhotoStrips: { price: 5, extra_copy_price: 2, multiple_copy_discount: 0 },
			Photo4x6: { price: 8, extra_copy_price: 3, multiple_copy_discount: 0 },
		},
		last_updated: "2026-07-01T10:00:00Z",
	};
}

function makeResponse(
	overrides: Partial<UpdatePricingResponse> = {},
): UpdatePricingResponse {
	return {
		command_id: 42,
		booth_id: BOOTH_ID,
		updates: {
			PhotoStrips: {
				price: 15,
				extra_copy_price: 6,
				multiple_copy_discount: 0,
			},
		},
		status: "delivered",
		message: "Pricing update delivered to booth",
		...overrides,
	};
}

function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
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

describe("useUpdatePricing cache behavior", () => {
	beforeEach(() => jest.clearAllMocks());

	it("writes the response's updates into the pricing cache without refetching", async () => {
		mockUpdateBoothPricing.mockResolvedValue(makeResponse());

		const queryClient = createQueryClient();
		queryClient.setQueryData(
			queryKeys.booths.pricing(BOOTH_ID),
			makeCachedPricing(),
		);

		const { result } = renderHook(() => useUpdatePricing(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate({ boothId: BOOTH_ID, photo_strips_price: 15 });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const cached = queryClient.getQueryData<BoothPricingResponse>(
			queryKeys.booths.pricing(BOOTH_ID),
		);
		// Updated product reflects the mutation response...
		expect(cached?.pricing.PhotoStrips?.price).toBe(15);
		expect(cached?.pricing.PhotoStrips?.extra_copy_price).toBe(6);
		// ...untouched products are preserved...
		expect(cached?.pricing.Photo4x6?.price).toBe(8);
		// ...and the lagging GET endpoint was never hit (a refetch would
		// re-cache the old booth-reported pricing).
		expect(mockGetBoothPricing).not.toHaveBeenCalled();
	});

	it("leaves the cache untouched when the command status is 'failed'", async () => {
		mockUpdateBoothPricing.mockResolvedValue(
			makeResponse({ status: "failed", message: "Booth unreachable" }),
		);

		const queryClient = createQueryClient();
		queryClient.setQueryData(
			queryKeys.booths.pricing(BOOTH_ID),
			makeCachedPricing(),
		);

		const { result } = renderHook(() => useUpdatePricing(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate({ boothId: BOOTH_ID, photo_strips_price: 15 });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const cached = queryClient.getQueryData<BoothPricingResponse>(
			queryKeys.booths.pricing(BOOTH_ID),
		);
		// The booth never applied the change — the old price is still correct.
		expect(cached?.pricing.PhotoStrips?.price).toBe(5);
	});

	it("does not create a cache entry when none exists", async () => {
		mockUpdateBoothPricing.mockResolvedValue(makeResponse());

		const queryClient = createQueryClient();

		const { result } = renderHook(() => useUpdatePricing(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate({ boothId: BOOTH_ID, photo_strips_price: 15 });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(
			queryClient.getQueryData(queryKeys.booths.pricing(BOOTH_ID)),
		).toBeUndefined();
	});

	it("still invalidates the booth detail query", async () => {
		mockUpdateBoothPricing.mockResolvedValue(makeResponse());

		const queryClient = createQueryClient();
		const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

		const { result } = renderHook(() => useUpdatePricing(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate({ boothId: BOOTH_ID, photo_strips_price: 15 });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: queryKeys.booths.detail(BOOTH_ID),
		});
	});
});
