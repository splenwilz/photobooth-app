/**
 * Alert read-state mutation tests
 *
 * Verifies the optimistic cache behavior of useMarkAlertRead /
 * useMarkAllAlertsRead: read-state flips across EVERY cached alerts query
 * (Alerts screen list + dashboard bell badge + per-booth) in one pass via
 * setQueriesData, rolls back on error, and invalidates on settle.
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import type { Alert as AppAlert } from "@/types/photobooth";
import { queryKeys } from "../../utils/query-keys";
import { useMarkAlertRead, useMarkAllAlertsRead } from "../queries";
import { markAlertRead, markAllAlertsRead } from "../services";

jest.mock("../services");

const mockMarkAlertRead = markAlertRead as jest.MockedFunction<
	typeof markAlertRead
>;
const mockMarkAllAlertsRead = markAllAlertsRead as jest.MockedFunction<
	typeof markAllAlertsRead
>;

function makeAlert(overrides: Partial<AppAlert> = {}): AppAlert {
	return {
		id: "printer-error-b1",
		type: "critical",
		category: "hardware",
		title: "Printer Error",
		message: "Paper jam",
		boothId: "b1",
		boothName: "Downtown",
		timestamp: "2026-07-01T10:00:00Z",
		isRead: false,
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
	function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		);
	}
	Wrapper.displayName = "QueryClientWrapper";
	return Wrapper;
}

describe("useMarkAlertRead", () => {
	beforeEach(() => jest.clearAllMocks());

	it("optimistically flips isRead across every cached alerts query", async () => {
		mockMarkAlertRead.mockResolvedValue({ id: "printer-error-b1", is_read: true });

		const queryClient = createQueryClient();
		// Alerts screen list (limit:50) and dashboard badge (no params) both cache
		// the same alert under different keys.
		queryClient.setQueryData(queryKeys.alerts.list({ limit: 50 }), {
			alerts: [makeAlert(), makeAlert({ id: "offline-b2", boothId: "b2" })],
		});
		queryClient.setQueryData(queryKeys.alerts.list(undefined), {
			alerts: [makeAlert()],
		});

		const { result } = renderHook(() => useMarkAlertRead(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate({ alertId: "printer-error-b1", boothId: "b1" });

		// Optimistic: read-state flips immediately in BOTH cached queries
		await waitFor(() => {
			const list = queryClient.getQueryData<{ alerts: AppAlert[] }>(
				queryKeys.alerts.list({ limit: 50 }),
			);
			expect(list?.alerts.find((a) => a.id === "printer-error-b1")?.isRead).toBe(
				true,
			);
		});
		const badge = queryClient.getQueryData<{ alerts: AppAlert[] }>(
			queryKeys.alerts.list(undefined),
		);
		expect(badge?.alerts[0].isRead).toBe(true);
		// Other alerts are untouched
		const list = queryClient.getQueryData<{ alerts: AppAlert[] }>(
			queryKeys.alerts.list({ limit: 50 }),
		);
		expect(list?.alerts.find((a) => a.id === "offline-b2")?.isRead).toBe(false);
	});

	it("rolls back all caches when the request fails", async () => {
		mockMarkAlertRead.mockRejectedValue(new Error("500"));

		const queryClient = createQueryClient();
		queryClient.setQueryData(queryKeys.alerts.list({ limit: 50 }), {
			alerts: [makeAlert()],
		});

		const { result } = renderHook(() => useMarkAlertRead(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate({ alertId: "printer-error-b1", boothId: "b1" });

		await waitFor(() => expect(result.current.isError).toBe(true));

		const list = queryClient.getQueryData<{ alerts: AppAlert[] }>(
			queryKeys.alerts.list({ limit: 50 }),
		);
		expect(list?.alerts[0].isRead).toBe(false); // restored
	});

	it("invalidates alerts + dashboard on settle", async () => {
		mockMarkAlertRead.mockResolvedValue({ id: "printer-error-b1", is_read: true });

		const queryClient = createQueryClient();
		const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

		const { result } = renderHook(() => useMarkAlertRead(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate({ alertId: "printer-error-b1", boothId: "b1" });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: queryKeys.alerts.all(),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: queryKeys.dashboard.overview(),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: queryKeys.booths.detail("b1"),
		});
	});
});

describe("useMarkAllAlertsRead", () => {
	beforeEach(() => jest.clearAllMocks());

	it("marks all alerts read when boothId is null", async () => {
		mockMarkAllAlertsRead.mockResolvedValue({ updated: 2 });

		const queryClient = createQueryClient();
		queryClient.setQueryData(queryKeys.alerts.list({ limit: 50 }), {
			alerts: [
				makeAlert({ id: "a1", boothId: "b1" }),
				makeAlert({ id: "a2", boothId: "b2" }),
			],
		});

		const { result } = renderHook(() => useMarkAllAlertsRead(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate(null);
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const list = queryClient.getQueryData<{ alerts: AppAlert[] }>(
			queryKeys.alerts.list({ limit: 50 }),
		);
		expect(list?.alerts.every((a) => a.isRead)).toBe(true);
	});

	it("only marks the scoped booth's alerts when boothId is set", async () => {
		mockMarkAllAlertsRead.mockResolvedValue({ updated: 1 });

		const queryClient = createQueryClient();
		queryClient.setQueryData(queryKeys.alerts.list({ limit: 50 }), {
			alerts: [
				makeAlert({ id: "a1", boothId: "b1" }),
				makeAlert({ id: "a2", boothId: "b2" }),
			],
		});

		const { result } = renderHook(() => useMarkAllAlertsRead(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate("b1");
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const list = queryClient.getQueryData<{ alerts: AppAlert[] }>(
			queryKeys.alerts.list({ limit: 50 }),
		);
		expect(list?.alerts.find((a) => a.id === "a1")?.isRead).toBe(true);
		expect(list?.alerts.find((a) => a.id === "a2")?.isRead).toBe(false);
	});
});
