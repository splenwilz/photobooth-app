/**
 * Payments API Services
 *
 * Subscription reads plus external (Stripe web) checkout and customer-portal
 * session creation. Checkout/portal may only be REACHED from UI gated behind
 * useExternalPurchases() — US storefront only per Guideline 3.1.1(a); all
 * other storefronts stay browse-only.
 *
 * @see GET /api/v1/payments/access - Check subscription access
 * @see GET /api/v1/payments/subscription - Get subscription details
 * @see GET /api/v1/payments/booths/subscriptions - List booth subscriptions
 * @see GET /api/v1/booths/{boothId}/subscription - Get booth subscription
 * @see POST /api/v1/booths/{boothId}/subscription/checkout - Booth checkout
 * @see POST /api/v1/payments/portal - Customer portal session
 */

import { apiClient } from "../client";
import type {
	BoothSubscriptionItem,
	BoothSubscriptionsListResponse,
	CreateBoothCheckoutRequest,
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

// ============================================================================
// EXTERNAL CHECKOUT + PORTAL (US storefront only)
// ============================================================================

/**
 * Create a Stripe Checkout session for a per-booth subscription.
 *
 * The returned checkout_url is opened in the in-app browser; the outcome
 * comes back via the success/cancel redirect (see use-deep-links.ts).
 */
export async function createBoothCheckout(
	data: CreateBoothCheckoutRequest,
): Promise<CreateCheckoutResponse> {
	const response = await apiClient<CreateCheckoutResponse>(
		`/api/v1/booths/${data.booth_id}/subscription/checkout`,
		{ method: "POST", body: JSON.stringify(data) },
	);
	return response;
}

/**
 * Create a Stripe customer-portal session for managing/canceling
 * subscriptions on the web.
 */
export async function getCustomerPortal(
	data: CustomerPortalRequest,
): Promise<CustomerPortalResponse> {
	return apiClient<CustomerPortalResponse>("/api/v1/payments/portal", {
		method: "POST",
		body: JSON.stringify(data),
	});
}
