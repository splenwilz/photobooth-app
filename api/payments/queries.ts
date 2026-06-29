/**
 * Payments React Query Hooks
 *
 * Hooks for READING subscription state only. Purchase initiation AND
 * subscription management (cancel, billing portal) are intentionally absent —
 * the iOS app neither initiates purchases nor manages subscriptions per Apple
 * compliance. Users manage/cancel on the web.
 *
 * Cache note: nothing in-app mutates subscription state, so there are no
 * invalidations here — these reads intentionally rely on a 5-minute staleTime
 * to pick up web-side changes (cancel/upgrade reflect within that window).
 *
 * @see https://tanstack.com/query/latest - React Query docs
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/utils/query-keys";
import {
	getBoothSubscription,
	getBoothSubscriptions,
	getSubscriptionAccess,
	getSubscriptionDetails,
} from "./services";

/**
 * Hook to check subscription access
 *
 * Used to determine if user can activate booths.
 * This is a lightweight check that should be called frequently.
 *
 * @returns Query result with access status
 *
 * @example
 * const { data, isLoading } = useSubscriptionAccess();
 * if (data?.has_access) {
 *   // Show activate booth button
 * }
 */
export function useSubscriptionAccess() {
	return useQuery({
		queryKey: queryKeys.payments.access(),
		queryFn: getSubscriptionAccess,
		staleTime: 5 * 60 * 1000, // 5 minutes - subscription status doesn't change often
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
}

/**
 * Hook to get full subscription details
 *
 * Returns detailed subscription info for display in settings/billing UI.
 * Only enabled when user has an active subscription.
 *
 * @param enabled - Whether to fetch (default true)
 * @returns Query result with subscription details
 *
 * @example
 * const { data, isLoading, error } = useSubscriptionDetails();
 * // error with status 404 means no subscription
 */
export function useSubscriptionDetails(enabled = true) {
	return useQuery({
		queryKey: queryKeys.payments.subscription(),
		queryFn: getSubscriptionDetails,
		enabled,
		staleTime: 5 * 60 * 1000,
		retry: (failureCount, error) => {
			// Don't retry 404 errors (no subscription)
			if (
				typeof error === "object" &&
				error !== null &&
				"status" in error &&
				(error as { status: number }).status === 404
			) {
				return false;
			}
			return failureCount < 3;
		},
	});
}

// ============================================================================
// PER-BOOTH SUBSCRIPTION HOOKS
// ============================================================================

/**
 * Hook to get all booth subscriptions for user
 *
 * Returns all user's booths with their subscription status.
 * Useful for showing subscription badges on booth list.
 *
 * @returns Query result with list of booth subscriptions
 *
 * @example
 * const { data } = useBoothSubscriptions();
 * const activeBooths = data?.items.filter(b => b.is_active);
 */
export function useBoothSubscriptions() {
	return useQuery({
		queryKey: queryKeys.payments.boothSubscriptions(),
		queryFn: getBoothSubscriptions,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
}

/**
 * Hook to get single booth subscription status
 *
 * Returns subscription details for a specific booth.
 * Automatically disabled when boothId is null.
 *
 * @param boothId - Booth ID to get subscription for (null to disable)
 * @returns Query result with booth subscription status
 *
 * @example
 * const { data, isLoading } = useBoothSubscription(selectedBoothId);
 * if (data?.is_active) {
 *   // Booth has active subscription
 * }
 */
export function useBoothSubscription(boothId: string | null) {
	return useQuery({
		queryKey: queryKeys.payments.boothSubscription(boothId ?? ""),
		queryFn: () => getBoothSubscription(boothId!),
		enabled: !!boothId,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});
}
