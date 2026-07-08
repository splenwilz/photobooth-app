/**
 * Alerts Services Tests
 *
 * Tests for getAlerts and getBoothAlerts service functions.
 */
import {
	getAlerts,
	getBoothAlerts,
	markAlertRead,
	markAllAlertsRead,
} from "../services";
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

describe("markAlertRead", () => {
	beforeEach(() => jest.clearAllMocks());

	it("PATCHes /{alert_id}/read with is_read=true by default", async () => {
		mockApiClient.mockResolvedValue({ id: "printer-error-b1", is_read: true });

		const result = await markAlertRead("printer-error-b1");

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/analytics/alerts/printer-error-b1/read",
			expect.objectContaining({
				method: "PATCH",
				body: JSON.stringify({ is_read: true }),
			}),
		);
		expect(result).toEqual({ id: "printer-error-b1", is_read: true });
	});

	it("supports marking unread (is_read=false)", async () => {
		mockApiClient.mockResolvedValue({ id: "offline-b1", is_read: false });

		await markAlertRead("offline-b1", false);

		expect(mockApiClient).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ body: JSON.stringify({ is_read: false }) }),
		);
	});

	it("URL-encodes the alert id", async () => {
		mockApiClient.mockResolvedValue({ id: "x", is_read: true });

		await markAlertRead("weird id/with#chars");

		const calledUrl = mockApiClient.mock.calls[0][0] as string;
		expect(calledUrl).toBe(
			`/api/v1/analytics/alerts/${encodeURIComponent("weird id/with#chars")}/read`,
		);
	});

	it("propagates API errors", async () => {
		mockApiClient.mockRejectedValue(new Error("Bad id"));
		await expect(markAlertRead("bad")).rejects.toThrow("Bad id");
	});
});

describe("markAllAlertsRead", () => {
	beforeEach(() => jest.clearAllMocks());

	it("PATCHes /read-all with a booth_id when scoped", async () => {
		mockApiClient.mockResolvedValue({ updated: 5 });

		const result = await markAllAlertsRead("booth-123");

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/analytics/alerts/read-all",
			expect.objectContaining({
				method: "PATCH",
				body: JSON.stringify({ booth_id: "booth-123" }),
			}),
		);
		expect(result).toEqual({ updated: 5 });
	});

	it("sends booth_id:null for all booths", async () => {
		mockApiClient.mockResolvedValue({ updated: 12 });

		await markAllAlertsRead(null);

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/analytics/alerts/read-all",
			expect.objectContaining({ body: JSON.stringify({ booth_id: null }) }),
		);
	});
});
