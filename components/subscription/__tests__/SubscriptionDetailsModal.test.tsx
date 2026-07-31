/**
 * SubscriptionDetailsModal behaviour
 *
 * The modal is the per-booth management surface: it replaces sending users to
 * the account-wide Stripe portal, where every booth appears as an identical
 * "BoothIQ Pro — $29.00" row with its own Cancel button and no safe way to tell
 * them apart.
 *
 * Storefront gating for these actions is covered in
 * external-purchase-entry-points.test.tsx; this file covers what they do.
 */
import React from "react";
import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SubscriptionDetailsModal } from "../SubscriptionDetailsModal";

const mockUseBoothSubscriptionState = jest.fn();
const mockUseSubscriptionDetails = jest.fn();
const mockCancelMutate = jest.fn();
const mockResumeMutate = jest.fn();

jest.mock("@/api/payments", () => ({
	...jest.requireActual("@/api/payments"),
	useBoothSubscriptionState: (id: string | null) =>
		mockUseBoothSubscriptionState(id),
	useSubscriptionDetails: (enabled?: boolean) =>
		mockUseSubscriptionDetails(enabled),
	useCancelBoothSubscription: () => ({
		mutate: mockCancelMutate,
		isPending: false,
	}),
	useResumeBoothSubscription: () => ({
		mutate: mockResumeMutate,
		isPending: false,
	}),
	useBoothPortalSession: () => ({ mutate: jest.fn(), isPending: false }),
}));

const mockUseExternalPurchases = jest.fn();
jest.mock("@/hooks/use-external-purchases", () => ({
	useExternalPurchases: () => mockUseExternalPurchases(),
}));

const activeBooth = {
	booth_id: "booth-1",
	booth_name: "Main Booth",
	state: "active" as const,
	status: "active" as const,
	is_active: true,
	current_period_end: "2026-12-31T00:00:00Z",
	cancel_at_period_end: false,
	price_id: "price_x",
	subscription_id: "sub_x",
	activation_required: false,
};

function renderWithProviders(ui: React.ReactElement) {
	const qc = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false, gcTime: 0 },
		},
	});
	return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
	jest.clearAllMocks();
	mockUseSubscriptionDetails.mockReturnValue({
		data: undefined,
		isLoading: false,
		error: null,
	});
	mockUseBoothSubscriptionState.mockReturnValue({
		data: activeBooth,
		isLoading: false,
		error: null,
	});
	// Closed by default; individual tests open it where the storefront gate is
	// not the thing under test.
	mockUseExternalPurchases.mockReturnValue({
		enabled: false,
		isLoading: false,
	});
});

