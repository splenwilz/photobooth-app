/**
 * Payments API Services
 *
 * Service functions for subscription and payment operations.
 *
 * @see GET /api/v1/payments/access - Check subscription access
 * @see GET /api/v1/payments/subscription - Get subscription details
 * @see POST /api/v1/payments/checkout/subscription - Create checkout session
 * @see POST /api/v1/payments/subscription/cancel - Cancel subscription
 * @see POST /api/v1/payments/portal - Get customer portal URL
 */

import { apiClient } from "../client";
import type {
	BoothSubscriptionItem,
	BoothSubscriptionsListResponse,
	CancelSubscriptionResponse,
	CreateBoothCheckoutRequest,
	CreateCheckoutRequest,
	CreateCheckoutResponse,
	CustomerPortalRequest,
	CustomerPortalResponse,
	SubscriptionAccessResponse,
	SubscriptionDetailsResponse,
} from "./types";

/**
 * Check subscription access
 *
 * Used to determine if user can activate booths and access premium features.
 *
 * @returns Subscription access status
 *
 * @example
 * const access = await getSubscriptionAccess();
 * if (access.has_access) {
 *   // User can activate booths
 * }
 */
export async function getSubscriptionAccess(): Promise<SubscriptionAccessResponse> {
	const response = await apiClient<SubscriptionAccessResponse>(
		"/api/v1/payments/access",
		{ method: "GET" },
	);
	return response;
}

/**
 * Get subscription details
 *
 * Returns full subscription information for display in UI.
 * May return 404 if user has no subscription.
 *
 * @returns Subscription details
 *
 * @example
 * const subscription = await getSubscriptionDetails();
 * console.log(subscription.current_period_end);
 */
export async function getSubscriptionDetails(): Promise<SubscriptionDetailsResponse> {
	const response = await apiClient<SubscriptionDetailsResponse>(
		"/api/v1/payments/subscription",
		{ method: "GET" },
	);
	return response;
}

/**
 * Create subscription checkout session
 *
 * Creates a Stripe checkout session and returns the URL to redirect user to.
 * User completes payment on Stripe, then is redirected to success_url or cancel_url.
 *
 * @param data - Checkout configuration with URLs
 * @returns Checkout session with URL
 *
 * @example
 * const checkout = await createSubscriptionCheckout({
 *   success_url: "boothiq://payment-success",
 *   cancel_url: "boothiq://payment-cancel",
 * });
 * Linking.openURL(checkout.checkout_url);
 */
export async function createSubscriptionCheckout(
	data: CreateCheckoutRequest,
): Promise<CreateCheckoutResponse> {
	const response = await apiClient<CreateCheckoutResponse>(
		"/api/v1/payments/checkout/subscription",
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
	return response;
}

/**
 * Cancel subscription
 *
 * Cancels the user's subscription. By default, cancels at end of billing period.
 * Set cancel_immediately=true to cancel right away.
 *
 * @param cancelImmediately - If true, cancels immediately instead of at period end
 * @returns Updated subscription state
 *
 * @example
 * // Cancel at end of period (default)
 * const result = await cancelSubscription();
 *
 * // Cancel immediately
 * const result = await cancelSubscription(true);
 */
export async function cancelSubscription(
	cancelImmediately = false,
): Promise<CancelSubscriptionResponse> {
	const url = `/api/v1/payments/subscription/cancel${cancelImmediately ? "?cancel_immediately=true" : ""}`;
	const response = await apiClient<CancelSubscriptionResponse>(url, {
		method: "POST",
	});
	return response;
}

/**
 * Get customer portal URL
 *
 * Creates a Stripe customer portal session where users can manage
 * their payment methods, view invoices, and update billing info.
 *
 * @param data - Portal configuration with return URL
 * @returns Portal session with URL
 *
 * @example
 * const portal = await getCustomerPortal({ return_url: "boothiq://settings" });
 * Linking.openURL(portal.portal_url);
 */
export async function getCustomerPortal(
	data: CustomerPortalRequest,
): Promise<CustomerPortalResponse> {
	const response = await apiClient<CustomerPortalResponse>(
		"/api/v1/payments/portal",
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
	return response;
}

// ============================================================================
// PER-BOOTH SUBSCRIPTION SERVICES
// ============================================================================

/**
 * Get all booth subscriptions for user
 *
 * Returns all user's booths with their subscription status.
 * Booths without subscriptions will have is_active: false and null subscription fields.
 *
 * @returns List of booths with subscription status
 *
 * @example
 * const { items } = await getBoothSubscriptions();
 * items.forEach(booth => {
 *   console.log(`${booth.booth_name}: ${booth.is_active ? 'Active' : 'No subscription'}`);
 * });
 */
export async function getBoothSubscriptions(): Promise<BoothSubscriptionsListResponse> {
	const response = await apiClient<BoothSubscriptionsListResponse>(
		"/api/v1/payments/booths/subscriptions",
		{ method: "GET" },
	);
	return response;
}

/**
 * Get single booth subscription status
 *
 * Returns subscription details for a specific booth.
 *
 * @param boothId - Booth ID to get subscription for
 * @returns Booth subscription status
 *
 * @example
 * const subscription = await getBoothSubscription("booth-123");
 * if (subscription.is_active) {
 *   console.log("Booth has active subscription");
 * }
 */
export async function getBoothSubscription(
	boothId: string,
): Promise<BoothSubscriptionItem> {
	if (!boothId) throw new Error("Booth ID is required for getBoothSubscription");
	const response = await apiClient<BoothSubscriptionItem>(
		`/api/v1/booths/${boothId}/subscription`,
		{ method: "GET" },
	);
	return response;
}

/**
 * Create checkout session for booth subscription
 *
 * Creates a Stripe checkout session for a specific booth.
 * User completes payment on Stripe, then subscription is linked to booth via webhook.
 *
 * @param data - Checkout configuration with booth ID and URLs
 * @returns Checkout session with URL
 *
 * @example
 * const checkout = await createBoothCheckout({
 *   booth_id: "booth-123",
 *   success_url: "https://example.com/success",
 *   cancel_url: "https://example.com/cancel",
 * });
 * Linking.openURL(checkout.checkout_url);
 */
export async function createBoothCheckout(
	data: CreateBoothCheckoutRequest,
): Promise<CreateCheckoutResponse> {
	const response = await apiClient<CreateCheckoutResponse>(
		`/api/v1/booths/${data.booth_id}/subscription/checkout`,
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
	return response;
}

/**
 * Cancel booth subscription
 *
 * Cancels subscription for a specific booth. By default, cancels at end of billing period.
 *
 * @param boothId - Booth ID to cancel subscription for
 * @param cancelImmediately - If true, cancels immediately instead of at period end
 * @returns Updated booth subscription state
 *
 * @example
 * // Cancel at end of period (default)
 * const result = await cancelBoothSubscription("booth-123");
 *
 * // Cancel immediately
 * const result = await cancelBoothSubscription("booth-123", true);
 */
export async function cancelBoothSubscription(
	boothId: string,
	cancelImmediately = false,
): Promise<BoothSubscriptionItem> {
	const url = `/api/v1/booths/${boothId}/subscription/cancel${cancelImmediately ? "?cancel_immediately=true" : ""}`;
	const response = await apiClient<BoothSubscriptionItem>(url, {
		method: "POST",
	});
	return response;
}
