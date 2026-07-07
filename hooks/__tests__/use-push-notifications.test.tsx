/**
 * usePushNotifications hook tests
 *
 * Covers notification-tap handling: cold-start route + mark-read fires exactly
 * once, the stored response is cleared after handling, and a response delivered
 * via BOTH getLastNotificationResponseAsync and the listener (iOS launch-tap
 * double-fire) is deduped by request identifier.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React from "react";
import { usePushNotifications } from "../use-push-notifications";
import { markAlertRead } from "@/api/alerts/services";

jest.mock("@/api/alerts/services", () => ({
	markAlertRead: jest.fn().mockResolvedValue({ id: "x", is_read: true }),
	markAllAlertsRead: jest.fn(),
}));

const mockMarkRead = markAlertRead as jest.Mock;
const mockGetLast =
	Notifications.getLastNotificationResponseAsync as jest.Mock;
const mockClearLast =
	Notifications.clearLastNotificationResponseAsync as jest.Mock;
const mockAddListener =
	Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockRouterReplace = router.replace as jest.Mock;

function makeResponse(overrides: Record<string, unknown> = {}) {
	return {
		actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
		notification: {
			request: {
				identifier: "n1",
				content: {
					data: {
						deep_link: "boothiq://alerts",
						alert_id: "printer-error-b1",
						booth_id: "b1",
					},
				},
			},
		},
		...overrides,
	};
}

function createWrapper() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	function Wrapper({ children }: { children: React.ReactNode }) {
		return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
	}
	Wrapper.displayName = "QueryClientWrapper";
	return Wrapper;
}

describe("usePushNotifications", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetLast.mockResolvedValue(null);
		mockAddListener.mockReturnValue({ remove: jest.fn() });
	});

	it("cold-start tap: routes + marks read once, then clears the stored response", async () => {
		mockGetLast.mockResolvedValue(makeResponse());
		renderHook(() => usePushNotifications(), { wrapper: createWrapper() });

		await waitFor(() =>
			expect(mockRouterReplace).toHaveBeenCalledWith("/(tabs)/alerts"),
		);
		expect(mockMarkRead).toHaveBeenCalledWith("printer-error-b1", true);
		// Prevents re-routing to this stale response on the next normal launch.
		expect(mockClearLast).toHaveBeenCalled();
	});

	it("dedupes the same response delivered via both getLast and the listener", async () => {
		let listenerCb: ((r: unknown) => void) | undefined;
		mockAddListener.mockImplementation((cb: (r: unknown) => void) => {
			listenerCb = cb;
			return { remove: jest.fn() };
		});
		mockGetLast.mockResolvedValue(makeResponse());

		renderHook(() => usePushNotifications(), { wrapper: createWrapper() });
		await waitFor(() =>
			expect(mockRouterReplace).toHaveBeenCalledTimes(1),
		);

		// iOS also fires the listener for the launch notification (same id).
		listenerCb?.(makeResponse());

		expect(mockRouterReplace).toHaveBeenCalledTimes(1);
		expect(mockMarkRead).toHaveBeenCalledTimes(1);
	});

	it("ignores non-default action identifiers (custom buttons)", async () => {
		mockGetLast.mockResolvedValue(makeResponse({ actionIdentifier: "SNOOZE" }));
		renderHook(() => usePushNotifications(), { wrapper: createWrapper() });
		await new Promise((r) => setTimeout(r, 10));
		expect(mockRouterReplace).not.toHaveBeenCalledWith("/(tabs)/alerts");
	});
});
