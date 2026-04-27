/**
 * SubscriptionStatusCard tests
 *
 * Apple-compliance contract: the card MUST NOT render any "Subscribe" CTA
 * for unsubscribed users. It may show a "Manage Billing" button only when
 * the user has an active subscription (Stripe customer portal access is
 * allowed for managing existing subscriptions).
 */
import React from "react";
import { render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SubscriptionStatusCard } from "../SubscriptionStatusCard";
import * as payments from "@/api/payments";

// Mocks for hooks the card consumes
const mockUseBoothSubscription = jest.fn();
const mockUseSubscriptionAccess = jest.fn();
const mockUseCustomerPortal = jest.fn(() => ({
	mutate: jest.fn(),
	isPending: false,
}));

jest.mock("@/api/payments", () => ({
	...jest.requireActual("@/api/payments"),
	useBoothSubscription: (id: string | null) => mockUseBoothSubscription(id),
	useSubscriptionAccess: () => mockUseSubscriptionAccess(),
	useCustomerPortal: () => mockUseCustomerPortal(),
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

	it("renders status, plan name, expiry, and Manage Billing when active", () => {
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

		const { getByText } = renderWithProviders(
			<SubscriptionStatusCard boothId="booth-1" planName="Pro" />,
		);

		expect(getByText("Active")).toBeTruthy();
		expect(getByText("Pro")).toBeTruthy();
		expect(getByText("Manage Billing")).toBeTruthy();
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

	it("renders Manage Billing for past-due subscriptions (recovery path)", () => {
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

		const { getByText } = renderWithProviders(
			<SubscriptionStatusCard boothId="booth-1" />,
		);

		expect(getByText("Past Due")).toBeTruthy();
		expect(getByText("Manage Billing")).toBeTruthy();
	});
});
