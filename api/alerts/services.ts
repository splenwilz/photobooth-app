import { apiClient } from "../client";
import type {
	AlertsParams,
	AlertsResponse,
	MarkAlertReadResponse,
	MarkAllAlertsReadResponse,
} from "./types";

/**
 * Alerts API Services
 *
 * Service functions for fetching alerts and notifications.
 * @see https://tanstack.com/query/latest/docs/react/guides/queries
 */

/**
 * Build query string from params object
 * Filters out undefined values
 */
function buildQueryString(params?: Record<string, unknown>): string {
	if (!params) return "";

	const searchParams = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			searchParams.append(key, String(value));
		}
	});

	const queryString = searchParams.toString();
	return queryString ? `?${queryString}` : "";
}

/**
 * Get alerts from API
 * Supports filtering by severity, category, and limit.
 *
 * @param params - Optional query parameters (severity, category, limit)
 * @returns Promise resolving to alerts response
 * @see GET /api/v1/analytics/alerts
 */
export async function getAlerts(
	params?: AlertsParams,
): Promise<AlertsResponse> {
	const queryString = buildQueryString(params as Record<string, unknown>);

	const response = await apiClient<AlertsResponse>(
		`/api/v1/analytics/alerts${queryString}`,
		{
			method: "GET",
		},
	);
	return response;
}

/**
 * Get alerts for a specific booth
 *
 * @param boothId - The booth's unique ID
 * @param params - Optional query parameters (severity, category, limit)
 * @returns Promise resolving to alerts response scoped to the booth
 * @see GET /api/v1/analytics/alerts/{booth_id}
 */
export async function getBoothAlerts(
	boothId: string,
	params?: AlertsParams,
): Promise<AlertsResponse> {
	const queryString = buildQueryString(params as Record<string, unknown>);

	const response = await apiClient<AlertsResponse>(
		`/api/v1/analytics/alerts/${boothId}${queryString}`,
		{
			method: "GET",
		},
	);
	return response;
}

/**
 * Mark a single alert read (or unread).
 *
 * Idempotent in both directions. The 422 error body is `{ detail: string }`
 * (a plain string), not FastAPI's validation-error array.
 *
 * @param alertId - Canonical alert id, e.g. "printer-error-{booth_id}"
 * @param isRead - true to mark read (default), false to mark unread
 * @returns Promise resolving to the updated read-state
 * @see PATCH /api/v1/analytics/alerts/{alert_id}/read
 */
export async function markAlertRead(
	alertId: string,
	isRead = true,
): Promise<MarkAlertReadResponse> {
	const response = await apiClient<MarkAlertReadResponse>(
		`/api/v1/analytics/alerts/${encodeURIComponent(alertId)}/read`,
		{
			method: "PATCH",
			body: JSON.stringify({ is_read: isRead }),
		},
	);
	return response;
}

/**
 * Mark every currently-active alert read.
 *
 * @param boothId - Scope to a booth, or null for all booths owned by the caller
 * @returns Promise resolving to the count of alerts marked read
 * @see PATCH /api/v1/analytics/alerts/read-all
 */
export async function markAllAlertsRead(
	boothId: string | null,
): Promise<MarkAllAlertsReadResponse> {
	const response = await apiClient<MarkAllAlertsReadResponse>(
		"/api/v1/analytics/alerts/read-all",
		{
			method: "PATCH",
			body: JSON.stringify({ booth_id: boothId }),
		},
	);
	return response;
}
