/**
 * usePushNotifications hook tests
 *
 * Covers notification-tap handling: cold-start route + mark-read fires exactly
 * once, the stored response is cleared after handling, and a response delivered
 * via BOTH getLastNotificationResponseAsync and the listener (iOS launch-tap
 * double-fire) is deduped by request identifier.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React from "react";
import { usePushNotifications } from "../use-push-notifications";
import { markAlertRead } from "@/api/alerts/services";

jest.mock("@/api/alerts/services", () => ({
	markAlertRead: jest.fn().mockResolvedValue({ id: "x", is_read: true }),
	markAllAlertsRead: jest.fn(),
}));
// The tap read-path is auth-gated. Spread the real module so any other client
// export stays intact; override only getAccessToken (signed-in by default).
jest.mock("@/api/client", () => ({
	...jest.requireActual("@/api/client"),
	getAccessToken: jest.fn().mockResolvedValue("test-token"),
}));
const mockGetAccessToken = jest.requireMock("@/api/client")
	.getAccessToken as jest.Mock;

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
		// mark-read is deferred behind the async auth check, so await it.
		await waitFor(() =>
			expect(mockMarkRead).toHaveBeenCalledWith("printer-error-b1", true),
		);
		// Prevents re-routing to this stale response on the next normal launch.
		expect(mockClearLast).toHaveBeenCalled();
	});

	it("signed-out tap routes but does NOT call the protected mark-read", async () => {
		// No session → the auth gate must skip markAlertRead entirely, while still
		// routing (the router itself bounces a signed-out user).
		mockGetAccessToken.mockResolvedValueOnce(null);
		mockGetLast.mockResolvedValue(makeResponse());
		renderHook(() => usePushNotifications(), { wrapper: createWrapper() });

		await waitFor(() =>
			expect(mockRouterReplace).toHaveBeenCalledWith("/(tabs)/alerts"),
		);
		// Flush the getAccessToken().then microtask, then assert the negative.
		await act(async () => {});
		expect(mockMarkRead).not.toHaveBeenCalled();
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

		// mark-read is deferred behind the async auth check, so await it.
		await waitFor(() => expect(mockMarkRead).toHaveBeenCalledTimes(1));

		// iOS also fires the listener for the launch notification (same id).
		listenerCb?.(makeResponse());

		expect(mockRouterReplace).toHaveBeenCalledTimes(1);
		expect(mockMarkRead).toHaveBeenCalledTimes(1);
	});

	it("ignores non-default action identifiers (custom buttons)", async () => {
		mockGetLast.mockResolvedValue(makeResponse({ actionIdentifier: "SNOOZE" }));
		renderHook(() => usePushNotifications(), { wrapper: createWrapper() });
		// Deterministically wait for the hook to consume the response, then flush
		// the .then(handleResponse) microtask — no arbitrary sleep. (waitFor around
		// a `.not` assertion would pass instantly, so we flush THEN assert.)
		await waitFor(() => expect(mockGetLast).toHaveBeenCalled());
		await act(async () => {});
		expect(mockRouterReplace).not.toHaveBeenCalledWith("/(tabs)/alerts");
	});
});
