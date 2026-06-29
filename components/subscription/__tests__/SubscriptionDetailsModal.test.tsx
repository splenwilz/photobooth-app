/**
 * SubscriptionDetailsModal tests
 *
 * Apple-compliance contract: the modal is READ-ONLY. It shows subscription
 * details (status, renewal date, auto-renewal, subscription id) but MUST NOT
 * render any management action — no "Manage Payment Method" and no
 * "Cancel Subscription". Management happens on the web.
 */
import React from "react";
import { render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SubscriptionDetailsModal } from "../SubscriptionDetailsModal";

const mockUseBoothSubscription = jest.fn();
const mockUseSubscriptionDetails = jest.fn();

jest.mock("@/api/payments", () => ({
	...jest.requireActual("@/api/payments"),
	useBoothSubscription: (id: string | null) => mockUseBoothSubscription(id),
	useSubscriptionDetails: (enabled?: boolean) =>
		mockUseSubscriptionDetails(enabled),
}));

function renderWithProviders(ui: React.ReactElement) {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("SubscriptionDetailsModal — Apple-compliance contract", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseSubscriptionDetails.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null,
		});
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
			error: null,
		});
	});

	it("shows read-only details and no management actions", () => {
		const { getByText, queryByText } = renderWithProviders(
			<SubscriptionDetailsModal visible boothId="booth-1" onClose={() => {}} />,
		);

		// Read-only details are present
		expect(getByText("Auto-Renewal")).toBeTruthy();
		expect(getByText("Subscription ID")).toBeTruthy();

		// Management actions are not allowed in-app (Apple compliance)
		expect(queryByText("Manage Payment Method")).toBeNull();
		expect(queryByText("Cancel Subscription")).toBeNull();
	});
});
