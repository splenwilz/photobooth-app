/**
 * Payments React Query Hooks
 *
 * Subscription reads plus external checkout/portal mutations. The mutations
 * may only be reached from UI gated behind useExternalPurchases() — US
 * storefront only per Guideline 3.1.1(a).
 *
 * Cache note: the reads rely on a 5-minute staleTime to pick up web-side
 * changes. The checkout mutations deliberately do NOT invalidate anything in
 * onSuccess — creating a session isn't a purchase; invalidation happens at
 * the browser-return site once the redirect confirms the outcome.
 *
 * @see https://tanstack.com/query/latest - React Query docs
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/utils/query-keys";
import {
	createBoothCheckout,
	getBoothSubscription,
	getBoothSubscriptions,
	getCustomerPortal,
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

// ============================================================================
// EXTERNAL CHECKOUT + PORTAL MUTATIONS (US storefront only)
// ============================================================================

/**
 * Create a per-booth subscription checkout session.
 *
 * No cache invalidation here — the caller invalidates subscription/booth
 * queries after the browser redirect confirms payment (or the deep-link
 * fallback does, on cold-start returns).
 *
 * @example
 * const checkout = useCreateBoothCheckout();
 * const { checkout_url } = await checkout.mutateAsync({ booth_id, price_id, success_url, cancel_url });
 */
export function useCreateBoothCheckout() {
	return useMutation({ mutationFn: createBoothCheckout });
}

/**
 * Create a Stripe customer-portal session (manage/cancel on the web).
 *
 * No invalidation — returning from the portal lands on boothiq://settings,
 * which refreshes payment queries (see use-deep-links.ts).
 */
export function useCustomerPortal() {
	return useMutation({ mutationFn: getCustomerPortal });
}
