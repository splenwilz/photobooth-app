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

import { apiClient } from "../client";

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
