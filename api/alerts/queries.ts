import type { Alert as AppAlert } from "@/types/photobooth";
import { mapAlertsApiAlertToAppAlert } from "@/utils/alert-mapping";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/query-keys";
import {
	getAlerts,
	getBoothAlerts,
	markAlertRead,
	markAllAlertsRead,
} from "./services";
import type { AlertSummary, AlertsParams } from "./types";

/**
 * Alerts React Query Hooks
 *
 * React Query hooks for fetching alerts.
 * @see https://tanstack.com/query/latest/docs/react/guides/queries
 */

/**
 * Shared mutation key for the alert read-state mutations, so the onSettled
 * reconcile gate counts ONLY these mutations (not unrelated app mutations).
 */
const ALERTS_MUTATION_KEY = ["alerts", "mutate"] as const;

/**
 * Transformed alerts response with app Alert types
 */
interface TransformedAlertsResponse {
	summary?: AlertSummary;
	alerts: AppAlert[];
	total?: number;
	returned?: number;
}

/**
 * Hook to fetch alerts from API (all booths)
 *
 * Automatically transforms API alerts (snake_case) to app alerts (camelCase).
 *
 * @param params - Optional parameters (severity, category, limit)
 * @param options - Optional query options (enabled)
 * @returns React Query result with transformed alerts data
 * @see GET /api/v1/analytics/alerts
 */
export function useAlerts(
	params?: AlertsParams,
	options?: { enabled?: boolean },
) {
	return useQuery<TransformedAlertsResponse>({
		queryKey: queryKeys.alerts.list(params),
		queryFn: async () => {
			const response = await getAlerts(params);
			return {
				summary: response.summary,
				alerts: response.alerts.map(mapAlertsApiAlertToAppAlert),
				total: response.total,
				returned: response.returned,
			};
		},
		staleTime: 1 * 60 * 1000, // 1 minute - alerts should be relatively fresh
		enabled: options?.enabled ?? true,
	});
}

/**
 * Hook to fetch alerts for a specific booth
 *
 * Disabled when boothId is null/undefined (e.g., "All Booths" mode).
 *
 * @param boothId - Booth ID or null to disable
 * @param params - Optional parameters (severity, category, limit)
 * @returns React Query result with transformed alerts data
 * @see GET /api/v1/analytics/alerts/{booth_id}
 */
export function useBoothAlerts(
	boothId: string | null,
	params?: AlertsParams,
) {
	return useQuery<TransformedAlertsResponse>({
		queryKey: boothId
			? queryKeys.alerts.booth(boothId, params)
			: ["alerts", "booth", null, params],
		queryFn: async () => {
			if (!boothId) {
				return { alerts: [] };
			}
			const response = await getBoothAlerts(boothId, params);
			return {
				summary: response.summary,
				alerts: response.alerts.map(mapAlertsApiAlertToAppAlert),
				total: response.total,
				returned: response.returned,
			};
		},
		enabled: !!boothId,
		staleTime: 1 * 60 * 1000,
	});
}

/**
 * Apply a per-alert patch to EVERY cached alerts query.
 *
 * The same alert can be cached under multiple keys — the Alerts screen
 * (`['alerts','list',{limit:50}]`), the dashboard bell badge
 * (`['alerts','list',undefined]`), and per-booth (`['alerts','booth',id]`).
 * v5's `setQueriesData` with a prefix filter updates them all in one pass, so
 * read-state (and the unread badge derived from it) never goes stale in one
 * surface while another shows the old value.
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
 */
function patchAllAlertsCaches(
	queryClient: ReturnType<typeof useQueryClient>,
	patch: (alert: AppAlert) => AppAlert,
) {
	queryClient.setQueriesData<TransformedAlertsResponse>(
		{ queryKey: queryKeys.alerts.all() },
		(old) => {
			if (!old?.alerts) return old;
			return { ...old, alerts: old.alerts.map(patch) };
		},
	);
}

