import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../utils/query-keys";
import { getAlerts } from "./services";
import type { AlertsParams, AlertsResponse } from "./types";

/**
 * Alerts React Query Hooks
 *
 * React Query hooks for fetching alerts.
 * @see https://tanstack.com/query/latest/docs/react/guides/queries
 */

/**
 * Hook to fetch alerts from API
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error, refetch } = useAlerts({ severity: 'critical' });
 *
 * // Access alerts
 * data?.alerts.forEach(alert => console.log(alert.title));
 * ```
 *
 * @param params - Optional parameters (severity, category, limit)
 * @returns React Query result with alerts data
 * @see GET /api/v1/analytics/alerts
 */
export function useAlerts(params?: AlertsParams) {
	return useQuery<AlertsResponse>({
		queryKey: queryKeys.alerts.list(params),
		queryFn: () => getAlerts(params),
		// Data stays fresh for 30 seconds - alerts should be relatively fresh
		staleTime: 30000,
	});
}



