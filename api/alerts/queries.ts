import type { Alert as AppAlert } from "@/types/photobooth";
import { mapAlertsApiAlertToAppAlert } from "@/utils/alert-mapping";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/query-keys";
import { getAlerts, getBoothAlerts } from "./services";
import type { AlertSummary, AlertsParams } from "./types";

/**
 * Alerts React Query Hooks
 *
 * React Query hooks for fetching alerts.
 * @see https://tanstack.com/query/latest/docs/react/guides/queries
 */

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
