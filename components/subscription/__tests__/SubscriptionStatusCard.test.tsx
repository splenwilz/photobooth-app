/**
 * SubscriptionStatusCard tests
 *
 * Apple-compliance contract: the card is READ-ONLY. It MUST NOT render any
 * "Subscribe" CTA for unsubscribed users, and MUST NOT render any subscription
 * management action ("Manage Billing"). Managing/canceling a subscription
 * happens on the web. The card only displays status, plan and renewal/expiry.
 */
import React from "react";
import { render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SubscriptionStatusCard } from "../SubscriptionStatusCard";
import * as payments from "@/api/payments";

// Mocks for hooks the card consumes
const mockUseBoothSubscription = jest.fn();
const mockUseSubscriptionAccess = jest.fn();

jest.mock("@/api/payments", () => ({
	...jest.requireActual("@/api/payments"),
	useBoothSubscription: (id: string | null) => mockUseBoothSubscription(id),
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
		mockUseBoothSubscription.mockReturnValue({
			data: {
				booth_id: "booth-1",
				booth_name: "Main Booth",
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
		mockUseBoothSubscription.mockReturnValue({
			data: {
				booth_id: "booth-1",
				booth_name: "Main Booth",
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
		mockUseBoothSubscription.mockReturnValue({
			data: {
				booth_id: "booth-1",
				booth_name: "Main Booth",
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
		mockUseBoothSubscription.mockReturnValue({
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

	it("does not import or expose the deleted purchase hooks via the payments module", () => {
		const exports = payments as unknown as Record<string, unknown>;
		expect(exports.useCreateCheckout).toBeUndefined();
		expect(exports.useCreateBoothCheckout).toBeUndefined();
	});

	it("renders no management action for past-due subscriptions", () => {
		mockUseBoothSubscription.mockReturnValue({
			data: {
				booth_id: "booth-1",
				booth_name: "Main Booth",
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
});
