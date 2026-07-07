/**
 * Alerts screen — booth-scope clarity.
 *
 * The header bell badge is fleet-wide, but the Alerts screen + "Mark all read"
 * are scoped to the selected booth. These tests lock in the UX that explains
 * that: a scope-aware action label, and a tappable hint when OTHER booths still
 * have unread alerts the current (single-booth) view can't clear.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import AlertsScreen from "../alerts";

jest.mock("@react-navigation/native", () => ({ useIsFocused: () => true }));

let mockSelectedBoothId = "booth-1";
const mockSetSelectedBoothId = jest.fn();

const mockMakeAlert = (o: Record<string, unknown>) => ({
	id: "x",
	boothId: "b",
	isRead: false,
	type: "critical",
	category: "hardware",
	title: "t",
	message: "m",
	boothName: "n",
	timestamp: "2026-01-01T00:00:00Z",
	...o,
});
const mockResult = (alerts: unknown[]) => ({
	data: { alerts, summary: { critical: 0, warning: 0, info: 0 } },
	isLoading: false,
	error: null,
	refetch: jest.fn(),
	isRefetching: false,
});
// Fleet: booth-1 read, booth-2 still unread → 1 unread on "other booths".
const mockFleet = mockResult([
	mockMakeAlert({ id: "printer-error-booth-1", boothId: "booth-1", isRead: true }),
	mockMakeAlert({ id: "offline-booth-2", boothId: "booth-2", isRead: false }),
]);
// The selected booth (booth-1) has 1 unread of its own.
const mockBooth = mockResult([
	mockMakeAlert({ id: "printer-error-booth-1", boothId: "booth-1", isRead: false }),
]);
// All-Booths mode list (params.limit): 2 unread across booths.
const mockAllList = mockResult([
	mockMakeAlert({ id: "printer-error-booth-1", boothId: "booth-1", isRead: false }),
	mockMakeAlert({ id: "offline-booth-2", boothId: "booth-2", isRead: false }),
]);

// Note: this mock ignores the `enabled` option, so the "no hint in All-Booths
// mode" case is guarded by the component's `isAllMode ? 0` useMemo, not by the
// query being disabled. Keep that memo gate if refactoring, or this goes vacuous.
jest.mock("@/api/alerts/queries", () => ({
	useAlerts: (params?: { limit?: number }) =>
		params?.limit ? mockAllList : mockFleet,
	useBoothAlerts: () => mockBooth,
	useMarkAlertRead: () => ({ mutate: jest.fn() }),
	useMarkAllAlertsRead: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/api/push/queries", () => ({
	useRegisterDevice: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/utils/push-notifications", () => ({
	getPushPermissionState: jest.fn().mockResolvedValue("granted"),
	acquireExpoPushToken: jest.fn(),
}));
jest.mock("@/stores/booth-store", () => ({
	ALL_BOOTHS_ID: "all",
	useBoothStore: () => ({
		selectedBoothId: mockSelectedBoothId,
		setSelectedBoothId: mockSetSelectedBoothId,
	}),
}));

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

describe("Alerts booth-scope clarity", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSelectedBoothId = "booth-1";
	});

	it("single-booth mode: scoped label + 'other booths' hint that switches to All Booths", () => {
		mockSelectedBoothId = "booth-1";
		const { getByText, queryByText } = renderScreen();

		// Action label reflects the scope — not the misleading "Mark all read".
		expect(getByText("Mark this booth read")).toBeTruthy();
		expect(queryByText("Mark all read")).toBeNull();

		// The fleet badge the user can't clear from here is explained + actionable.
		const hint = getByText(/1 unread on other booths/i);
		fireEvent.press(hint);
		expect(mockSetSelectedBoothId).toHaveBeenCalledWith("all");
	});

	it("All-Booths mode: label is 'Mark all read' and no other-booths hint", () => {
		mockSelectedBoothId = "all";
		const { getByText, queryByText } = renderScreen();

		expect(getByText("Mark all read")).toBeTruthy();
		expect(queryByText("Mark this booth read")).toBeNull();
		expect(queryByText(/unread on other booths/i)).toBeNull();
	});
});