describe("read-only details", () => {
	it("shows renewal state without exposing raw Stripe identifiers", () => {
		const { getByText, queryByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		expect(getByText("Auto-Renewal")).toBeTruthy();
		// Raw Stripe IDs are support-desk material, not user information.
		expect(queryByText("Subscription ID")).toBeNull();
		expect(queryByText("sub_x")).toBeNull();
	});
});

describe("cancellation", () => {
	it("confirms before cancelling, and names the date access actually stops", () => {
		const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

		const { getByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		fireEvent.press(getByText("Cancel subscription"));

		// Nothing is cancelled on the first press — a mis-tap must not end a
		// booth's subscription.
		expect(mockCancelMutate).not.toHaveBeenCalled();
		expect(alertSpy).toHaveBeenCalled();
		const [, body] = alertSpy.mock.calls[0];
		expect(body).toMatch(/Dec 31, 2026/);
		expect(body).toMatch(/undo/i);

		alertSpy.mockRestore();
	});

	it("cancels at period end once confirmed", () => {
		const alertSpy = jest
			.spyOn(Alert, "alert")
			.mockImplementation((_t, _m, buttons) => {
				// Press the destructive confirmation.
				const confirm = buttons?.find((b) => b.style === "destructive");
				confirm?.onPress?.();
			});

		const { getByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		fireEvent.press(getByText("Cancel subscription"));

		expect(mockCancelMutate).toHaveBeenCalledWith(
			{ boothId: "booth-1" },
			expect.any(Object),
		);

		alertSpy.mockRestore();
	});

	it("does not stack confirmation dialogs on a double tap", () => {
		// The real race: the confirmation is async, so `isMutating` is still false
		// while it is on screen. Two dialogs both confirming would send two POSTs,
		// and MutationObserver overwrites per-call callbacks — so the first call's
		// onError gets replaced by the second's and a failure can be reported as
		// success. The dialog itself is what has to be guarded.
		const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {
			// Deliberately does NOT confirm: the dialog stays open.
		});

		const { getByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		const button = getByText("Cancel subscription");
		fireEvent.press(button);
		fireEvent.press(button);
		fireEvent.press(button);

		expect(alertSpy).toHaveBeenCalledTimes(1);
		expect(mockCancelMutate).not.toHaveBeenCalled();

		alertSpy.mockRestore();
	});

	it("maps a cancel failure to actionable copy instead of raw backend prose", () => {
		const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
		mockCancelMutate.mockImplementation((_vars, opts) => {
			opts?.onError?.(
				Object.assign(new Error("Subscription unavailable in Stripe"), {
					code: "stripe_unavailable",
				}),
			);
		});

		const { getByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		// First alert is the confirmation; confirm it, then read the error alert.
		alertSpy.mockImplementation((_t, _m, buttons) => {
			buttons?.find((b) => b.style === "destructive")?.onPress?.();
		});
		fireEvent.press(getByText("Cancel subscription"));

		const errorCall = alertSpy.mock.calls.find(([title]) => title === "Error");
		expect(errorCall?.[1]).toMatch(/temporarily unavailable/i);
		expect(errorCall?.[1]).not.toMatch(/Stripe/);

		alertSpy.mockRestore();
	});

});

// Rendering rules per subscription state — what the sheet SAYS, as opposed to
// what the cancellation flow DOES.
describe("lifecycle states", () => {
	it("offers Resume instead of Cancel when a cancellation is already scheduled", () => {
		mockUseBoothSubscriptionState.mockReturnValue({
			data: { ...activeBooth, cancel_at_period_end: true },
			isLoading: false,
			error: null,
		});

		const { getByText, queryByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		expect(getByText("Resume subscription")).toBeTruthy();
		expect(queryByText("Cancel subscription")).toBeNull();
		// The sheet also explains what "Off" means for the user.
		expect(getByText("Off")).toBeTruthy();
	});

	it("shows an explicit empty state for a booth that never subscribed", () => {
		// state: "none" must not render the details card (placeholder dashes),
		// but it must not render NOTHING either — an earlier version left an
		// empty sheet under the header, and a test asserted that was correct.
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				...activeBooth,
				state: "none",
				status: null,
				subscription_id: null,
				is_active: false,
				current_period_end: null,
			},
			isLoading: false,
			error: null,
		});

		const { getByText, queryByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		expect(getByText("No subscription")).toBeTruthy();
		expect(queryByText("Auto-Renewal")).toBeNull();
		expect(queryByText("Cancel subscription")).toBeNull();
	});

	it("describes a cancelled subscription as ended, not renewing", () => {
		// The sheet used to read "Renews on <date>" / "Auto-Renewal: On" for a
		// booth the card one tap away described as expired.
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				...activeBooth,
				state: "canceled",
				status: "canceled",
				is_active: false,
				cancel_at_period_end: false,
			},
			isLoading: false,
			error: null,
		});

		const { getByText, queryByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		expect(getByText("Ended on")).toBeTruthy();
		expect(queryByText("Renews on")).toBeNull();
		expect(getByText("Off")).toBeTruthy();
	});

	it("still calls a past_due subscription renewing, matching the card", () => {
		// past_due is inactive but has NOT ended — Stripe retries it, so the
		// period end is a renewal date and auto-renewal is still on. Keying the
		// "ended" flag on !is_active made the sheet say "Ended on / Off" for a
		// booth the card describes as "Renews:".
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				...activeBooth,
				state: "past_due",
				status: "past_due",
				is_active: false,
				cancel_at_period_end: false,
			},
			isLoading: false,
			error: null,
		});

		const { getByText, queryByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		expect(getByText("Renews on")).toBeTruthy();
		expect(queryByText("Ended on")).toBeNull();
		expect(getByText("On")).toBeTruthy();
	});

	it("does not say a already-ended subscription 'will end'", () => {
		// cancel_at_period_end can still be true once the period has elapsed. The
		// scheduled-cancellation notice then read "Your subscription will end on
		// <past date>. You can resubscribe anytime" directly above "Ended on" —
		// future tense about a date that has passed, next to an invitation the
		// off-US sheet cannot honour.
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				...activeBooth,
				state: "canceled",
				status: "canceled",
				is_active: false,
				cancel_at_period_end: true,
			},
			isLoading: false,
			error: null,
		});

		const { getByText, queryByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		expect(queryByText(/will end on/i)).toBeNull();
		expect(queryByText(/resubscribe anytime/i)).toBeNull();
		expect(getByText("Ended on")).toBeTruthy();
		// And no Resume, which would 409 on an elapsed period.
		expect(queryByText("Resume subscription")).toBeNull();
	});

	it("keeps Resume for a past_due booth still scheduled to cancel", () => {
		// Reachable Stripe sequence: user schedules cancellation, then the current
		// period's renewal invoice fails. status becomes past_due, is_active goes
		// false, cancel_at_period_end stays true, period end is still in the
		// future — and resume legitimately succeeds. Gating Resume on is_active
		// hid it, leaving that booth with no management action at all.
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				...activeBooth,
				state: "past_due",
				status: "past_due",
				is_active: false,
				cancel_at_period_end: true,
			},
			isLoading: false,
			error: null,
		});

		const { getByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		expect(getByText("Resume subscription")).toBeTruthy();
	});

	it("explains itself when no action is available, rather than going silent", () => {
		// This suite runs with the storefront gate CLOSED, so card update and
		// Subscribe are unavailable. A past_due booth with no scheduled
		// cancellation then has no action at all — previously it rendered a
		// status pill and a date row and nothing else, which is the state that
		// most needs an explanation.
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				...activeBooth,
				state: "past_due",
				status: "past_due",
				is_active: false,
				cancel_at_period_end: false,
			},
			isLoading: false,
			error: null,
		});

		const { getByText, queryByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		expect(getByText(/needs attention/i)).toBeTruthy();
		expect(queryByText("Cancel subscription")).toBeNull();
		expect(queryByText("Resume subscription")).toBeNull();
	});

	it("keeps the sheet usable when a background refetch fails", () => {
		// A failed BACKGROUND refetch keeps `data` and sets `error`. Blanking the
		// sheet then hides the status, the dates and every action from a user who
		// is looking at perfectly good content — and it is reachable from the
		// refresh fired when the card-update browser closes.
		mockUseBoothSubscriptionState.mockReturnValue({
			data: activeBooth,
			isLoading: false,
			error: new Error("Network request failed"),
		});

		const { getByText, queryByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		// Discriminating assertions: under the old `&& !error` gating the details
		// block and every action disappeared, leaving only the error card.
		expect(getByText("Auto-Renewal")).toBeTruthy();
		expect(getByText("Cancel subscription")).toBeTruthy();
		expect(getByText("Renews on")).toBeTruthy();
		expect(queryByText("Close")).toBeNull();
	});

	it("renders a real label for statuses the sheet has no case for", () => {
		// The old switch echoed the raw enum, so a booth in `unpaid` showed
		// "unpaid" to the user while the status card showed "Unpaid".
		mockUseBoothSubscriptionState.mockReturnValue({
			data: { ...activeBooth, state: "unpaid", status: "unpaid" },
			isLoading: false,
			error: null,
		});

		const { getByText, queryByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		expect(getByText("Unpaid")).toBeTruthy();
		expect(queryByText("unpaid")).toBeNull();
	});

	it("hides Cancel for a booth with no active subscription", () => {
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				...activeBooth,
				state: "canceled",
				status: "canceled",
				is_active: false,
			},
			isLoading: false,
			error: null,
		});

		const { queryByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		expect(queryByText("Cancel subscription")).toBeNull();
	});
});

