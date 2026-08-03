/**
 * Per-booth subscription management surface.
 *
 * Backend contract: the 2026-07-30 second-release Integration Notes plus
 * docs/per-booth-billing-gap-analysis.md.
 *
 * Two contracts here are load-bearing and deliberately asserted:
 *
 * 1. `cancelBoothSubscription` ALWAYS sends `cancel_immediately: false` and
 *    exposes no parameter to change it. An immediate cancel invalidates the
 *    booth's signed licence at once and can stop a booth mid-event, so the
 *    app must not be able to request one even by mistake.
 * 2. `createBoothPortalSession` sends no `subscription_id`. The backend
 *    resolves it from `booth_id`, which is what stops a flow being pointed
 *    at another customer's subscription.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";

jest.mock("@/api/client", () => ({
	apiClient: jest.fn(),
}));

import { apiClient } from "@/api/client";
import {
	cancelBoothSubscription,
	createBoothPortalSession,
	getBoothSubscriptionState,
	resumeBoothSubscription,
} from "@/api/payments/services";
import {
	useBoothPortalSession,
	useBoothSubscriptionState,
	useCancelBoothSubscription,
	useResumeBoothSubscription,
} from "@/api/payments/queries";
import { queryKeys } from "@/api/utils/query-keys";

const mockApiClient = apiClient as jest.Mock;

function makeClient({ gcTime = 0 }: { gcTime?: number } = {}) {
	// gcTime defaults to 0 so no GC timers keep the Jest process alive. Tests
	// that seed the cache directly must raise it: an entry with no observer is
	// collected immediately at 0, so setQueryData would appear to do nothing.
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime },
			mutations: { retry: false, gcTime: 0 },
		},
	});
}

function makeWrapper(client: QueryClient) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
	};
}

const STATE_FIXTURE = {
	booth_id: "booth-1",
	booth_name: "Lobby Booth",
	state: "active" as const,
	subscription_id: "sub_123",
	status: "active" as const,
	is_active: true,
	current_period_end: "2026-08-30T00:00:00Z",
	cancel_at_period_end: false,
	price_id: "price_123",
	activation_required: false,
};

beforeEach(() => {
	jest.clearAllMocks();
});

describe("services — exact backend endpoints", () => {
	it("getBoothSubscriptionState GETs the always-200 state endpoint", async () => {
		mockApiClient.mockResolvedValue(STATE_FIXTURE);

		await getBoothSubscriptionState("booth-1");

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-1/subscription/state",
			{ method: "GET" },
		);
	});

	it("getBoothSubscriptionState rejects an empty boothId before calling out", async () => {
		await expect(getBoothSubscriptionState("")).rejects.toThrow(
			/Booth ID is required/i,
		);
		expect(mockApiClient).not.toHaveBeenCalled();
	});

	it("createBoothPortalSession POSTs flow + return_url and NO subscription_id", async () => {
		mockApiClient.mockResolvedValue({
			success: true,
			portal_url: "https://billing.stripe.com/p/session/test",
			flow: "payment_method_update",
			booth_id: "booth-1",
		});

		await createBoothPortalSession({
			booth_id: "booth-1",
			flow: "payment_method_update",
			return_url: "https://app.boothiq.com/booths/booth-1/billing",
		});

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-1/subscription/portal",
			{
				method: "POST",
				body: JSON.stringify({
					flow: "payment_method_update",
					return_url: "https://app.boothiq.com/booths/booth-1/billing",
				}),
			},
		);

		const body = JSON.parse(mockApiClient.mock.calls[0][1].body);
		expect(body).not.toHaveProperty("subscription_id");
		expect(body).not.toHaveProperty("booth_id");
		expect(body).not.toHaveProperty("configuration");
	});

	it("cancels at period end via the query parameter, never a body", async () => {
		// The endpoint declares cancel_immediately as a QUERY parameter and has
		// no requestBody at all, so a JSON body is silently discarded — which
		// would leave the destructive default resting on the server's default
		// rather than on anything this client says.
		mockApiClient.mockResolvedValue({ ...STATE_FIXTURE, cancel_at_period_end: true });

		await cancelBoothSubscription("booth-1");

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-1/subscription/cancel?cancel_immediately=false",
			{ method: "POST" },
		);
		expect(mockApiClient.mock.calls[0][1]).not.toHaveProperty("body");
	});

	it("offers no way to request an immediate cancel", async () => {
		// An immediate cancel drops the booth's access inline, mid-event. Assert
		// the REQUEST rather than the function's arity, which would break the
		// moment a default parameter is added and proves nothing about the wire.
		mockApiClient.mockResolvedValue({ ...STATE_FIXTURE, cancel_at_period_end: true });

		await cancelBoothSubscription("booth-1");

		const url = mockApiClient.mock.calls[0][0] as string;
		expect(url).toContain("cancel_immediately=false");
		expect(url).not.toContain("cancel_immediately=true");
	});

	it("resumeBoothSubscription POSTs to the resume endpoint", async () => {
		mockApiClient.mockResolvedValue({
			subscription_id: "sub_123",
			status: "active",
			cancel_at_period_end: false,
			current_period_end: "2026-08-30T00:00:00Z",
		});

		await resumeBoothSubscription("booth-1");

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-1/subscription/resume",
			{ method: "POST" },
		);
	});
});

describe("useBoothSubscriptionState", () => {
	it("is disabled while boothId is null", () => {
		const client = makeClient();
		const { result } = renderHook(() => useBoothSubscriptionState(null), {
			wrapper: makeWrapper(client),
		});

		expect(result.current.fetchStatus).toBe("idle");
		expect(mockApiClient).not.toHaveBeenCalled();
	});

	it("returns state: 'none' as data rather than an error", async () => {
		mockApiClient.mockResolvedValue({
			...STATE_FIXTURE,
			state: "none",
			subscription_id: null,
			status: null,
			is_active: false,
			current_period_end: null,
			cancel_at_period_end: false,
			price_id: null,
		});

		const client = makeClient();
		const { result } = renderHook(
			() => useBoothSubscriptionState("booth-1"),
			{ wrapper: makeWrapper(client) },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.state).toBe("none");
		expect(result.current.error).toBeNull();
	});

	it("surfaces activation_required so a paid-but-unrunnable booth can be flagged", async () => {
		mockApiClient.mockResolvedValue({
			...STATE_FIXTURE,
			activation_required: true,
		});

		const client = makeClient();
		const { result } = renderHook(
			() => useBoothSubscriptionState("booth-1"),
			{ wrapper: makeWrapper(client) },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.activation_required).toBe(true);
		expect(result.current.data?.is_active).toBe(true);
	});
});

describe("state-changing mutations invalidate caches", () => {
	// Distinct from checkout/portal session creation: cancel and resume change
	// server state synchronously, so the caches must be refreshed immediately
	// rather than at a browser-return site.
	it.each([
		["cancel", useCancelBoothSubscription],
		["resume", useResumeBoothSubscription],
	] as const)(
		"%s invalidates the booth state, fleet list and access caches",
		async (_label, hook) => {
			// Distinct shapes: cancel returns the record MINUS `state`, resume
			// returns it including `state`. Sharing one fixture meant the resume
			// case never proved the response's state reaches the cache.
			const isCancel = _label === "cancel";
			const { state: _omitted, ...cancelShape } = {
				...STATE_FIXTURE,
				cancel_at_period_end: true,
			};
			const resumeShape = {
				...STATE_FIXTURE,
				state: "trialing" as const,
				cancel_at_period_end: true,
			};
			mockApiClient.mockResolvedValue(isCancel ? cancelShape : resumeShape);

			const client = makeClient({ gcTime: 60_000 });
			// Seed both caches so the patch has something to act on — an unseeded
			// cache makes setQueryData a no-op and the assertions vacuous.
			client.setQueryData(
				queryKeys.payments.boothSubscriptionState("booth-1"),
				STATE_FIXTURE,
			);
			client.setQueryData(queryKeys.payments.boothSubscriptions(), {
				items: [{ ...STATE_FIXTURE }],
				total: 1,
			});
			const spy = jest.spyOn(client, "invalidateQueries");
			const { result } = renderHook(() => hook(), {
				wrapper: makeWrapper(client),
			});

			await act(async () => {
				await result.current.mutateAsync({ boothId: "booth-1" });
			});

			await waitFor(() => expect(spy).toHaveBeenCalled());

			// The response is written into both caches, and `state` — absent from
			// the cancel response — is preserved rather than clobbered.
			const patched = client.getQueryData(
				queryKeys.payments.boothSubscriptionState("booth-1"),
			) as typeof STATE_FIXTURE;
			expect(patched.cancel_at_period_end).toBe(true);
			// Cancel must PRESERVE the cached state (its response omits the
			// field); resume must WRITE the state its response carries.
			expect(patched.state).toBe(isCancel ? STATE_FIXTURE.state : "trialing");

			const list = client.getQueryData(
				queryKeys.payments.boothSubscriptions(),
			) as { items: (typeof STATE_FIXTURE)[] };
			expect(list.items[0].cancel_at_period_end).toBe(true);
			expect(list.items[0].booth_id).toBe("booth-1");

			const invalidated = spy.mock.calls.map((c) =>
				JSON.stringify(c[0]?.queryKey),
			);
			expect(invalidated).toContain(
				JSON.stringify(queryKeys.payments.boothSubscriptionState("booth-1")),
			);
			expect(invalidated).toContain(
				JSON.stringify(queryKeys.payments.boothSubscriptions()),
			);
			expect(invalidated).toContain(
				JSON.stringify(queryKeys.payments.access()),
			);
		},
	);
});

describe("useBoothPortalSession", () => {
	it("returns the portal url without writing it into the query cache", async () => {
		const portalUrl = "https://billing.stripe.com/p/session/secret-bearer";
		mockApiClient.mockResolvedValue({
			success: true,
			portal_url: portalUrl,
			flow: "payment_method_update",
			booth_id: "booth-1",
		});

		const client = makeClient();
		const { result } = renderHook(() => useBoothPortalSession(), {
			wrapper: makeWrapper(client),
		});

		let response!: Awaited<ReturnType<typeof result.current.mutateAsync>>;
		await act(async () => {
			response = await result.current.mutateAsync({
				booth_id: "booth-1",
				flow: "payment_method_update",
				return_url: "https://app.boothiq.com/booths/booth-1/billing",
			});
		});

		expect(response.portal_url).toBe(portalUrl);

		// The session URL is a bearer credential, and the MUTATION cache is where
		// it lingers — mutations retain state.data until collected, and gcTime
		// alone does not evict one that still has an observer. So it IS resident
		// until the caller drops it, which is what the real call sites do:
		expect(
			JSON.stringify(client.getMutationCache().getAll()),
		).toContain("secret-bearer");

		act(() => result.current.reset());

		await waitFor(() => {
			expect(
				JSON.stringify(client.getMutationCache().getAll()),
			).not.toContain("secret-bearer");
		});
	});
});
