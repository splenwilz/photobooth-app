/**
 * Per-channel notification preference tests
 *
 * Covers the PATCH service and useUpdateChannelPreference's optimistic update
 * + rollback across the email/push channel model.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import { queryKeys } from "../../utils/query-keys";
import { useUpdateChannelPreference } from "../queries";
import {
	getNotificationPreferences,
	patchNotificationPreferences,
} from "../services";
import { apiClient } from "../../client";
import type {
	NotificationPreference,
	NotificationPreferencesResponse,
} from "../types";

jest.mock("../../client", () => ({ apiClient: jest.fn() }));
jest.mock("../services", () => {
	const actual = jest.requireActual("../services");
	return {
		...actual,
		getNotificationPreferences: jest.fn(),
		patchNotificationPreferences: jest.fn(),
	};
});

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;
const mockPatch = patchNotificationPreferences as jest.MockedFunction<
	typeof patchNotificationPreferences
>;

function makePref(overrides: Partial<NotificationPreference> = {}): NotificationPreference {
	return {
		event_type: "booth_offline",
		label: "Booth Offline",
		description: "When a booth stops sending heartbeats",
		category: "booth",
		enabled: true,
		channels: { email: true, push: true },
		...overrides,
	};
}

function createWrapper(queryClient: QueryClient) {
	function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	}
	Wrapper.displayName = "QueryClientWrapper";
	return Wrapper;
}

function seed(queryClient: QueryClient, prefs: NotificationPreference[]) {
	queryClient.setQueryData<NotificationPreferencesResponse>(
		queryKeys.notifications.preferences(),
		{ preferences: prefs },
	);
}

function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
}

describe("patchNotificationPreferences (service)", () => {
	beforeEach(() => jest.clearAllMocks());

	it("PATCHes /preferences with the updates array", async () => {
		const actual = jest.requireActual("../services");
		mockApiClient.mockResolvedValue({ updated: 1 });

		await actual.patchNotificationPreferences({
			updates: [{ event_type: "booth_offline", channel: "push", enabled: false }],
		});

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/notifications/preferences",
			expect.objectContaining({
				method: "PATCH",
				body: JSON.stringify({
					updates: [
						{ event_type: "booth_offline", channel: "push", enabled: false },
					],
				}),
			}),
		);
	});
});

describe("useUpdateChannelPreference", () => {
	beforeEach(() => jest.clearAllMocks());

	it("optimistically flips only the targeted channel", async () => {
		mockPatch.mockResolvedValue({ updated: 1 });
		const queryClient = createQueryClient();
		seed(queryClient, [makePref()]);

		const { result } = renderHook(() => useUpdateChannelPreference(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate({
			eventType: "booth_offline",
			channel: "push",
			enabled: false,
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<NotificationPreferencesResponse>(
				queryKeys.notifications.preferences(),
			);
			const pref = data?.preferences[0];
			expect(pref?.channels.push).toBe(false);
		});
		const data = queryClient.getQueryData<NotificationPreferencesResponse>(
			queryKeys.notifications.preferences(),
		);
		// email untouched
		expect(data?.preferences[0].channels.email).toBe(true);
	});

	it("keeps the deprecated `enabled` mirror in sync for the email channel", async () => {
		mockPatch.mockResolvedValue({ updated: 1 });
		const queryClient = createQueryClient();
		seed(queryClient, [makePref()]);

		const { result } = renderHook(() => useUpdateChannelPreference(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate({
			eventType: "booth_offline",
			channel: "email",
			enabled: false,
		});

		await waitFor(() => {
			const pref = queryClient.getQueryData<NotificationPreferencesResponse>(
				queryKeys.notifications.preferences(),
			)?.preferences[0];
			expect(pref?.channels.email).toBe(false);
			expect(pref?.enabled).toBe(false);
		});
	});

	it("rolls back on error", async () => {
		mockPatch.mockRejectedValue(new Error("500"));
		const queryClient = createQueryClient();
		seed(queryClient, [makePref()]);

		const { result } = renderHook(() => useUpdateChannelPreference(), {
			wrapper: createWrapper(queryClient),
		});

		result.current.mutate({
			eventType: "booth_offline",
			channel: "push",
			enabled: false,
		});

		await waitFor(() => expect(result.current.isError).toBe(true));

		const pref = queryClient.getQueryData<NotificationPreferencesResponse>(
			queryKeys.notifications.preferences(),
		)?.preferences[0];
		expect(pref?.channels.push).toBe(true); // restored
	});

	it("a stale failed toggle does not clobber a newer optimistic value (latest-wins)", async () => {
		const queryClient = createQueryClient();
		seed(queryClient, [makePref({ channels: { email: false, push: true } })]);

		const { result } = renderHook(() => useUpdateChannelPreference(), {
			wrapper: createWrapper(queryClient),
		});

		// Three quick toggles of the SAME (event, channel). The FIRST rejects
		// (slow network); the last succeeds. The first's late rollback must NOT
		// restore its stale previousValue over the newest optimistic value.
		mockPatch
			.mockRejectedValueOnce(new Error("500")) // toggle A → true, fails late
			.mockResolvedValueOnce({ updated: 1 }) //     toggle B → false
			.mockResolvedValueOnce({ updated: 1 }); //    toggle C → true (final)

		const email = (enabled: boolean) =>
			result.current.mutate({ eventType: "booth_offline", channel: "email", enabled });

		email(true); // A: prev=false
		email(false); // B: prev=true
		email(true); // C: prev=false — the user's final intent

		// Once all three settle, the cache must reflect C's optimistic `true`,
		// not A's stale rolled-back `false`.
		await waitFor(() => {
			const pref = queryClient.getQueryData<NotificationPreferencesResponse>(
				queryKeys.notifications.preferences(),
			)?.preferences[0];
			expect(pref?.channels.email).toBe(true);
		});
		const pref = queryClient.getQueryData<NotificationPreferencesResponse>(
			queryKeys.notifications.preferences(),
		)?.preferences[0];
		expect(pref?.channels.email).toBe(true);
	});
});
