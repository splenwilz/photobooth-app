/**
 * Notification Preferences React Query Hooks
 *
 * Hooks for fetching and updating email notification preferences.
 * Uses optimistic updates for instant toggle feedback.
 *
 * @see https://tanstack.com/query/latest - React Query docs
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/query-keys";
import {
	bulkUpdatePreferences,
	getNotificationHistory,
	getNotificationPreferences,
	updateNotificationPreference,
} from "./services";
import type {
	NotificationEventType,
	NotificationHistoryParams,
	NotificationPreferencesResponse,
} from "./types";

/**
 * Hook to fetch all notification preferences
 *
 * @returns Query result with preferences grouped by category
 * @see GET /api/v1/notifications/preferences
 */
export function useNotificationPreferences() {
	return useQuery({
		queryKey: queryKeys.notifications.preferences(),
		queryFn: getNotificationPreferences,
		staleTime: 5 * 60 * 1000, // 5 minutes - preferences rarely change externally
	});
}

/**
 * Hook to update a single notification preference
 *
 * Uses optimistic updates to immediately toggle the switch UI,
 * then rolls back on error.
 *
 * @returns Mutation for updating a single preference
 * @see PUT /api/v1/notifications/preferences/{event_type}
 */
export function useUpdatePreference() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			eventType,
			enabled,
		}: {
			eventType: NotificationEventType;
			enabled: boolean;
		}) => updateNotificationPreference(eventType, { enabled }),
		onMutate: async ({ eventType, enabled }) => {
			// Cancel outgoing refetches so they don't overwrite our optimistic update
			await queryClient.cancelQueries({
				queryKey: queryKeys.notifications.preferences(),
			});

			// Snapshot only the affected preference for rollback
			const current =
				queryClient.getQueryData<NotificationPreferencesResponse>(
					queryKeys.notifications.preferences(),
				);
			const previousEnabled = current?.preferences.find(
				(p) => p.event_type === eventType,
			)?.enabled;

			// Optimistically update the cache immediately
			if (current) {
				queryClient.setQueryData<NotificationPreferencesResponse>(
					queryKeys.notifications.preferences(),
					{
						...current,
						preferences: current.preferences.map((pref) =>
							pref.event_type === eventType ? { ...pref, enabled } : pref,
						),
					},
				);
			}

			return { eventType, previousEnabled };
		},
		onError: (_err, _variables, context) => {
			// Roll back only the affected preference — preserves other concurrent optimistic updates
			if (context?.previousEnabled !== undefined) {
				queryClient.setQueryData<NotificationPreferencesResponse>(
					queryKeys.notifications.preferences(),
					(prev) => {
						if (!prev) return prev;
						return {
							...prev,
							preferences: prev.preferences.map((p) =>
								p.event_type === context.eventType
									? { ...p, enabled: context.previousEnabled! }
									: p,
							),
						};
					},
				);
			}
		},
		// No onSettled/invalidation — the optimistic update is the source of truth.
		// Pull-to-refresh will sync with the server if needed.
	});
}

/**
 * Hook to bulk update notification preferences
 *
 * @returns Mutation for bulk updating preferences
 * @see PUT /api/v1/notifications/preferences
 */
export function useBulkUpdatePreferences() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (preferences: Partial<Record<NotificationEventType, boolean>>) =>
			bulkUpdatePreferences({ preferences }),
		onMutate: async (preferences) => {
			await queryClient.cancelQueries({
				queryKey: queryKeys.notifications.preferences(),
			});

			const current =
				queryClient.getQueryData<NotificationPreferencesResponse>(
					queryKeys.notifications.preferences(),
				);

			// Snapshot only the affected preferences for rollback
			const affectedKeys = Object.keys(preferences) as NotificationEventType[];
			const previousValues: Partial<Record<NotificationEventType, boolean>> = {};
			if (current) {
				for (const pref of current.preferences) {
					if (affectedKeys.includes(pref.event_type)) {
						previousValues[pref.event_type] = pref.enabled;
					}
				}
			}

			// Optimistically update all affected preferences
			if (current) {
				queryClient.setQueryData<NotificationPreferencesResponse>(
					queryKeys.notifications.preferences(),
					{
						...current,
						preferences: current.preferences.map((pref) => {
							const newValue = preferences[pref.event_type];
							return newValue !== undefined
								? { ...pref, enabled: newValue }
								: pref;
						}),
					},
				);
			}

			return { previousValues };
		},
		onError: (_err, _variables, context) => {
			// Roll back only the affected preferences — preserves other concurrent optimistic updates
			if (context?.previousValues) {
				queryClient.setQueryData<NotificationPreferencesResponse>(
					queryKeys.notifications.preferences(),
					(prev) => {
						if (!prev) return prev;
						return {
							...prev,
							preferences: prev.preferences.map((p) => {
								const rollback = context.previousValues[p.event_type];
								return rollback !== undefined
									? { ...p, enabled: rollback }
									: p;
							}),
						};
					},
				);
			}
		},
	});
}

/**
 * Hook to fetch notification history
 *
 * @param params - Pagination params (limit, offset)
 * @returns Query result with notification history
 * @see GET /api/v1/notifications/history
 */
export function useNotificationHistory(params?: NotificationHistoryParams) {
	return useQuery({
		queryKey: queryKeys.notifications.history(params),
		queryFn: () => getNotificationHistory(params),
		staleTime: 2 * 60 * 1000, // 2 minutes
	});
}
