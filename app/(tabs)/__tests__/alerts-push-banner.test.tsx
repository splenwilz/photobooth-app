/**
 * Alerts screen — push-permission banner behavior.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Linking from "expo-linking";
import React from "react";
import AlertsScreen, { PUSH_BANNER_DISMISSED_KEY } from "../alerts";
import {
	acquireExpoPushToken,
	getPushPermissionState,
} from "@/utils/push-notifications";

jest.mock("@react-navigation/native", () => ({ useIsFocused: () => true }));

const mockRegisterMutate = jest.fn();

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
	useRegisterDevice: () => ({ mutate: mockRegisterMutate }),
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
const mockAcquire = acquireExpoPushToken as jest.Mock;
const mockOpenSettings = Linking.openSettings as jest.Mock;

function renderScreen() {
	const qc = new QueryClient({
		// gcTime: 0 — without it every client leaks a non-unref'd 5-minute GC
		// timer and the jest process idles for exactly 300s after the run.
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false },
		},
	});
	return render(
		<QueryClientProvider client={qc}>
			<AlertsScreen />
		</QueryClientProvider>,
	);
}

describe("Alerts push-permission banner", () => {
	beforeEach(async () => {
		jest.clearAllMocks();
		await AsyncStorage.clear(); // dismissal persists in the mock store too
	});

	it("opens Settings when denied and a re-request is also denied", async () => {
		mockState.mockResolvedValue("denied");
		// Re-request first (Android re-prompt / iOS no-op); still denied → Settings.
		mockAcquire.mockResolvedValue({ status: "denied" });
		const { getByText } = renderScreen();

		await waitFor(() => expect(getByText("Notifications are off")).toBeTruthy());

		fireEvent.press(getByText("Notifications are off"));
		await waitFor(() =>
			expect(mockAcquire).toHaveBeenCalledWith({ requestIfUndetermined: true }),
		);
		await waitFor(() => expect(mockOpenSettings).toHaveBeenCalled());
	});

	it("hides the banner when permission is granted", async () => {
		mockState.mockResolvedValue("granted");
		const { queryByText } = renderScreen();

		await waitFor(() => expect(mockState).toHaveBeenCalled());
		expect(queryByText("Notifications are off")).toBeNull();
		expect(queryByText("Turn on push alerts")).toBeNull();
	});

	it("shows 'Turn on push alerts' when undetermined and enables on tap", async () => {
		mockState.mockResolvedValue("undetermined");
		mockAcquire.mockResolvedValue({
			status: "granted",
			token: "ExponentPushToken[x]",
			deviceId: "d1",
			platform: "ios",
		});
		const { getByText } = renderScreen();

		await waitFor(() => expect(getByText("Turn on push alerts")).toBeTruthy());

		fireEvent.press(getByText("Turn on push alerts"));

		await waitFor(() =>
			expect(mockAcquire).toHaveBeenCalledWith({ requestIfUndetermined: true }),
		);
		await waitFor(() =>
			expect(mockRegisterMutate).toHaveBeenCalledWith({
				expo_push_token: "ExponentPushToken[x]",
				device_id: "d1",
				platform: "ios",
			}),
		);
		expect(mockOpenSettings).not.toHaveBeenCalled();
	});

	it("persists dismissal so the banner stays gone after a remount", async () => {
		mockState.mockResolvedValue("undetermined");
		const first = renderScreen();

		await waitFor(() =>
			expect(first.getByText("Turn on push alerts")).toBeTruthy(),
		);
		fireEvent.press(first.getByLabelText("Dismiss"));

		await waitFor(() =>
			expect(AsyncStorage.setItem).toHaveBeenCalledWith(
				PUSH_BANNER_DISMISSED_KEY,
				"true",
			),
		);
		expect(first.queryByText("Turn on push alerts")).toBeNull();
		first.unmount();

		// Fresh mount (new navigation, new app launch): banner must stay gone —
		// including this very first synchronous frame (the anti-flash guarantee:
		// unknown persisted state renders as dismissed, never as visible).
		const second = renderScreen();
		expect(second.queryByText("Turn on push alerts")).toBeNull();
		await waitFor(() => expect(mockState).toHaveBeenCalled());
		await waitFor(() =>
			expect(AsyncStorage.getItem).toHaveBeenCalledWith(
				PUSH_BANNER_DISMISSED_KEY,
			),
		);
		expect(second.queryByText("Turn on push alerts")).toBeNull();
	});

	it("shows the banner on mount when dismissal was never persisted", async () => {
		mockState.mockResolvedValue("undetermined");
		const { getByText } = renderScreen();
		await waitFor(() => expect(getByText("Turn on push alerts")).toBeTruthy());
	});

	it("shows the banner when the persisted read fails (nudge over silence)", async () => {
		mockState.mockResolvedValue("undetermined");
		jest
			.spyOn(AsyncStorage, "getItem")
			.mockRejectedValueOnce(new Error("disk error"));
		const { getByText } = renderScreen();
		await waitFor(() => expect(getByText("Turn on push alerts")).toBeTruthy());
	});
});