/**
 * Hook to mark a single alert read (or unread) with optimistic UI.
 *
 * Flips `isRead` across all cached alert queries immediately, rolls back on
 * error, then reconciles with the server. Pass `boothId` (available on the
 * tapped alert) so the booth's detail feed re-syncs too.
 *
 * @see PATCH /api/v1/analytics/alerts/{alert_id}/read
 */
export function useMarkAlertRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ALERTS_MUTATION_KEY,
		mutationFn: ({
			alertId,
			isRead = true,
		}: {
			alertId: string;
			boothId?: string;
			isRead?: boolean;
		}) => markAlertRead(alertId, isRead),
		onMutate: async ({ alertId, isRead = true }) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.alerts.all() });

			// Capture ONLY this alert's prior read-state, so rollback flips just
			// this alert and never clobbers a concurrent tap on a different one.
			let previousIsRead: boolean | undefined;
			for (const [, data] of queryClient.getQueriesData<TransformedAlertsResponse>(
				{ queryKey: queryKeys.alerts.all() },
			)) {
				const found = data?.alerts?.find((a) => a.id === alertId);
				if (found) {
					previousIsRead = found.isRead;
					break;
				}
			}

			patchAllAlertsCaches(queryClient, (alert) =>
				alert.id === alertId ? { ...alert, isRead } : alert,
			);

			return { alertId, previousIsRead };
		},
		onError: (_err, _variables, context) => {
			// Per-alert rollback — restore only the affected alert's read-state.
			if (context?.previousIsRead !== undefined) {
				patchAllAlertsCaches(queryClient, (alert) =>
					alert.id === context.alertId
						? { ...alert, isRead: context.previousIsRead! }
						: alert,
				);
			}
		},
		onSettled: (_data, _err, variables) => {
			// Only the LAST in-flight mutation reconciles, so a settled mutation's
			// refetch can't overwrite a still-pending sibling's optimistic update.
			if (queryClient.isMutating({ mutationKey: ALERTS_MUTATION_KEY }) !== 1)
				return;
			return Promise.all([
				queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all() }),
				queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview() }),
				variables.boothId
					? queryClient.invalidateQueries({
							queryKey: queryKeys.booths.detail(variables.boothId),
						})
					: Promise.resolve(),
			]);
		},
	});
}

/**
 * Hook to mark every active alert read with optimistic UI.
 *
 * @param - `boothId` scopes to one booth; `null` marks all booths.
 * @see PATCH /api/v1/analytics/alerts/read-all
 */
export function useMarkAllAlertsRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ALERTS_MUTATION_KEY,
		mutationFn: (boothId: string | null) => markAllAlertsRead(boothId),
		onMutate: async (boothId) => {
			await queryClient.cancelQueries({ queryKey: queryKeys.alerts.all() });

			const previous = queryClient.getQueriesData<TransformedAlertsResponse>({
				queryKey: queryKeys.alerts.all(),
			});

			patchAllAlertsCaches(queryClient, (alert) =>
				// null = all booths; otherwise only alerts for the scoped booth
				boothId === null || alert.boothId === boothId
					? { ...alert, isRead: true }
					: alert,
			);

			return { previous };
		},
		onError: (_err, _boothId, context) => {
			// Bulk op → restore the full snapshot taken before this mark-all.
			context?.previous?.forEach(([key, data]) => {
				queryClient.setQueryData(key, data);
			});
		},
		onSettled: (_data, _err, boothId) => {
			// Only reconcile when this is the last in-flight mutation (see above).
			if (queryClient.isMutating({ mutationKey: ALERTS_MUTATION_KEY }) !== 1)
				return;
			return Promise.all([
				queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all() }),
				queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview() }),
				boothId
					? queryClient.invalidateQueries({
							queryKey: queryKeys.booths.detail(boothId),
						})
					: Promise.resolve(),
			]);
		},
	});
}
