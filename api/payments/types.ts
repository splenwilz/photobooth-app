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
	/**
	 * True when the booth has no hardware identity on file — paid but unable
	 * to run. Optional because the field post-dates this type; treat a missing
	 * value as "not flagged" rather than assuming false is authoritative.
	 */
	activation_required?: boolean;
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
	/**
	 * URL the portal returns to when the user is done. Must be an absolute
	 * https:// URL — the backend forwards it verbatim to Stripe, which
	 * rejects custom schemes. Use a website page; the in-app browser closing
	 * brings the user back to the app.
	 */
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

// ============================================================================
// PER-BOOTH SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Booth subscription lifecycle state.
 *
 * Distinct from `SubscriptionStatus`: this is the backend's own mapping, which
 * always resolves to one of these six values. An unmapped Stripe status
 * reports `past_due`, never `none`, so a paying booth is never rendered as
 * unsubscribed.
 */
export type BoothSubscriptionState =
	| "none"
	| "active"
	| "trialing"
	| "past_due"
	| "unpaid"
	| "canceled";

/**
 * GET /api/v1/booths/{booth_id}/subscription/state response
 *
 * Always 200 for an owned booth, including one with no subscription. Prefer
 * this over `GET /booths/{booth_id}/subscription`, which returns 404 when
 * there is no subscription and therefore models a normal state as a failure.
 */
export interface BoothSubscriptionStateResponse {
	/** Booth ID */
	booth_id: string;
	/** Booth name for display */
	booth_name: string;
	/** Lifecycle state — `none` when the booth has never subscribed */
	state: BoothSubscriptionState;
	/** Stripe subscription ID or null */
	subscription_id: string | null;
	/** Raw Stripe status or null */
	status: SubscriptionStatus | null;
	/** Whether the booth has an active subscription */
	is_active: boolean;
	/** End of current billing period (ISO 8601) or null */
	current_period_end: string | null;
	/** Whether the subscription will cancel at period end */
	cancel_at_period_end: boolean;
	/** Stripe price ID or null */
	price_id: string | null;
	/**
	 * True when the booth has no hardware identity on file. Such a booth can
	 * be fully paid and still refuse to run; it is fixed by re-linking the
	 * booth, not by anything billing-related.
	 */
	activation_required: boolean;
}

/**
 * Stripe `flow_data` deep-link targets exposed by the backend.
 *
 * @see https://docs.stripe.com/customer-management/portal-deep-links
 */
export type BoothPortalFlow =
	| "payment_method_update"
	| "subscription_cancel"
	| "subscription_update";

/**
 * POST /api/v1/booths/{booth_id}/subscription/portal request
 *
 * No `subscription_id`: the backend resolves it from `booth_id`, which is what
 * prevents a flow being pointed at another subscription.
 */
export interface CreateBoothPortalRequest {
	/** Booth whose subscription the flow targets (path parameter) */
	booth_id: string;
	/** Which Stripe flow to deep-link into */
	flow: BoothPortalFlow;
	/**
	 * Absolute https URL to return to. Validated server-side against a host
	 * allowlist — an off-domain value is rejected with `422
	 * invalid_return_url` rather than forwarded to Stripe.
	 */
	return_url: string;
}

/**
 * POST /api/v1/booths/{booth_id}/subscription/portal response
 */
export interface CreateBoothPortalResponse {
	/** Whether the session was created */
	success: boolean;
	/**
	 * Stripe-hosted URL, deep-linked to `flow`.
	 *
	 * A bearer credential: redirect to it, never log, cache or persist it.
	 */
	portal_url: string;
	/** Echoes the requested flow */
	flow: BoothPortalFlow;
	/** Echoes the booth */
	booth_id: string;
}

/**
 * `POST .../subscription/cancel` response — the full booth subscription record
 * WITHOUT `state`.
 *
 * Confirmed against the backend OpenAPI schema, not inferred. The omission is
 * the one real trap in these two shapes: anything derived from `state` is left
 * stale by a cancel, so cancelled-ness must be read from `cancel_at_period_end`.
 */
export type CancelBoothSubscriptionResponse = Omit<
	BoothSubscriptionStateResponse,
	"state"
>;

/**
 * `POST .../subscription/resume` response — identical to the state read,
 * `state` included.
 */
export type ResumeBoothSubscriptionResponse = BoothSubscriptionStateResponse;

/**
 * What the cache-patching helper accepts. Both shapes are subsets of the state
 * response with identical field types, so either can be spread over a cached
 * entry safely.
 */
export type BoothSubscriptionMutationResponse =
	| CancelBoothSubscriptionResponse
	| ResumeBoothSubscriptionResponse;

/**
 * Machine-readable conflict codes returned by the per-booth billing endpoints.
 * Surfaced on `ApiError.code` so each can be routed to different UI.
 */
const BOOTH_BILLING_ERROR_CODES = [
	"period_elapsed",
	"not_scheduled_to_cancel",
	"no_subscription",
	"booth_not_found",
	"flow_not_available",
	"stripe_unavailable",
	"invalid_return_url",
] as const;

/**
 * Derived from the array above so the two cannot drift: adding a code in one
 * place and forgetting the other is impossible.
 */
export type BoothBillingErrorCode = (typeof BOOTH_BILLING_ERROR_CODES)[number];

/**
 * Narrow an arbitrary error code to one this app actually routes on.
 *
 * `ApiError.code` is a permissive extraction — a single-word `detail` such as
 * `"unauthorized"` parses as a code. Gating the UI on this guard rather than on
 * raw string comparison means such values fall through to the generic error
 * path instead of matching a branch by accident, and a typo in a branch label
 * becomes a compile error rather than dead code.
 */
export function isBoothBillingErrorCode(
	code: string | undefined,
): code is BoothBillingErrorCode {
	return (
		code !== undefined &&
		(BOOTH_BILLING_ERROR_CODES as readonly string[]).includes(code)
	);
}
