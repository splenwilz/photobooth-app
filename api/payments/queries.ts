/**
 * Payments React Query Hooks
 *
 * Hooks for fetching and mutating subscription/payment data.
 *
 * @see https://tanstack.com/query/latest - React Query docs
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/utils/query-keys";
import {
	cancelBoothSubscription,
	cancelSubscription,
	createBoothCheckout,
	createSubscriptionCheckout,
	getBoothSubscription,
	getBoothSubscriptions,
	getCustomerPortal,
	getSubscriptionAccess,
	getSubscriptionDetails,
} from "./services";
import type {
	CreateBoothCheckoutRequest,
	CreateCheckoutRequest,
	CustomerPortalRequest,
} from "./types";

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
			if (error && 'status' in error && error.status === 404) {
				return false;
			}
			return failureCount < 3;
		},
	});
}

/**
 * Hook to create subscription checkout session
 *
 * Creates a Stripe checkout session. On success, open the checkout_url
 * in the browser using Linking.openURL().
 *
 * @returns Mutation for creating checkout
 *
 * @example
 * const { mutate, isPending } = useCreateCheckout();
 *
 * const handleSubscribe = () => {
 *   mutate({
 *     success_url: Linking.createURL('payment-success'),
 *     cancel_url: Linking.createURL('payment-cancel'),
 *   }, {
 *     onSuccess: (data) => Linking.openURL(data.checkout_url),
 *   });
 * };
 */
export function useCreateCheckout() {
	return useMutation({
		mutationFn: (data: CreateCheckoutRequest) =>
			createSubscriptionCheckout(data),
	});
}

/**
 * Hook to cancel subscription
 *
 * Cancels the user's subscription. Invalidates subscription queries on success.
 *
 * @returns Mutation for cancelling subscription
 *
 * @example
 * const { mutate, isPending } = useCancelSubscription();
 *
 * const handleCancel = () => {
 *   mutate(false, { // false = cancel at period end
 *     onSuccess: () => Alert.alert('Subscription will cancel at end of period'),
 *   });
 * };
 */
export function useCancelSubscription() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (cancelImmediately?: boolean) =>
			cancelSubscription(cancelImmediately ?? false),
		onSuccess: () => {
			// Invalidate subscription queries to refetch updated status
			queryClient.invalidateQueries({
				queryKey: queryKeys.payments.access(),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.payments.subscription(),
			});
		},
	});
}

/**
 * Hook to get customer portal URL
 *
 * Creates a Stripe customer portal session. On success, open the portal_url
 * in the browser using Linking.openURL().
 *
 * @returns Mutation for getting portal URL
 *
 * @example
 * const { mutate, isPending } = useCustomerPortal();
 *
 * const handleManageBilling = () => {
 *   mutate({ return_url: Linking.createURL('settings') }, {
 *     onSuccess: (data) => Linking.openURL(data.portal_url),
 *   });
 * };
 */
export function useCustomerPortal() {
	return useMutation({
		mutationFn: (data: CustomerPortalRequest) => getCustomerPortal(data),
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

/**
 * Hook to create booth subscription checkout session
 *
 * Creates a Stripe checkout session for a specific booth.
 * On success, open the checkout_url in the browser.
 *
 * @returns Mutation for creating booth checkout
 *
 * @example
 * const { mutate, isPending } = useCreateBoothCheckout();
 *
 * const handleSubscribe = (boothId: string) => {
 *   mutate({
 *     booth_id: boothId,
 *     success_url: "https://example.com/success",
 *     cancel_url: "https://example.com/cancel",
 *   }, {
 *     onSuccess: (data) => Linking.openURL(data.checkout_url),
 *   });
 * };
 */
export function useCreateBoothCheckout() {
	return useMutation({
		mutationFn: (data: CreateBoothCheckoutRequest) => createBoothCheckout(data),
	});
}

/**
 * Hook to cancel booth subscription
 *
 * Cancels subscription for a specific booth. Invalidates subscription queries on success.
 *
 * @returns Mutation for cancelling booth subscription
 *
 * @example
 * const { mutate, isPending } = useCancelBoothSubscription();
 *
 * const handleCancel = (boothId: string) => {
 *   mutate({ boothId, immediately: false }, {
 *     onSuccess: () => Alert.alert('Subscription will cancel at end of period'),
 *   });
 * };
 */
export function useCancelBoothSubscription() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			boothId,
			immediately = false,
		}: {
			boothId: string;
			immediately?: boolean;
		}) => cancelBoothSubscription(boothId, immediately),
		onSuccess: (_, variables) => {
			// Invalidate booth subscription queries to refetch updated status
			queryClient.invalidateQueries({
				queryKey: queryKeys.payments.boothSubscriptions(),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.payments.boothSubscription(variables.boothId),
			});
		},
	});
}
