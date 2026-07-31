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

/** Server default and the page size the UI advertises when truncating. */
export const DEFAULT_INVOICE_LIMIT = 12;
import type {
	BoothSubscriptionItem,
	BoothSubscriptionsListResponse,
	BoothSubscriptionStateResponse,
	CancelBoothSubscriptionResponse,
	CreateBoothCheckoutRequest,
	CreateBoothPortalRequest,
	CreateBoothPortalResponse,
	CreateCheckoutResponse,
	CustomerPortalRequest,
	CustomerPortalResponse,
	OwnerInvoiceListResponse,
	ResumeBoothSubscriptionResponse,
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

// `getBoothSubscription` (GET /booths/{id}/subscription) was REMOVED — it 404s
// when a booth has no subscription, which models a normal state as a failure.
// Use `getBoothSubscriptionState` below, which always returns 200.

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
		`/api/v1/booths/${encodeURIComponent(data.booth_id)}/subscription/checkout`,
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

// ============================================================================
// PER-BOOTH SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Get one booth's subscription state.
 *
 * Always 200 for an owned booth — a booth with no subscription reports
 * `state: "none"` rather than 404, so "never subscribed" arrives as data
 * instead of a fetch failure.
 */
export async function getBoothSubscriptionState(
	boothId: string,
): Promise<BoothSubscriptionStateResponse> {
	if (!boothId)
		throw new Error("Booth ID is required for getBoothSubscriptionState");
	return apiClient<BoothSubscriptionStateResponse>(
		`/api/v1/booths/${encodeURIComponent(boothId)}/subscription/state`,
		{ method: "GET" },
	);
}

/**
 * Mint a Stripe portal session deep-linked to one action on one booth's
 * subscription.
 *
 * `booth_id` travels in the path and the subscription is resolved server-side,
 * so the request body carries only `flow` and `return_url`. The returned
 * `portal_url` is a bearer credential — hand it straight to the browser.
 */
export async function createBoothPortalSession(
	data: CreateBoothPortalRequest,
): Promise<CreateBoothPortalResponse> {
	if (!data.booth_id)
		throw new Error("Booth ID is required for createBoothPortalSession");
	return apiClient<CreateBoothPortalResponse>(
		`/api/v1/booths/${encodeURIComponent(data.booth_id)}/subscription/portal`,
		{
			method: "POST",
			body: JSON.stringify({
				flow: data.flow,
				return_url: data.return_url,
			}),
		},
	);
}

/**
 * Schedule a booth's subscription to cancel at period end.
 *
 * `cancel_immediately` is pinned to `false` and deliberately not a parameter.
 * An immediate cancel invalidates the booth's signed licence at once and can
 * stop a booth mid-event, so the app must not be able to request one — the
 * booth-side flow is hard-wired to period-end for the same reason.
 */
export async function cancelBoothSubscription(
	boothId: string,
): Promise<CancelBoothSubscriptionResponse> {
	if (!boothId)
		throw new Error("Booth ID is required for cancelBoothSubscription");
	// A QUERY PARAMETER, not a body field — the endpoint declares no requestBody,
	// so a JSON body is silently discarded. Sent explicitly rather than relying
	// on the server default so the intent is visible in logs and tests.
	return apiClient<CancelBoothSubscriptionResponse>(
		`/api/v1/booths/${encodeURIComponent(boothId)}/subscription/cancel?cancel_immediately=false`,
		{ method: "POST" },
	);
}

/**
 * Clear a scheduled cancellation, before the period actually elapses.
 *
 * Conflicts arrive as `ApiError.code`: `period_elapsed` (offer checkout
 * instead), `not_scheduled_to_cancel` (nothing to undo), `no_subscription`,
 * `stripe_unavailable` (retryable).
 */
export async function resumeBoothSubscription(
	boothId: string,
): Promise<ResumeBoothSubscriptionResponse> {
	if (!boothId)
		throw new Error("Booth ID is required for resumeBoothSubscription");
	return apiClient<ResumeBoothSubscriptionResponse>(
		`/api/v1/booths/${encodeURIComponent(boothId)}/subscription/resume`,
		{ method: "POST" },
	);
}

/**
 * Read a booth's payment history, live from Stripe.
 *
 * Served `Cache-Control: no-store` and carrying receipt links that act as
 * bearer URLs, so responses are held in memory only — never persisted, never
 * logged.
 *
 * A `404` means the booth is not yours or does not exist — and, until the
 * backend deploys this endpoint, that it is not deployed. It NEVER means "no
 * invoices": an owner with none gets `200` with an empty array.
 *
 * @param limit 1–100, default 12. Out of range is a 422.
 * @param startingAfter cursor from a previous page's `next_cursor`. A bad
 * cursor is a non-retryable 400 — restart from the first page.
 */
export async function getBoothInvoices(
	boothId: string,
	{ limit = DEFAULT_INVOICE_LIMIT, startingAfter }: {
		limit?: number;
		startingAfter?: string;
	} = {},
): Promise<OwnerInvoiceListResponse> {
	if (!boothId) throw new Error("Booth ID is required for getBoothInvoices");
	const query = new URLSearchParams({ limit: String(limit) });
	if (startingAfter) query.set("starting_after", startingAfter);
	return apiClient<OwnerInvoiceListResponse>(
		`/api/v1/booths/${encodeURIComponent(boothId)}/invoices?${query.toString()}`,
		{ method: "GET" },
	);
}
