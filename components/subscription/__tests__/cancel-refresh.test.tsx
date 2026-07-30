/**
 * Cancelling must update the sheet without an app reload.
 *
 * Unlike the other modal tests, this one does NOT mock the payments hooks — it
 * mocks only the HTTP client, so the real useQuery/useMutation wiring runs.
 * A hook-level mock cannot catch an invalidation that never reaches the query
 * that is actually on screen.
 *
 * Reported symptom: after confirming a cancellation the sheet kept showing
 * "Renews on" / the Cancel button, and only a full app reload revealed
 * "Ends on" / "Resume subscription".
 */
import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("@/api/client", () => ({ apiClient: jest.fn() }));
jest.mock("@/hooks/use-external-purchases", () => ({
	useExternalPurchases: () => ({ enabled: false, isLoading: false }),
}));

import { apiClient } from "@/api/client";
import { SubscriptionDetailsModal } from "../SubscriptionDetailsModal";

const mockApiClient = apiClient as jest.Mock;

const ACTIVE = {
	booth_id: "booth-1",
	booth_name: "Main Booth",
	state: "active",
	status: "active",
	is_active: true,
	current_period_end: "2026-12-31T00:00:00Z",
	cancel_at_period_end: false,
	price_id: "price_x",
	subscription_id: "sub_x",
	activation_required: false,
};

const CANCELLING = { ...ACTIVE, cancel_at_period_end: true };

function renderModal() {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false, gcTime: 0 },
		},
	});
	return render(
		<QueryClientProvider client={client}>
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />
		</QueryClientProvider>,
	);
}

/** Auto-confirm the destructive button in the cancel confirmation. */
function autoConfirmAlert() {
	return jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
		buttons?.find((b) => b.style === "destructive")?.onPress?.();
	});
}

beforeEach(() => jest.clearAllMocks());

it("reflects the cancellation in the open sheet, with no reload", async () => {
	const alertSpy = autoConfirmAlert();

	// The happy path: the backend has applied the change by the time it is read
	// again. (The lagging-read case is the test below; both must look the same
	// to the user.)
	let cancelled = false;
	mockApiClient.mockImplementation((path: string) => {
		if (path.startsWith("/api/v1/booths/booth-1/subscription/cancel")) {
			cancelled = true;
			return Promise.resolve({
				subscription_id: "sub_x",
				status: "active",
				cancel_at_period_end: true,
				current_period_end: "2026-12-31T00:00:00Z",
			});
		}
		return Promise.resolve(cancelled ? CANCELLING : ACTIVE);
	});

	const { getByText, queryByText } = renderModal();

	await waitFor(() => expect(getByText("Renews on")).toBeTruthy());

	fireEvent.press(getByText("Cancel subscription"));

	// Updates from the mutation's own response — the sheet must not wait on a
	// second read, and must not need a remount.
	await waitFor(() => expect(getByText("Ends on")).toBeTruthy());
	expect(getByText("Resume subscription")).toBeTruthy();
	expect(queryByText("Cancel subscription")).toBeNull();
	expect(getByText("Off")).toBeTruthy();

	alertSpy.mockRestore();
});

it("cancels at period end so a booth cannot be killed mid-event", async () => {
	const alertSpy = autoConfirmAlert();
	mockApiClient.mockImplementation((path: string) =>
		Promise.resolve(
			path.startsWith("/api/v1/booths/booth-1/subscription/cancel")
				? { ...CANCELLING }
				: ACTIVE,
		),
	);

	const { getByText } = renderModal();
	await waitFor(() => expect(getByText("Renews on")).toBeTruthy());
	fireEvent.press(getByText("Cancel subscription"));

	await waitFor(() => {
		const call = mockApiClient.mock.calls.find(([path]) =>
			(path as string).startsWith("/api/v1/booths/booth-1/subscription/cancel"),
		);
		expect(call).toBeTruthy();
		// Query parameter, not a body — the endpoint reads no requestBody.
		expect(call![0]).toContain("cancel_immediately=false");
		expect(call![1]).not.toHaveProperty("body");
	});

	alertSpy.mockRestore();
});

it("keeps `state` when cancelling, since the cancel response omits it", async () => {
	// The cancel response is the full record MINUS `state`. Spreading it blindly
	// would overwrite the cached `state` with undefined, and the card branches on
	// `state` to decide whether a booth is subscribed at all.
	const alertSpy = autoConfirmAlert();
	const { state: _omitted, ...cancelResponse } = { ...CANCELLING };
	mockApiClient.mockImplementation((path: string) =>
		Promise.resolve(
			path.startsWith("/api/v1/booths/booth-1/subscription/cancel")
				? cancelResponse
				: ACTIVE,
		),
	);

	const { getByText } = renderModal();
	await waitFor(() => expect(getByText("Renews on")).toBeTruthy());
	fireEvent.press(getByText("Cancel subscription"));

	// A booth whose `state` was clobbered to undefined would fall out of the
	// details layout entirely; it must still render as a live subscription.
	await waitFor(() => expect(getByText("Ends on")).toBeTruthy());
	expect(getByText("Resume subscription")).toBeTruthy();

	alertSpy.mockRestore();
});

it("still shows the cancellation when the server read lags behind the write", async () => {
	// The cancel POST returns the authoritative new state, but
	// GET /subscription/state can still report the OLD value for a moment if
	// the backend only applies the change when Stripe's
	// customer.subscription.updated webhook lands. Refetching and taking that
	// answer would overwrite what we just successfully wrote, and the sheet
	// would snap back to "Renews on" — the reported symptom.
	const alertSpy = autoConfirmAlert();

	mockApiClient.mockImplementation((path: string, opts?: { method?: string }) => {
		if (path.startsWith("/api/v1/booths/booth-1/subscription/cancel")) {
			return Promise.resolve({
				subscription_id: "sub_x",
				status: "active",
				cancel_at_period_end: true,
				current_period_end: "2026-12-31T00:00:00Z",
			});
		}
		// The read stays stale for the whole test.
		if (opts?.method === "GET") return Promise.resolve(ACTIVE);
		return Promise.resolve({});
	});

	const { getByText, queryByText } = renderModal();

	await waitFor(() => expect(getByText("Renews on")).toBeTruthy());

	fireEvent.press(getByText("Cancel subscription"));

	await waitFor(() => expect(getByText("Ends on")).toBeTruthy());
	expect(getByText("Resume subscription")).toBeTruthy();
	expect(queryByText("Cancel subscription")).toBeNull();

	alertSpy.mockRestore();
});