describe("card update", () => {
	it("hides the card-update button for a cancelled subscription", () => {
		// Minting payment_method_update against a dead subscription returns
		// flow_not_available / no_subscription — a button guaranteed to fail.
		//
		// Gate OPEN on purpose: with it closed this test passed because of the
		// storefront, not because of the cancelled-state predicate it names.
		mockUseExternalPurchases.mockReturnValue({
			enabled: true,
			isLoading: false,
		});
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				...activeBooth,
				state: "canceled",
				status: "canceled",
				is_active: false,
				cancel_at_period_end: false,
			},
			isLoading: false,
			error: null,
		});

		const { queryByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		expect(queryByText("Update payment card")).toBeNull();
	});
});

describe("resume", () => {
	it("clears the scheduled cancellation", () => {
		mockUseBoothSubscriptionState.mockReturnValue({
			data: { ...activeBooth, cancel_at_period_end: true },
			isLoading: false,
			error: null,
		});

		const { getByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		fireEvent.press(getByText("Resume subscription"));

		expect(mockResumeMutate).toHaveBeenCalledWith(
			{ boothId: "booth-1" },
			expect.any(Object),
		);
	});

	it("routes a period_elapsed conflict to re-subscribing rather than an error", () => {
		mockUseBoothSubscriptionState.mockReturnValue({
			data: { ...activeBooth, cancel_at_period_end: true },
			isLoading: false,
			error: null,
		});
		const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
		// The mutation reports the conflict through its onError callback.
		mockResumeMutate.mockImplementation((_vars, opts) => {
			opts?.onError?.(
				Object.assign(new Error("Subscription already ended"), {
					code: "period_elapsed",
				}),
			);
		});

		const { getByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		fireEvent.press(getByText("Resume subscription"));

		const [title] = alertSpy.mock.calls[0];
		expect(title).toMatch(/already ended/i);

		alertSpy.mockRestore();
	});

	it("silently refreshes when the cancellation was already undone elsewhere", () => {
		mockUseBoothSubscriptionState.mockReturnValue({
			data: { ...activeBooth, cancel_at_period_end: true },
			isLoading: false,
			error: null,
		});
		const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
		mockResumeMutate.mockImplementation((_vars, opts) => {
			opts?.onError?.(
				Object.assign(new Error("Nothing to undo"), {
					code: "not_scheduled_to_cancel",
				}),
			);
		});

		const { getByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		fireEvent.press(getByText("Resume subscription"));

		// Our view was stale, not the user's fault — no error dialog.
		expect(alertSpy).not.toHaveBeenCalled();

		alertSpy.mockRestore();
	});
});
