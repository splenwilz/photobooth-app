/**
 * API Client Tests
 *
 * Tests for the custom timeout parameter added to apiClient.
 */

// Set env var before importing client
process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.test.com";

// Mock SecureStore token retrieval
jest.mock("expo-secure-store", () => ({
	getItemAsync: jest.fn().mockResolvedValue("test-token"),
	setItemAsync: jest.fn(),
	deleteItemAsync: jest.fn(),
}));

// Mock query-client to avoid side effects
jest.mock("../query-client", () => ({
	queryClient: { clear: jest.fn() },
}));

import { apiClient, getStoredUser } from "../client";
import * as SecureStore from "expo-secure-store";

describe("apiClient timeout", () => {
	let setTimeoutSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		setTimeoutSpy = jest.spyOn(global, "setTimeout");
		// Mock fetch to return a successful response
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			headers: { get: () => "application/json" },
			json: () => Promise.resolve({ data: "test" }),
		});
	});

	afterEach(() => {
		setTimeoutSpy.mockRestore();
	});

	it("uses default 30s timeout when no timeout specified", async () => {
		await apiClient("/test", { method: "GET" });

		// Find the setTimeout call made by apiClient (not other internal calls)
		const timeoutCalls = setTimeoutSpy.mock.calls.filter(
			(call) => call[1] === 30000,
		);
		expect(timeoutCalls.length).toBeGreaterThan(0);
	});

	it("uses custom timeout when specified", async () => {
		await apiClient("/test", {
			method: "GET",
			timeout: 130000,
		});

		// Verify the custom timeout value was used
		const timeoutCalls = setTimeoutSpy.mock.calls.filter(
			(call) => call[1] === 130000,
		);
		expect(timeoutCalls.length).toBeGreaterThan(0);
	});

	it("does not use 30s timeout when custom timeout is specified", async () => {
		await apiClient("/test", {
			method: "GET",
			timeout: 130000,
		});

		// Should NOT have a 30s timeout call
		const defaultTimeoutCalls = setTimeoutSpy.mock.calls.filter(
			(call) => call[1] === 30000,
		);
		expect(defaultTimeoutCalls.length).toBe(0);
	});
});

describe("getStoredUser backward compatibility", () => {
	const mockGetItemAsync = SecureStore.getItemAsync as jest.MockedFunction<
		typeof SecureStore.getItemAsync
	>;

	beforeEach(() => jest.clearAllMocks());

	it("returns null when no user stored", async () => {
		mockGetItemAsync.mockResolvedValue(null);
		const user = await getStoredUser();
		expect(user).toBeNull();
	});

	it("normalizes old cached user without use_display_name_on_booths", async () => {
		const oldUser = {
			object: "user",
			id: "user_01ABC",
			email: "test@example.com",
			first_name: "Test",
			last_name: "User",
			email_verified: true,
			profile_picture_url: "",
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-01T00:00:00Z",
			is_onboarded: true,
			business_name: null,
			logo_url: null,
			// Note: use_display_name_on_booths intentionally omitted
		};
		mockGetItemAsync.mockResolvedValue(JSON.stringify(oldUser));

		const user = await getStoredUser();
		expect(user).not.toBeNull();
		expect(user!.use_display_name_on_booths).toBe(false);
	});

	it("preserves use_display_name_on_booths when already present", async () => {
		const newUser = {
			object: "user",
			id: "user_01ABC",
			email: "test@example.com",
			first_name: "Test",
			last_name: "User",
			email_verified: true,
			profile_picture_url: "",
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-01T00:00:00Z",
			is_onboarded: true,
			business_name: "Test",
			logo_url: null,
			use_display_name_on_booths: true,
		};
		mockGetItemAsync.mockResolvedValue(JSON.stringify(newUser));

		const user = await getStoredUser();
		expect(user).not.toBeNull();
		expect(user!.use_display_name_on_booths).toBe(true);
	});
});
