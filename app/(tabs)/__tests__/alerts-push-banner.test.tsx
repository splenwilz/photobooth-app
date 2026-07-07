/**
 * Alerts screen — push-permission banner behavior.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Linking from "expo-linking";
import React from "react";
import AlertsScreen from "../alerts";
import { getPushPermissionState } from "@/utils/push-notifications";

jest.mock("@react-navigation/native", () => ({ useIsFocused: () => true }));

jest.mock("@/api/alerts/queries", () => {
	const emptyAlerts = {
		data: { alerts: [], summary: { critical: 0, warning: 0, info: 0 } },
		isLoading: false,
		error: null,
		refetch: jest.fn(),
		isRefetching: false,
	};
	return {
		useAlerts: () => emptyAlerts,
		useBoothAlerts: () => emptyAlerts,
		useMarkAlertRead: () => ({ mutate: jest.fn() }),
		useMarkAllAlertsRead: () => ({ mutate: jest.fn(), isPending: false }),
	};
});
jest.mock("@/api/push/queries", () => ({
	useRegisterDevice: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/utils/push-notifications", () => ({
	getPushPermissionState: jest.fn(),
	acquireExpoPushToken: jest.fn(),
}));
jest.mock("@/stores/booth-store", () => ({
	ALL_BOOTHS_ID: "all",
	useBoothStore: () => ({ selectedBoothId: "all" }),
}));

const mockState = getPushPermissionState as jest.Mock;
const mockOpenSettings = Linking.openSettings as jest.Mock;

function renderScreen() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={qc}>
			<AlertsScreen />
		</QueryClientProvider>,
	);
}

describe("Alerts push-permission banner", () => {
	beforeEach(() => jest.clearAllMocks());

	it("shows the 'notifications are off' banner and opens Settings when denied", async () => {
		mockState.mockResolvedValue("denied");
		const { getByText } = renderScreen();

		await waitFor(() => expect(getByText("Notifications are off")).toBeTruthy());

		fireEvent.press(getByText("Notifications are off"));
		await waitFor(() => expect(mockOpenSettings).toHaveBeenCalled());
	});

	it("hides the banner when permission is granted", async () => {
		mockState.mockResolvedValue("granted");
		const { queryByText } = renderScreen();

		await waitFor(() => expect(mockState).toHaveBeenCalled());
		expect(queryByText("Notifications are off")).toBeNull();
		expect(queryByText("Turn on push alerts")).toBeNull();
	});
});
