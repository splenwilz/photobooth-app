/**
 * useCreateBooth cache-invalidation contract
 *
 * After creating a booth, the per-booth subscriptions list
 * (queryKeys.payments.boothSubscriptions) MUST be invalidated so the new booth
 * appears on the Booths screen with the correct subscription status without
 * waiting for the list's 5-min staleTime to elapse.
 *
 * Regression guard for the "Settings says active / Booths says no subscription"
 * bug, which was caused by the Booths subscription list serving a stale cache
 * that predated the new booth.
 */
import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreateBooth } from "../queries";
import { createBooth } from "../services";
import { queryKeys } from "../../utils/query-keys";

jest.mock("../services", () => ({
	createBooth: jest.fn(),
}));

const mockCreateBooth = createBooth as jest.MockedFunction<typeof createBooth>;

function createWrapper(qc: QueryClient) {
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
}

describe("useCreateBooth — cache invalidation", () => {
	beforeEach(() => jest.clearAllMocks());

	it("invalidates the booth subscriptions list on success", async () => {
		const qc = new QueryClient({
			defaultOptions: { mutations: { retry: false } },
		});
		const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

		mockCreateBooth.mockResolvedValue({ id: "new-booth-1" } as Awaited<
			ReturnType<typeof createBooth>
		>);

		const { result } = renderHook(() => useCreateBooth(), {
			wrapper: createWrapper(qc),
		});

		result.current.mutate({ name: "My Booth" } as Parameters<
			typeof result.current.mutate
		>[0]);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: queryKeys.payments.boothSubscriptions(),
		});
	});
});
