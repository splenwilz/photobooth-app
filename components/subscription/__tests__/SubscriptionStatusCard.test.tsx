/**
 * SubscriptionStatusCard tests
 *
 * Storefront contract: the card carries no management action of its own — that
 * lives in SubscriptionDetailsModal — and its Subscribe CTA appears only where
 * purchasing is permitted. These tests run with the storefront gate closed
 * (the default in this environment), so no purchase affordance may render.
 *
 * The card reads the always-200 `subscription/state` endpoint, so "never
 * subscribed" arrives as `state: "none"` data rather than a 404. It previously
 * rendered that case correctly only because it ignored `error` and fell through
 * on undefined data.
 */
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SubscriptionStatusCard } from "../SubscriptionStatusCard";
import * as payments from "@/api/payments";

// Mocks for hooks the card consumes
const mockUseBoothSubscriptionState = jest.fn();
const mockUseSubscriptionAccess = jest.fn();

jest.mock("@/api/payments", () => ({
	...jest.requireActual("@/api/payments"),
	useBoothSubscriptionState: (id: string | null) => mockUseBoothSubscriptionState(id),
	useSubscriptionAccess: () => mockUseSubscriptionAccess(),
}));

function renderWithProviders(ui: React.ReactElement) {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("SubscriptionStatusCard — Apple-compliance contract", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseSubscriptionAccess.mockReturnValue({
			data: undefined,
			isLoading: false,
		});
	});

	it("renders status, plan name and expiry — and no management action — when active", () => {
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				booth_id: "booth-1",
				booth_name: "Main Booth",
				state: "active",
				status: "active",
				is_active: true,
				current_period_end: "2026-12-31T00:00:00Z",
				cancel_at_period_end: false,
				price_id: "price_x",
				subscription_id: "sub_x",
			},
			isLoading: false,
		});

		const { getByText, queryByText } = renderWithProviders(
			<SubscriptionStatusCard boothId="booth-1" planName="Pro" />,
		);

		expect(getByText("Active")).toBeTruthy();
		expect(getByText("Pro")).toBeTruthy();
		// No in-app subscription management (Apple compliance)
		expect(queryByText("Manage Billing")).toBeNull();
	});

	it("renders no Subscribe button when unsubscribed (per-booth)", () => {
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				booth_id: "booth-1",
				booth_name: "Main Booth",
				state: "none",
				status: null,
				is_active: false,
				current_period_end: null,
				cancel_at_period_end: false,
				price_id: null,
				subscription_id: null,
			},
			isLoading: false,
		});

		const { queryByText } = renderWithProviders(
			<SubscriptionStatusCard boothId="booth-1" />,
		);

		expect(queryByText(/subscribe/i)).toBeNull();
		expect(queryByText(/upgrade/i)).toBeNull();
	});

	it("renders neutral 'No active subscription' message when unsubscribed", () => {
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				booth_id: "booth-1",
				booth_name: "Main Booth",
				state: "none",
				status: null,
				is_active: false,
				current_period_end: null,
				cancel_at_period_end: false,
				price_id: null,
				subscription_id: null,
			},
			isLoading: false,
		});

		const { getByText } = renderWithProviders(
			<SubscriptionStatusCard boothId="booth-1" />,
		);

		expect(getByText(/no active subscription/i)).toBeTruthy();
	});

	it("renders no Subscribe button when unsubscribed (user-level)", () => {
		mockUseBoothSubscriptionState.mockReturnValue({
			data: undefined,
			isLoading: false,
		});
		mockUseSubscriptionAccess.mockReturnValue({
			data: {
				has_access: false,
				subscription_status: null,
				expires_at: null,
				message: "",
			},
			isLoading: false,
		});

		const { queryByText } = renderWithProviders(<SubscriptionStatusCard />);

		expect(queryByText(/subscribe/i)).toBeNull();
		expect(queryByText(/upgrade/i)).toBeNull();
	});

	it("exposes the restored booth-checkout hook via the payments module (US-storefront flow)", () => {
		const exports = payments as unknown as Record<string, unknown>;
		expect(typeof exports.useCreateBoothCheckout).toBe("function");
	});

	it("renders no management action for past-due subscriptions", () => {
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				booth_id: "booth-1",
				booth_name: "Main Booth",
				state: "past_due",
				status: "past_due",
				is_active: false,
				current_period_end: "2026-12-31T00:00:00Z",
				cancel_at_period_end: false,
				price_id: "price_x",
				subscription_id: "sub_x",
			},
			isLoading: false,
		});

		const { getByText, queryByText } = renderWithProviders(
			<SubscriptionStatusCard boothId="booth-1" />,
		);

		expect(getByText("Past Due")).toBeTruthy();
		expect(queryByText("Manage Billing")).toBeNull();
	});

	it("lets a past_due booth open the details sheet, and does not offer Subscribe", () => {
		// The whole feature exists so a lapsed booth can be fixed. Gating the
		// chevron on is_active made the card-update screen unreachable for
		// exactly the booths that need it, and offering Subscribe instead would
		// create a SECOND subscription for a booth that already has one.
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				booth_id: "booth-1",
				booth_name: "Main Booth",
				state: "past_due",
				status: "past_due",
				is_active: false,
				current_period_end: "2026-12-31T00:00:00Z",
				cancel_at_period_end: false,
				price_id: "price_x",
				subscription_id: "sub_x",
				activation_required: false,
			},
			isLoading: false,
		});
		const onViewDetails = jest.fn();

		const { getByLabelText, queryByText } = renderWithProviders(
			<SubscriptionStatusCard boothId="booth-1" onViewDetails={onViewDetails} />,
		);

		fireEvent.press(getByLabelText("View subscription details"));
		expect(onViewDetails).toHaveBeenCalled();
		expect(queryByText("Subscribe")).toBeNull();
	});

	it("does not offer the details sheet for a booth that never subscribed", () => {
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				booth_id: "booth-1",
				booth_name: "Main Booth",
				state: "none",
				status: null,
				is_active: false,
				current_period_end: null,
				cancel_at_period_end: false,
				price_id: null,
				subscription_id: null,
				activation_required: false,
			},
			isLoading: false,
		});

		const { queryByLabelText } = renderWithProviders(
			<SubscriptionStatusCard boothId="booth-1" onViewDetails={jest.fn()} />,
		);

		expect(queryByLabelText("View subscription details")).toBeNull();
	});

	it("shows a cancelled booth as expired, not renewing", () => {
		// The card and the details sheet must agree: a cancelled subscription has
		// ended. (The sheet's matching labels are covered in its own suite.)
		// The Subscribe CTA for this state needs the storefront gate open, so it
		// is asserted in external-purchase-entry-points.test.tsx rather than here,
		// where the gate is closed.
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				booth_id: "booth-1",
				booth_name: "Main Booth",
				state: "canceled",
				status: "canceled",
				is_active: false,
				current_period_end: "2026-01-01T00:00:00Z",
				cancel_at_period_end: false,
				price_id: "price_x",
				subscription_id: "sub_x",
				activation_required: false,
			},
			isLoading: false,
		});

		const { getByText, getByLabelText, queryByText } = renderWithProviders(
			<SubscriptionStatusCard boothId="booth-1" onViewDetails={jest.fn()} />,
		);

		expect(getByText("Canceled")).toBeTruthy();
		// "Ended:", matching the sheet's "Ended on". Both now derive from the
		// shared hasSubscriptionEnded predicate rather than one reading `state`
		// and the other `status`. "Expires:" is reserved for a subscription that
		// is still running but scheduled to stop.
		expect(getByText(/Ended:/)).toBeTruthy();
		expect(queryByText(/Renews:/)).toBeNull();
		expect(queryByText(/Expires:/)).toBeNull();
		// Still reachable, so the sheet can offer the one action that applies.
		expect(getByLabelText("View subscription details")).toBeTruthy();
	});

	it("does not claim 'No Subscription' when the read failed", () => {
		// A failed fetch and "definitely not subscribed" are different facts.
		// Rendering the second for the first tells a paying customer they have
		// nothing, and offers to sell them a duplicate.
		mockUseBoothSubscriptionState.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});

		const { getByText, queryByText } = renderWithProviders(
			<SubscriptionStatusCard boothId="booth-1" />,
		);

		expect(getByText(/couldn't load/i)).toBeTruthy();
		expect(queryByText("No Subscription")).toBeNull();
		expect(queryByText("Subscribe")).toBeNull();
	});

	it("flags a paid booth that has no hardware identity on file", () => {
		// activation_required is orthogonal to billing: the booth is fully paid
		// and still will not run, and nothing on this card fixes it.
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
				booth_id: "booth-1",
				booth_name: "Main Booth",
				state: "active",
				status: "active",
				is_active: true,
				current_period_end: "2026-12-31T00:00:00Z",
				cancel_at_period_end: false,
				price_id: "price_x",
				subscription_id: "sub_x",
				activation_required: true,
			},
			isLoading: false,
		});

		const { getByText } = renderWithProviders(
			<SubscriptionStatusCard boothId="booth-1" />,
		);

		expect(getByText("Active")).toBeTruthy();
		expect(getByText(/not linked to hardware/i)).toBeTruthy();
	});

	it("does not flag activation when the booth is linked", () => {
		mockUseBoothSubscriptionState.mockReturnValue({
			data: {
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
			},
			isLoading: false,
		});

		const { queryByText } = renderWithProviders(
			<SubscriptionStatusCard boothId="booth-1" />,
		);

		expect(queryByText(/not linked to hardware/i)).toBeNull();
	});
});
