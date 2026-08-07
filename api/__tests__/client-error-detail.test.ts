/**
 * ApiError structured-detail and Retry-After tests.
 *
 * Transfer endpoints report errors as `detail: { code, message, ... }` and
 * rate-limit with a Retry-After header. The client must pass the whole
 * detail object through (callers branch on its shape, e.g. `included_until`
 * on the subscription_included 409) and surface Retry-After as seconds.
 */

process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.test.com";

jest.mock("expo-secure-store", () => ({
	getItemAsync: jest.fn().mockResolvedValue("test-token"),
	setItemAsync: jest.fn(),
	deleteItemAsync: jest.fn(),
}));

jest.mock("../query-client", () => ({
	queryClient: { clear: jest.fn() },
}));

import { ApiError, apiClient } from "../client";

function errorResponse(
	status: number,
	body: unknown,
	headers: Record<string, string> = {},
) {
	const normalized = Object.fromEntries(
		Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
	);
	return {
		ok: false,
		status,
		statusText: "Error",
		headers: { get: (name: string) => normalized[name.toLowerCase()] ?? null },
		text: async () => JSON.stringify(body),
	};
}

describe("ApiError structured detail passthrough", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("passes an object detail through on ApiError.detail", async () => {
		global.fetch = jest.fn().mockResolvedValue(
			errorResponse(409, {
				detail: {
					code: "subscription_included",
					message: "Included from previous owner",
					included_until: "2026-09-01T00:00:00Z",
				},
			}),
		);

		const error = await apiClient("/api/v1/test").catch((e: unknown) => e);
		expect(error).toBeInstanceOf(ApiError);
		expect((error as ApiError).code).toBe("subscription_included");
		expect((error as ApiError).detail).toEqual({
			code: "subscription_included",
			message: "Included from previous owner",
			included_until: "2026-09-01T00:00:00Z",
		});
		// detail.message is still lifted into the display message
		expect((error as ApiError).message).toBe("Included from previous owner");
	});

	it("leaves detail undefined for string-detail bodies", async () => {
		global.fetch = jest
			.fn()
			.mockResolvedValue(errorResponse(400, { detail: "plain string error" }));

		const error = await apiClient("/api/v1/test").catch((e: unknown) => e);
		expect((error as ApiError).detail).toBeUndefined();
	});

	it("parses delta-seconds Retry-After into retryAfterSeconds", async () => {
		global.fetch = jest.fn().mockResolvedValue(
			errorResponse(
				429,
				{ detail: { code: "rate_limited", message: "Too many offers" } },
				{ "Retry-After": "120" },
			),
		);

		const error = await apiClient("/api/v1/test").catch((e: unknown) => e);
		expect((error as ApiError).retryAfterSeconds).toBe(120);
	});

	it("parses the HTTP-date form of Retry-After into seconds", async () => {
		const httpDate = new Date(Date.now() + 90_000).toUTCString();
		global.fetch = jest.fn().mockResolvedValue(
			errorResponse(
				429,
				{ detail: { code: "rate_limited", message: "Too many offers" } },
				{ "Retry-After": httpDate },
			),
		);

		const error = await apiClient("/api/v1/test").catch((e: unknown) => e);
		// toUTCString truncates sub-second precision; allow a small window
		expect((error as ApiError).retryAfterSeconds).toBeGreaterThanOrEqual(85);
		expect((error as ApiError).retryAfterSeconds).toBeLessThanOrEqual(91);
	});

	it("leaves retryAfterSeconds undefined without the header", async () => {
		global.fetch = jest
			.fn()
			.mockResolvedValue(
				errorResponse(429, { detail: { code: "rate_limited", message: "x" } }),
			);

		const error = await apiClient("/api/v1/test").catch((e: unknown) => e);
		expect((error as ApiError).retryAfterSeconds).toBeUndefined();
	});
});
