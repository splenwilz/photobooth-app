import { useQuery } from "@tanstack/react-query";
import { createMutationHook } from "../utils/query-helpers";
import { queryKeys } from "../utils/query-keys";
import {
	createBooth,
	getBoothDetail,
	getBoothList,
	getBoothOverview,
	getDashboardOverview,
} from "./services";
import type {
	BoothDetailResponse,
	BoothListResponse,
	BoothOverviewResponse,
	CreateBoothRequest,
	CreateBoothResponse,
	DashboardOverviewResponse,
} from "./types";

/**
 * Booth React Query Hooks
 *
 * React Query v5 pattern: Returns mutation and queryClient for component-level handling.
 * @see https://tanstack.com/query/latest/docs/react/guides/mutations
 */

/**
 * Hook to create a new booth
 *
 * Usage:
 * ```tsx
 * const { mutate: createBooth, isPending, error } = useCreateBooth();
 *
 * createBooth({ name: 'My Booth', address: '123 Mall Street' }, {
 *   onSuccess: (data) => console.log('Created:', data.id),
 * });
 * ```
 *
 * @returns React Query mutation object for booth creation
 */
export const useCreateBooth = createMutationHook<
	CreateBoothRequest,
	CreateBoothResponse
>(createBooth);

/**
 * Hook to fetch list of all booths for current user
 * Used for booth selection in dashboard and booth list
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error } = useBoothList();
 * console.log(data?.booths, data?.total);
 * ```
 *
 * @returns React Query result with booth list
 * @see GET /api/v1/booths
 */
export function useBoothList() {
	return useQuery<BoothListResponse>({
		queryKey: queryKeys.booths.list(),
		queryFn: getBoothList,
		staleTime: 60000, // 1 minute
	});
}

/**
 * Hook to fetch detailed overview for a single booth
 * Includes revenue, hardware status, system info, and recent alerts
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error } = useBoothDetail('booth-123');
 * console.log(data?.revenue.today, data?.hardware.printer);
 * ```
 *
 * @param boothId - The booth ID to fetch
 * @param options - Optional query options
 * @returns React Query result with booth detail data
 * @see GET /api/v1/booths/{booth_id}/overview
 */
export function useBoothDetail(boothId: string | null) {
	return useQuery<BoothDetailResponse>({
		queryKey: queryKeys.booths.detail(boothId ?? ''),
		queryFn: () => getBoothDetail(boothId!),
		// Only run query if boothId is provided
		enabled: !!boothId,
		staleTime: 30000, // 30 seconds - dashboard data should be fresh
	});
}

/**
 * Hook to fetch booth overview with summary and all booths (aggregated view)
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error, refetch } = useBoothOverview();
 *
 * // Access summary stats
 * console.log(data?.summary.total_booths);
 *
 * // Access individual booths
 * data?.booths.forEach(booth => console.log(booth.booth_name));
 * ```
 *
 * @returns React Query result with booth overview data
 * @see GET /api/v1/booths/overview
 */
export function useBoothOverview() {
	return useQuery<BoothOverviewResponse>({
		queryKey: queryKeys.booths.all(),
		queryFn: getBoothOverview,
		// Data stays fresh for 1 minute - users can pull-to-refresh for updates
		staleTime: 60000,
	});
}

/**
 * Hook to fetch dashboard overview with aggregated stats across all booths
 * Includes summary counts, revenue by period, payment breakdown, hardware summary, and alerts
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error, refetch } = useDashboardOverview();
 *
 * // Access summary
 * console.log(data?.summary.total_booths, data?.summary.online_count);
 *
 * // Access revenue by period
 * console.log(data?.revenue.today.amount, data?.revenue.week.amount);
 *
 * // Access payment breakdown by period
 * console.log(data?.payment_breakdown.today.cash, data?.payment_breakdown.today.card);
 *
 * // Access hardware summary
 * console.log(data?.hardware_summary.printers.online);
 *
 * // Access recent alerts
 * data?.recent_alerts.forEach(alert => console.log(alert.title));
 * ```
 *
 * @param options - Optional settings (e.g., { enabled: false } to disable query)
 * @returns React Query result with dashboard overview data
 * @see GET /api/v1/booths/overview/all
 */
export function useDashboardOverview(options?: { enabled?: boolean }) {
	return useQuery<DashboardOverviewResponse>({
		queryKey: queryKeys.dashboard.overview(),
		queryFn: getDashboardOverview,
		staleTime: 60000, // 1 minute
		enabled: options?.enabled ?? true,
	});
}
