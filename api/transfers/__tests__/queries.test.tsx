/**
 * Transfer query/mutation hook tests.
 *
 * The key behaviors under test:
 * - useLatestBoothTransfer resolves to null on the expected 404 `no_transfer`
 *   ("never offered" is a state, not an error) but surfaces other 404s
 *   (`booth_not_found`) as real errors.
 * - Transfer mutations opt out of the app-level mutation retry: accept is a
 *   non-idempotent atomic handover (a retried timeout would re-POST it), and
 *   create/resend draw from a 10/hour rate bucket.
 * - Accepting invalidates everything ownership touches — even on failure,
 *   because an ambiguous timeout may have succeeded server-side.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import { ApiError } from "../../client";
import { queryKeys } from "../../utils/query-keys";
import {
	useAcceptTransfer,
	useCreateBoothTransfer,
	useLatestBoothTransfer,
	useResendBoothTransfer,
} from "../queries";
import {
	acceptTransfer,
	createBoothTransfer,
	getLatestBoothTransfer,
	resendBoothTransfer,
} from "../services";
import type { BoothTransfer } from "../types";

jest.mock("../services");

const mockGetLatest = getLatestBoothTransfer as jest.MockedFunction<
	typeof getLatestBoothTransfer
>;
const mockAccept = acceptTransfer as jest.MockedFunction<typeof acceptTransfer>;
const mockCreate = createBoothTransfer as jest.MockedFunction<
	typeof createBoothTransfer
>;
const mockResend = resendBoothTransfer as jest.MockedFunction<
	typeof resendBoothTransfer
>;

function makeTransfer(overrides: Partial<BoothTransfer> = {}): BoothTransfer {
	return {
		id: "t1",
		booth_id: "b1",
		booth_name: "Downtown Booth",
		seller_id: "seller-1",
		buyer_id: null,
		buyer_email: "buyer@example.com",
		status: "pending",
		include_templates: true,
		templates_copied: null,
		created_at: "2026-08-01T00:00:00Z",
		expires_at: "2026-08-08T00:00:00Z",
		accepted_at: null,
		settled_at: null,
		cancelled_at: null,
		...overrides,
	};
}

function transferApiError(status: number, code: string): ApiError {
	return new ApiError(status, code, undefined, false, code, {
		code,
		message: code,
	});
}

// Mutations retry once app-wide (api/query-client.ts); mirror that here so
// the NO_RETRY opt-out in the hooks is what the tests actually exercise.
function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: 1 },
		},
	});
}

function createWrapper(queryClient: QueryClient) {
	function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	}
	Wrapper.displayName = "QueryClientWrapper";
	return Wrapper;
}

describe("useLatestBoothTransfer", () => {
	beforeEach(() => jest.clearAllMocks());

	it("resolves to null on the expected 404 no_transfer", async () => {
		mockGetLatest.mockRejectedValue(transferApiError(404, "no_transfer"));

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useLatestBoothTransfer("b1"), {
			wrapper: createWrapper(queryClient),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toBeNull();
	});

	it("surfaces a booth_not_found 404 as a real error", async () => {
		mockGetLatest.mockRejectedValue(transferApiError(404, "booth_not_found"));

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useLatestBoothTransfer("b1"), {
			wrapper: createWrapper(queryClient),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
	});

	it("does not fetch without a booth id", () => {
		const queryClient = createTestQueryClient();
		renderHook(() => useLatestBoothTransfer(null), {
			wrapper: createWrapper(queryClient),
		});
		expect(mockGetLatest).not.toHaveBeenCalled();
	});
});

describe("transfer mutations", () => {
	beforeEach(() => jest.clearAllMocks());

	it("does not retry a failed accept (non-idempotent handover)", async () => {
		mockAccept.mockRejectedValue(new ApiError(504, "gateway timeout"));

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useAcceptTransfer(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate({ transferId: "t1", token: "tok" });
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(mockAccept).toHaveBeenCalledTimes(1);
	});

	it("does not retry create/resend (10/hour rate bucket)", async () => {
		mockCreate.mockRejectedValue(new ApiError(500, "boom"));
		mockResend.mockRejectedValue(new ApiError(500, "boom"));

		const queryClient = createTestQueryClient();
		const wrapper = createWrapper(queryClient);

		const { result: create } = renderHook(() => useCreateBoothTransfer(), {
			wrapper,
		});
		create.current.mutate({ boothId: "b1", buyer_email: "x@y.com" });
		await waitFor(() => expect(create.current.isError).toBe(true));
		expect(mockCreate).toHaveBeenCalledTimes(1);

		const { result: resend } = renderHook(() => useResendBoothTransfer(), {
			wrapper,
		});
		resend.current.mutate({ boothId: "b1" });
		await waitFor(() => expect(resend.current.isError).toBe(true));
		expect(mockResend).toHaveBeenCalledTimes(1);
	});

	it("invalidates ownership-scoped caches on accept — even on failure", async () => {
		mockAccept.mockRejectedValue(new ApiError(504, "ambiguous timeout"));

		const queryClient = createTestQueryClient();
		const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
		const { result } = renderHook(() => useAcceptTransfer(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate({ transferId: "t1", token: "tok" });
		await waitFor(() => expect(result.current.isError).toBe(true));

		const invalidatedKeys = invalidateSpy.mock.calls.map(
			([filters]) => filters?.queryKey,
		);
		expect(invalidatedKeys).toEqual(
			expect.arrayContaining([
				queryKeys.transfers.detail("t1"),
				queryKeys.transfers.list(),
				queryKeys.booths.all(),
				queryKeys.payments.all(),
				queryKeys.templates.purchasedAll(),
				// Mobile-specific: alerts and analytics live under their own key
				// roots (unlike web), and both are ownership-scoped
				queryKeys.alerts.all(),
				queryKeys.analytics.all(),
			]),
		);
	});

	it("returns the updated transfer from a successful accept", async () => {
		const settled = makeTransfer({ status: "settled" });
		mockAccept.mockResolvedValue(settled);

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useAcceptTransfer(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate({ transferId: "t1", token: "tok" });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(settled);
		expect(mockAccept).toHaveBeenCalledWith("t1", { token: "tok" });
	});
});
