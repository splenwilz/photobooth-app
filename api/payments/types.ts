/**
 * Payments API Types
 *
 * Type definitions for subscription read + manage endpoints. Checkout
 * (purchase initiation) types are deliberately absent — the iOS app does
 * not initiate purchases per Apple compliance.
 *
 * @see GET /api/v1/payments/access - Check subscription access
 * @see GET /api/v1/payments/subscription - Get subscription details
 * @see POST /api/v1/payments/subscription/cancel - Cancel subscription
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
// CANCEL SUBSCRIPTION
// ============================================================================

/**
 * POST /api/v1/payments/subscription/cancel response
 *
 * Returns updated subscription state after cancellation request
 */
export interface CancelSubscriptionResponse {
	/** Stripe subscription ID */
	subscription_id: string;
	/** Current subscription status */
	status: SubscriptionStatus;
	/** Whether subscription is still active */
	is_active: boolean;
	/** End of current billing period (ISO 8601) */
	current_period_end: string;
	/** Whether subscription will cancel at period end (usually true after cancel) */
	cancel_at_period_end: boolean;
	/** Stripe price ID */
	price_id: string;
}

// ============================================================================
// CUSTOMER PORTAL
// ============================================================================

/**
 * POST /api/v1/payments/portal request body
 */
export interface CustomerPortalRequest {
	/** URL to return to after portal session */
	return_url: string;
}

/**
 * POST /api/v1/payments/portal response
 */
export interface CustomerPortalResponse {
	/** Whether portal session was created successfully */
	success: boolean;
	/** Stripe customer portal URL */
	portal_url: string;
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
