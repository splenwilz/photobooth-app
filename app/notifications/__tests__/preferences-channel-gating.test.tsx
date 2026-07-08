/**
 * Preferences screen — offered-channel gating (email cost control).
 *
 * Email must render a toggle ONLY where the backend offers it (key present in
 * `channels`). Operational events omit `email` → no email toggle, so users can
 * never enable email we don't want (SendGrid quota protection).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react-native";
import React from "react";
import PreferencesScreen from "../preferences";

jest.mock("@/components/custom-header", () => ({ CustomHeader: () => null }));
jest.mock("@/api/push/queries", () => ({
	useRegisterDevice: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/utils/push-notifications", () => ({
	getPushPermissionState: jest.fn().mockResolvedValue("granted"),
	acquireExpoPushToken: jest.fn(),
}));
jest.mock("@/api/notifications/queries", () => ({
	useNotificationPreferences: () => ({
		data: {
			preferences: [
				{
					event_type: "booth_offline",
					label: "Booth Offline",
					description: "A booth stopped reporting",
					category: "booth",
					enabled: false,
					channels: { push: true }, // operational → email NOT offered
				},
				{
					event_type: "payment_failed",
					label: "Payment Failed",
					description: "A subscription payment failed",
					category: "billing",
					enabled: true,
					channels: { email: true, push: true }, // record-worthy → email offered
				},
			],
		},
		isLoading: false,
		error: null,
		refetch: jest.fn(),
	}),
	useUpdateChannelPreference: () => ({ mutate: jest.fn() }),
}));

function renderScreen() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={qc}>
			<PreferencesScreen />
		</QueryClientProvider>,
	);
}

describe("Preferences — email-only (push is system-controlled)", () => {
	it("shows an email toggle for email-offered events", async () => {
		const { getByLabelText } = renderScreen();
		await waitFor(() =>
			expect(
				getByLabelText("Email notifications for Payment Failed"),
			).toBeTruthy(),
		);
	});

	it("hides operational events entirely (no email offered → nothing to configure)", async () => {
		const { getByLabelText, queryByText } = renderScreen();
		await waitFor(() =>
			expect(
				getByLabelText("Email notifications for Payment Failed"),
			).toBeTruthy(),
		);
		expect(queryByText("Booth Offline")).toBeNull();
	});

	it("renders no push toggles anywhere (push is not a user choice)", async () => {
		const { getByLabelText, queryByLabelText } = renderScreen();
		await waitFor(() =>
			expect(
				getByLabelText("Email notifications for Payment Failed"),
			).toBeTruthy(),
		);
		expect(
			queryByLabelText("Push notifications for Payment Failed"),
		).toBeNull();
		expect(queryByLabelText("Push notifications for Booth Offline")).toBeNull();
	});
});
