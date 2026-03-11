/**
 * Booth Services Tests
 *
 * Tests for downloadBoothLogs service function.
 */
import { downloadBoothLogs } from "../services";
import { apiClient } from "../../client";

jest.mock("../../client", () => ({
	apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe("downloadBoothLogs", () => {
	beforeEach(() => jest.clearAllMocks());

	it("calls POST /api/v1/booths/{booth_id}/download-logs with default body", async () => {
		const mockResponse = {
			download_url: "https://s3.amazonaws.com/test",
			file_size: 245760,
			booth_id: "booth-123",
			message: "Log files ready",
		};
		mockApiClient.mockResolvedValue(mockResponse);

		const result = await downloadBoothLogs("booth-123");

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-123/download-logs",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({}),
				timeout: 130000,
			}),
		);
		expect(result).toEqual(mockResponse);
	});

	it("passes log_types and hours in request body", async () => {
		mockApiClient.mockResolvedValue({
			download_url: "https://s3.amazonaws.com/test",
			file_size: 100,
			booth_id: "booth-123",
			message: "done",
		});

		await downloadBoothLogs("booth-123", {
			log_types: ["hardware", "errors"],
			hours: 48,
		});

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-123/download-logs",
			expect.objectContaining({
				body: JSON.stringify({
					log_types: ["hardware", "errors"],
					hours: 48,
				}),
			}),
		);
	});

	it("throws when boothId is empty", async () => {
		await expect(downloadBoothLogs("")).rejects.toThrow(
			"Booth ID is required",
		);
	});

	it("propagates API errors", async () => {
		mockApiClient.mockRejectedValue(new Error("Booth is offline"));

		await expect(downloadBoothLogs("booth-123")).rejects.toThrow(
			"Booth is offline",
		);
	});
});
