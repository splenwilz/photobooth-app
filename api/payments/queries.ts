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

import {
	type QueryClient,
	skipToken,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/api/utils/query-keys";
import {
	cancelBoothSubscription,
	createBoothCheckout,
	createBoothPortalSession,
	getBoothSubscriptions,
	getBoothSubscriptionState,
	getCustomerPortal,
	getSubscriptionAccess,
	getSubscriptionDetails,
	resumeBoothSubscription,
} from "./services";
import type {
	BoothSubscriptionMutationResponse,
	BoothSubscriptionsListResponse,
	BoothSubscriptionStateResponse,
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

// `useBoothSubscription` (GET /booths/{id}/subscription, 404 when the booth has
// no subscription) was REMOVED in favour of `useBoothSubscriptionState` below.
//
// Keeping both meant two reads of the same booth's billing on every Settings
// mount, under two cache keys, which could disagree — and only one of them was
// ever patched after a cancel. If a caller genuinely needs the 404 endpoint,
// add it back deliberately rather than as a second default.

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
	// Non-idempotent: a retried 5xx can mint a second Stripe session.
	return useMutation({ mutationFn: createBoothCheckout, retry: false });
}

/**
 * Create a Stripe customer-portal session (manage/cancel on the web).
 *
 * No invalidation — returning from the portal lands on boothiq://settings,
 * which refreshes payment queries (see use-deep-links.ts).
 */
export function useCustomerPortal() {
	return useMutation({
		mutationFn: getCustomerPortal,
		// Non-idempotent session creation; see useCreateBoothCheckout.
		retry: false,
		// Same bearer-credential reasoning as useBoothPortalSession: reset() at
		// the call site detaches the observer, but without this the mutation —
		// and its portal_url — lingers in the cache for the default 5 minutes.
		gcTime: 0,
	});
}

// ============================================================================
// PER-BOOTH SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Hook to read one booth's subscription state.
 *
 * Always resolves for an owned booth — a booth that never subscribed reports
 * `state: "none"` as DATA, so consumers branch on state rather than swallowing
 * an error. Automatically disabled when boothId is null.
 *
 * @example
 * const { data } = useBoothSubscriptionState(boothId);
 * if (data?.state === "none") return <SubscribeCta />;
 */
export function useBoothSubscriptionState(boothId: string | null) {
	return useQuery({
		// `skipToken` rather than `enabled` + a non-null assertion: it is the
		// documented v5 pattern and it type-narrows, so `boothId!` is gone.
		// The `""` key below is still shared by every disabled instance —
		// harmless because nothing ever writes it, but not something skipToken
		// changes.
		queryKey: queryKeys.payments.boothSubscriptionState(boothId ?? ""),
		queryFn: boothId
			? () => getBoothSubscriptionState(boothId)
			: skipToken,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});
}

/**
 * Refetch every payments cache that can be affected by something that happened
 * OUTSIDE the app — a Stripe checkout, a portal session, a kiosk action.
 *
 * Use this when the outcome is only knowable server-side. It is the opposite of
 * `applyBoothBillingResult`, which is for writes we made ourselves and whose
 * response is authoritative.
 *
 * Centralised deliberately. When per-booth billing briefly lived under two keys,
 * hand-written call sites invalidated only one of them — leaving users who had
 * just paid looking at "No active subscription" until the 5-minute staleTime
 * expired. Every payments invalidation goes through here so that cannot recur.
 */
export function invalidateBoothBillingQueries(
	queryClient: QueryClient,
	boothId?: string | null,
) {
	queryClient.invalidateQueries({ queryKey: queryKeys.payments.access() });
	queryClient.invalidateQueries({
		queryKey: queryKeys.payments.subscription(),
	});
	queryClient.invalidateQueries({
		queryKey: queryKeys.payments.boothSubscriptions(),
	});

	if (boothId) {
		queryClient.invalidateQueries({
			queryKey: queryKeys.payments.boothSubscriptionState(boothId),
		});
		return;
	}

	// With no booth in hand — e.g. the boothiq://settings portal return, which
	// carries no id — invalidate the whole per-booth prefix. Returning early
	// instead is what left Settings showing a stale subscription after a web
	// portal cancel, since that screen renders from the state read.
	//
	// The `""` sentinel that disabled instances of the hook park on is NOT a
	// problem here: skipToken resolves `enabled: false`, so those queries are
	// disabled and invalidate/refetch filters them out. Verified against the
	// pinned query-core, not assumed.
	// Prefix derived from the factory, not written out by hand: a literal would
	// keep matching nothing if the factory's key ever changed, and the test
	// asserting it would stay green.
	const [scope, entity] = queryKeys.payments.boothSubscriptionState("");
	queryClient.invalidateQueries({ queryKey: [scope, entity] });
}

/**
 * Apply a cancel/resume result to every cache that shows a booth's billing.
 *
 * Writes the mutation's own response into the cache rather than refetching into
 * it, and marks the entries stale WITHOUT an immediate refetch.
 *
 * The backend applies cancel/resume synchronously and re-reads before
 * responding, so the response is authoritative. But FastAPI commits during
 * dependency teardown — after the response is written — so a refetch issued
 * immediately can land on another pooled connection microseconds before that
 * commit and read the pre-change row. That is the stale read that made a
 * cancellation look like it had not registered until the app was reloaded.
 * (It is NOT Stripe webhook lag; the webhook only reconciles afterwards.)
 *
 * Marking stale without refetching means the next natural refetch — screen
 * focus or remount — picks up the server's own row, by which time the commit
 * has long landed.
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses
 */
function applyBoothBillingResult(
	queryClient: ReturnType<typeof useQueryClient>,
	boothId: string,
	result: BoothSubscriptionMutationResponse,
) {
	// Both responses are subsets of the state shape with identical field types
	// (confirmed against the backend OpenAPI schema), so the whole result can be
	// spread over a cached entry. The one asymmetry: `state` comes back from
	// resume but NOT from cancel, so it must be preserved rather than clobbered
	// with undefined. A period-end cancel genuinely leaves `state` unchanged —
	// the subscription stays active until the period elapses.
	//
	// Narrowed with `in` rather than cast: a cast would silently accept a future
	// backend field change, which is exactly the class of drift that would
	// corrupt the cache without failing a build or a test.
	const resultState = "state" in result ? result.state : undefined;
	const common: Omit<BoothSubscriptionStateResponse, "state"> =
		"state" in result
			? (({ state: _state, ...rest }) => rest)(result)
			: result;

	queryClient.setQueryData<BoothSubscriptionStateResponse>(
		queryKeys.payments.boothSubscriptionState(boothId),
		(previous) =>
			previous
				? { ...previous, ...common, state: resultState ?? previous.state }
				: previous,
	);

	queryClient.setQueryData<BoothSubscriptionsListResponse>(
		queryKeys.payments.boothSubscriptions(),
		(previous) =>
			// Array.isArray, not just a truthy check: this runs inside onSuccess,
			// and a throw here is routed to the mutation's ERROR path — telling the
			// user "could not cancel" about a cancellation the server committed.
			previous && Array.isArray(previous.items)
				? {
						...previous,
						items: previous.items.map((item) =>
							// `common` excludes `state`, which the list rows don't carry.
							item.booth_id === boothId ? { ...item, ...common } : item,
						),
					}
				: previous,
	);

	// Mark the patched entries stale so the server's eventual truth is picked up
	// on the next mount or screen focus — but WITHOUT refetching now, which is
	// precisely the race described above.
	//
	// `access()` is included even though it cannot be patched from this
	// response: a period-end cancellation does not change account access yet, so
	// there is nothing to correct now, and refetching it immediately would sit
	// in the same commit window as the reads above. Consistent treatment beats a
	// benign-looking exception.
	for (const queryKey of [
		queryKeys.payments.boothSubscriptionState(boothId),
		queryKeys.payments.boothSubscriptions(),
		queryKeys.payments.access(),
	]) {
		queryClient.invalidateQueries({ queryKey, refetchType: "none" });
	}
}

/**
 * Schedule a booth's subscription to cancel at period end.
 *
 * Native (no Stripe web surface), so it is available on every storefront —
 * cancelling is not a call to action directing the user to a purchasing
 * mechanism. See api/__tests__/payments-queries.test.ts for the policy note.
 */
export function useCancelBoothSubscription() {
	const queryClient = useQueryClient();
	return useMutation({
		// No retry: this is a non-idempotent POST with no idempotency key, so a
		// retry after a 5xx that the server had already applied would send the
		// write twice. The global default retries mutations once.
		retry: false,
		mutationFn: ({ boothId }: { boothId: string }) =>
			cancelBoothSubscription(boothId),
		onSuccess: (data, { boothId }) =>
			applyBoothBillingResult(queryClient, boothId, data),
	});
}

/**
 * Clear a scheduled cancellation before the period elapses.
 *
 * Conflicts surface as `ApiError.code` — `period_elapsed`,
 * `not_scheduled_to_cancel`, `no_subscription`, `stripe_unavailable` — so the
 * caller can route each one instead of showing a generic failure.
 */
export function useResumeBoothSubscription() {
	const queryClient = useQueryClient();
	return useMutation({
		// See cancel: non-idempotent POST, no idempotency key.
		retry: false,
		mutationFn: ({ boothId }: { boothId: string }) =>
			resumeBoothSubscription(boothId),
		onSuccess: (data, { boothId }) =>
			applyBoothBillingResult(queryClient, boothId, data),
	});
}

/**
 * Mint a per-booth Stripe portal session deep-linked to a single flow.
 *
 * A mutation rather than a query on purpose: `portal_url` is a bearer
 * credential and query results are cached. No invalidation here — creating a
 * session changes nothing; the caller refreshes when the browser closes,
 * because Stripe may show its own confirmation page instead of redirecting to
 * `return_url`.
 */
export function useBoothPortalSession() {
	return useMutation({
		mutationFn: createBoothPortalSession,
		// Non-idempotent session creation; see useCreateBoothCheckout.
		retry: false,
		// `portal_url` is a bearer credential. gcTime alone does NOT evict it —
		// a mutation is only collected once it has no observers, and the sheet
		// that owns this one never unmounts. The call site calls `.reset()` once
		// the URL has been handed to the browser; this is defence in depth for
		// any future caller that does unmount.
		gcTime: 0,
	});
}
