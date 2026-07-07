/**
 * Notification Preferences React Query Hooks
 *
 * Hooks for fetching and updating email notification preferences.
 * Uses optimistic updates for instant toggle feedback.
 *
 * @see https://tanstack.com/query/latest - React Query docs
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { queryKeys } from "../utils/query-keys";
import {
	getNotificationHistory,
	getNotificationPreferences,
	patchNotificationPreferences,
} from "./services";
import type {
	NotificationChannel,
	NotificationEventType,
	NotificationHistoryParams,
	NotificationPreferencesResponse,
} from "./types";

/** Shared key so the channel-pref reconcile gate counts only these mutations. */
const PREF_MUTATION_KEY = ["notifications", "pref"] as const;

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
 * Hook to update a single per-channel notification preference (email/push).
 *
 * Optimistically flips `channels[channel]` for the event (and keeps the
 * deprecated `enabled` mirror in sync for the email channel), rolls back on
 * error. Rollback restores ONLY the affected `(event_type, channel)` value, so
 * a concurrent toggle of a different channel on the same event isn't clobbered.
 *
 * @see PATCH /api/v1/notifications/preferences
 */
export function useUpdateChannelPreference() {
	const queryClient = useQueryClient();
	// Latest-wins guard: monotonic seq per `${eventType}:${channel}`. A stale
	// failed toggle must NOT roll back a newer toggle's optimistic value for the
	// same key (and since success deliberately skips invalidation, that clobber
	// wouldn't self-heal). onError only acts if it's still the latest for its key.
	const latestSeq = useRef(new Map<string, number>());

	return useMutation({
		mutationKey: PREF_MUTATION_KEY,
		retry: false, // optimistic → fail fast so rollback happens immediately
		mutationFn: ({
			eventType,
			channel,
			enabled,
		}: {
			eventType: NotificationEventType;
			channel: NotificationChannel;
			enabled: boolean;
		}) =>
			patchNotificationPreferences({
				updates: [{ event_type: eventType, channel, enabled }],
			}),
		onMutate: async ({ eventType, channel, enabled }) => {
			await queryClient.cancelQueries({
				queryKey: queryKeys.notifications.preferences(),
			});

			// Claim this key as the latest in-flight toggle.
			const key = `${eventType}:${channel}`;
			const seq = (latestSeq.current.get(key) ?? 0) + 1;
			latestSeq.current.set(key, seq);

			const current =
				queryClient.getQueryData<NotificationPreferencesResponse>(
					queryKeys.notifications.preferences(),
				);
			// Snapshot ONLY the affected channel's prior value for a scoped rollback.
			const previousValue = current?.preferences.find(
				(p) => p.event_type === eventType,
			)?.channels[channel];

			if (current) {
				queryClient.setQueryData<NotificationPreferencesResponse>(
					queryKeys.notifications.preferences(),
					{
						...current,
						preferences: current.preferences.map((pref) =>
							pref.event_type === eventType
								? {
										...pref,
										channels: { ...pref.channels, [channel]: enabled },
										// keep the deprecated mirror consistent
										enabled: channel === "email" ? enabled : pref.enabled,
									}
								: pref,
						),
					},
				);
			}

			return { eventType, channel, previousValue, key, seq };
		},
		onError: (_err, _variables, context) => {
			// If a newer toggle for the same key has since started, its optimistic
			// value is authoritative — don't roll back or invalidate over it.
			if (context && latestSeq.current.get(context.key) !== context.seq) {
				return;
			}
			// Roll back only the affected channel if we optimistically wrote it.
			if (context?.previousValue !== undefined) {
				const { eventType, channel, previousValue } = context;
				queryClient.setQueryData<NotificationPreferencesResponse>(
					queryKeys.notifications.preferences(),
					(prev) => {
						if (!prev) return prev;
						return {
							...prev,
							preferences: prev.preferences.map((p) =>
								p.event_type === eventType
									? {
											...p,
											// restore only the one channel we changed
											channels: { ...p.channels, [channel]: previousValue },
											enabled: channel === "email" ? previousValue : p.enabled,
										}
									: p,
							),
						};
					},
				);
			}
			// Reconcile ONLY on failure (success deliberately never invalidates —
			// the optimistic value is authoritative and a reconcile GET could revert
			// it on out-of-order PATCHes / read-replica lag), and ONLY when no sibling
			// PATCH is still in flight: otherwise a reconcile GET can resolve before a
			// pending sibling commits and strand the cache. The settling mutation
			// counts itself as pending here, so the last in-flight one sees exactly 1.
			if (queryClient.isMutating({ mutationKey: PREF_MUTATION_KEY }) !== 1) return;
			return queryClient.invalidateQueries({
				queryKey: queryKeys.notifications.preferences(),
			});
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
