/**
 * Alerts Services Tests
 *
 * Tests for getAlerts and getBoothAlerts service functions.
 */
import { getAlerts, getBoothAlerts } from "../services";
import { apiClient } from "../../client";

jest.mock("../../client", () => ({
	apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

const mockResponse = {
	summary: { critical: 1, warning: 1, info: 0 },
	alerts: [
		{
			id: "offline-booth-123",
			type: "booth_offline",
			severity: "critical",
			category: "network",
			title: "Booth Offline",
			message: "Lost connection",
			booth_id: "booth-123",
			booth_name: "Downtown Booth",
			timestamp: "2026-04-05T10:30:00+00:00",
			is_read: false,
		},
	],
	total: 2,
	returned: 2,
};

describe("getAlerts", () => {
	beforeEach(() => jest.clearAllMocks());

	it("calls GET /api/v1/analytics/alerts with no params", async () => {
		mockApiClient.mockResolvedValue(mockResponse);

		const result = await getAlerts();

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/analytics/alerts",
			expect.objectContaining({ method: "GET" }),
		);
		expect(result).toEqual(mockResponse);
	});

	it("propagates API errors", async () => {
		const error = new Error("Unauthorized");
		mockApiClient.mockRejectedValue(error);

		await expect(getAlerts()).rejects.toThrow("Unauthorized");
	});

	it("appends query params when provided", async () => {
		mockApiClient.mockResolvedValue(mockResponse);

		await getAlerts({ severity: "critical", limit: 10 });

		const calledUrl = mockApiClient.mock.calls[0][0] as string;
		expect(calledUrl).toContain("severity=critical");
		expect(calledUrl).toContain("limit=10");
	});
});

describe("getBoothAlerts", () => {
	beforeEach(() => jest.clearAllMocks());

	it("calls GET /api/v1/analytics/alerts/{booth_id}", async () => {
		mockApiClient.mockResolvedValue(mockResponse);

		const result = await getBoothAlerts("booth-123");

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/analytics/alerts/booth-123",
			expect.objectContaining({ method: "GET" }),
		);
		expect(result).toEqual(mockResponse);
	});

	it("appends query params to booth-specific URL", async () => {
		mockApiClient.mockResolvedValue(mockResponse);

		await getBoothAlerts("booth-456", { severity: "warning", category: "hardware" });

		const calledUrl = mockApiClient.mock.calls[0][0] as string;
		expect(calledUrl).toMatch(/^\/api\/v1\/analytics\/alerts\/booth-456\?/);
		expect(calledUrl).toContain("severity=warning");
		expect(calledUrl).toContain("category=hardware");
	});

	it("propagates API errors", async () => {
		const error = new Error("Booth not found");
		mockApiClient.mockRejectedValue(error);

		await expect(getBoothAlerts("bad-id")).rejects.toThrow("Booth not found");
	});
});
