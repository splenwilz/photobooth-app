import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMutationHook } from "../utils/query-helpers";
import { queryKeys } from "../utils/query-keys";
import {
	cancelBoothRestart,
	createBooth,
	getBoothDetail,
	getBoothList,
	getBoothOverview,
	getBoothPricing,
	getDashboardOverview,
	restartBoothApp,
	restartBoothSystem,
	updateBoothPricing,
} from "./services";
import type {
	BoothDetailResponse,
	BoothListResponse,
	BoothOverviewResponse,
	BoothPricingResponse,
	CreateBoothRequest,
	CreateBoothResponse,
	DashboardOverviewResponse,
	RestartRequest,
	UpdatePricingRequest,
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

/**
 * Hook to fetch booth pricing
 * Gets current product prices for a booth
 *
 * Usage:
 * ```tsx
 * const { data, isLoading } = useBoothPricing('booth-123');
 * console.log(data?.pricing.PhotoStrips.price);
 * ```
 *
 * @param boothId - The booth ID to fetch pricing for
 * @returns React Query result with pricing data
 * @see GET /api/v1/booths/{booth_id}/pricing
 */
export function useBoothPricing(boothId: string | null) {
	return useQuery<BoothPricingResponse>({
		queryKey: queryKeys.booths.pricing(boothId ?? ''),
		queryFn: () => getBoothPricing(boothId!),
		enabled: !!boothId,
		staleTime: 60000, // 1 minute
	});
}

/**
 * Hook to update booth pricing
 * Sends pricing command to booth via WebSocket
 *
 * Usage:
 * ```tsx
 * const { mutate: updatePricing, isPending } = useUpdatePricing();
 *
 * updatePricing({
 *   boothId: 'booth-123',
 *   photo_strips_price: 15,
 *   photo_4x6_price: 16,
 *   reason: 'Price adjustment'
 * }, {
 *   onSuccess: (data) => console.log('Updated:', data.status),
 * });
 * ```
 *
 * @returns React Query mutation for pricing updates
 * @see PUT /api/v1/booths/{booth_id}/pricing
 */
export function useUpdatePricing() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			boothId,
			...pricingData
		}: { boothId: string } & UpdatePricingRequest) =>
			updateBoothPricing(boothId, pricingData),
		onSuccess: (_, variables) => {
			// Invalidate pricing query to refresh prices
			queryClient.invalidateQueries({
				queryKey: queryKeys.booths.pricing(variables.boothId),
			});
			// Invalidate booth detail to refresh pricing info
			queryClient.invalidateQueries({
				queryKey: queryKeys.booths.detail(variables.boothId),
			});
		},
	});
}

// ============================================================================
// RESTART HOOKS
// ============================================================================

/**
 * Hook to restart the booth application
 *
 * Usage:
 * ```tsx
 * const { mutate: restartApp, isPending } = useRestartBoothApp();
 * restartApp({ boothId: 'booth-123', delay_seconds: 5 });
 * ```
 *
 * @returns React Query mutation for app restart
 * @see POST /api/v1/booths/{booth_id}/restart-app
 */
export function useRestartBoothApp() {
	return useMutation({
		mutationFn: ({
			boothId,
			...restartData
		}: { boothId: string } & RestartRequest) =>
			restartBoothApp(boothId, restartData),
	});
}

/**
 * Hook to restart the booth system (PC reboot)
 *
 * Usage:
 * ```tsx
 * const { mutate: restartSystem, isPending } = useRestartBoothSystem();
 * restartSystem({ boothId: 'booth-123', delay_seconds: 15 });
 * ```
 *
 * @returns React Query mutation for system restart
 * @see POST /api/v1/booths/{booth_id}/restart-system
 */
export function useRestartBoothSystem() {
	return useMutation({
		mutationFn: ({
			boothId,
			...restartData
		}: { boothId: string } & RestartRequest) =>
			restartBoothSystem(boothId, restartData),
	});
}

/**
 * Hook to cancel a pending restart command
 *
 * Usage:
 * ```tsx
 * const { mutate: cancelRestart, isPending } = useCancelBoothRestart();
 * cancelRestart({ boothId: 'booth-123' });
 * ```
 *
 * @returns React Query mutation for cancel restart
 * @see POST /api/v1/booths/{booth_id}/cancel-restart
 */
export function useCancelBoothRestart() {
	return useMutation({
		mutationFn: ({ boothId }: { boothId: string }) =>
			cancelBoothRestart(boothId),
	});
}
