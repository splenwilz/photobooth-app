/**
 * Notification Preferences API Services
 *
 * Service functions for managing email notification preferences.
 * @see GET /api/v1/notifications/preferences
 * @see PUT /api/v1/notifications/preferences/{event_type}
 * @see PUT /api/v1/notifications/preferences
 * @see GET /api/v1/notifications/history
 */

import { apiClient } from "../client";
import type {
	BulkUpdatePreferencesRequest,
	BulkUpdatePreferencesResponse,
	NotificationEventType,
	NotificationHistoryParams,
	NotificationHistoryResponse,
	NotificationPreference,
	NotificationPreferencesResponse,
	UpdatePreferenceRequest,
} from "./types";

/**
 * Get all notification preferences
 * Returns all 14 event types with enabled/disabled state.
 * Fresh users with no preference rows will see all as enabled.
 *
 * @returns Promise resolving to preferences response
 * @see GET /api/v1/notifications/preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferencesResponse> {
	const response = await apiClient<NotificationPreferencesResponse>(
		"/api/v1/notifications/preferences",
		{ method: "GET" },
	);
	return response;
}

/**
 * Update a single notification preference
 * Upserts a preference row — creates if it doesn't exist, updates if it does.
 *
 * @param eventType - The event type to update
 * @param data - The update payload with enabled boolean
 * @returns Promise resolving to the updated preference
 * @see PUT /api/v1/notifications/preferences/{event_type}
 */
export async function updateNotificationPreference(
	eventType: NotificationEventType,
	data: UpdatePreferenceRequest,
): Promise<NotificationPreference> {
	const response = await apiClient<NotificationPreference>(
		`/api/v1/notifications/preferences/${eventType}`,
		{
			method: "PUT",
			body: JSON.stringify(data),
		},
	);
	return response;
}

/**
 * Bulk update notification preferences
 * Update multiple preferences in a single request.
 * Entire request is rejected if any event type is invalid.
 *
 * @param data - Map of event types to enabled/disabled
 * @returns Promise resolving to update count
 * @see PUT /api/v1/notifications/preferences
 */
export async function bulkUpdatePreferences(
	data: BulkUpdatePreferencesRequest,
): Promise<BulkUpdatePreferencesResponse> {
	const response = await apiClient<BulkUpdatePreferencesResponse>(
		"/api/v1/notifications/preferences",
		{
			method: "PUT",
			body: JSON.stringify(data),
		},
	);
	return response;
}

/**
 * Get notification history
 * Returns the user's email notification log.
 *
 * @param params - Optional pagination params (limit 1-100, offset 0+)
 * @returns Promise resolving to history response with items and total
 * @see GET /api/v1/notifications/history
 */
export async function getNotificationHistory(
	params?: NotificationHistoryParams,
): Promise<NotificationHistoryResponse> {
	const queryParams = new URLSearchParams();
	if (params?.limit !== undefined)
		queryParams.append("limit", params.limit.toString());
	if (params?.offset !== undefined)
		queryParams.append("offset", params.offset.toString());

	const queryString = queryParams.toString();
	const url = `/api/v1/notifications/history${queryString ? `?${queryString}` : ""}`;

	const response = await apiClient<NotificationHistoryResponse>(url, {
		method: "GET",
	});
	return response;
}
