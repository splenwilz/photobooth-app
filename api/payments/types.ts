/**
 * Payments API Types
 *
 * Type definitions for subscription read endpoints plus external (Stripe web)
 * checkout and customer-portal endpoints. Purchase initiation is US-storefront
 * only (Guideline 3.1.1(a)) — every UI entry point must be gated behind
 * useExternalPurchases(); other storefronts stay browse-only.
 *
 * @see GET /api/v1/payments/access - Check subscription access
 * @see GET /api/v1/payments/subscription - Get subscription details
 * @see POST /api/v1/booths/{booth_id}/subscription/checkout - Booth checkout
 * @see POST /api/v1/payments/portal - Get customer portal URL
 */

// ============================================================================
// SUBSCRIPTION STATUS TYPES
// ============================================================================

/**
 * Subscription status from Stripe
 */
export type SubscriptionStatus =
	| "active"
	| "trialing"
	| "past_due"
	| "canceled"
	| "unpaid"
	| "incomplete"
	| "incomplete_expired";

// ============================================================================
// SUBSCRIPTION ACCESS
// ============================================================================

/**
 * GET /api/v1/payments/access response
 *
 * Used to check if user has active subscription and can activate booths
 */
export interface SubscriptionAccessResponse {
	/** Whether user has active subscription */
	has_access: boolean;
	/** Current subscription status or null if no subscription */
	subscription_status: SubscriptionStatus | null;
	/** Subscription expiration date (ISO 8601) or null */
	expires_at: string | null;
	/** Human-readable status message */
	message: string;
}

// ============================================================================
// SUBSCRIPTION DETAILS
// ============================================================================

/**
 * GET /api/v1/payments/subscription response
 *
 * Full subscription details for display in UI
 */
export interface SubscriptionDetailsResponse {
	/** Stripe subscription ID */
	subscription_id: string;
	/** Current subscription status */
	status: SubscriptionStatus;
	/** Whether subscription is currently active */
	is_active: boolean;
	/** End of current billing period (ISO 8601) */
	current_period_end: string;
	/** Whether subscription will cancel at period end */
	cancel_at_period_end: boolean;
	/** Stripe price ID */
	price_id: string;
}

// ============================================================================
// PER-BOOTH SUBSCRIPTIONS
// ============================================================================

/**
 * Per-booth subscription status
 *
 * Used in both list endpoint and single booth subscription endpoint
 *
 * @see GET /api/v1/payments/booths/subscriptions - List all booth subscriptions
 * @see GET /api/v1/booths/{booth_id}/subscription - Get single booth subscription
 */
export interface BoothSubscriptionItem {
	/** Booth ID */
	booth_id: string;
	/** Booth name for display */
	booth_name: string;
	/** Stripe subscription ID or null if no subscription */
	subscription_id: string | null;
	/** Current subscription status or null if no subscription */
	status: SubscriptionStatus | null;
	/** Whether booth has active subscription */
	is_active: boolean;
	/** End of current billing period (ISO 8601) or null */
	current_period_end: string | null;
	/** Whether subscription will cancel at period end */
	cancel_at_period_end: boolean;
	/** Stripe price ID or null */
	price_id: string | null;
}

/**
 * GET /api/v1/payments/booths/subscriptions response
 *
 * Lists all user's booths with their subscription status
 */
export interface BoothSubscriptionsListResponse {
	/** List of booths with subscription status */
	items: BoothSubscriptionItem[];
	/** Total number of booths */
	total: number;
}

// ============================================================================
// EXTERNAL CHECKOUT (US storefront only — Stripe web checkout)
// ============================================================================

/**
 * POST /api/v1/booths/{booth_id}/subscription/checkout request
 *
 * Creates a Stripe Checkout session for a per-booth subscription.
 * success_url/cancel_url are web pages that redirect back into the app
 * via the boothiq:// scheme.
 */
export interface CreateBoothCheckoutRequest {
	/** Booth to subscribe */
	booth_id: string;
	/** Stripe price ID of the selected plan/interval */
	price_id?: string;
	/** Web URL Stripe redirects to on completed payment */
	success_url: string;
	/** Web URL Stripe redirects to on abandoned checkout */
	cancel_url: string;
	/** Optional trial period in days */
	trial_period_days?: number;
}

/**
 * Checkout session creation response (subscription checkout endpoints)
 */
export interface CreateCheckoutResponse {
	/** Whether the session was created */
	success: boolean;
	/** Stripe-hosted checkout page to open in the in-app browser */
	checkout_url: string;
	/** Stripe checkout session ID */
	session_id: string;
}

// ============================================================================
// CUSTOMER PORTAL (subscription management on the web)
// ============================================================================

/**
 * POST /api/v1/payments/portal request
 */
export interface CustomerPortalRequest {
	/** URL the portal returns to when the user is done (deep link) */
	return_url: string;
}

/**
 * POST /api/v1/payments/portal response
 */
export interface CustomerPortalResponse {
	/** Whether the portal session was created */
	success: boolean;
	/** Stripe-hosted billing portal URL */
	portal_url: string;
}
