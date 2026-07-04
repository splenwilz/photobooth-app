/**
 * Cash Collections Service Tests
 *
 * Tests for the getBoothCashCollections service function.
 * @see docs Cash Box API — GET /api/v1/booths/{booth_id}/cash-collections
 */
import { getBoothCashCollections } from "../services";
import { apiClient } from "../../client";

jest.mock("../../client", () => ({
	apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe("getBoothCashCollections", () => {
	beforeEach(() => jest.clearAllMocks());

	it("calls GET /api/v1/booths/{booth_id}/cash-collections with default pagination", async () => {
		const mockResponse = {
			booth_id: "booth-123",
			booth_name: "Downtown Booth",
			collections: [],
			total: 0,
			limit: 50,
			offset: 0,
		};
		mockApiClient.mockResolvedValue(mockResponse);

		const result = await getBoothCashCollections("booth-123");

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-123/cash-collections?limit=50&offset=0",
			expect.objectContaining({ method: "GET" }),
		);
		expect(result).toEqual(mockResponse);
	});

	it("respects custom limit and offset", async () => {
		mockApiClient.mockResolvedValue({
			booth_id: "booth-123",
			booth_name: "Downtown",
			collections: [],
			total: 120,
			limit: 100,
			offset: 50,
		});

		await getBoothCashCollections("booth-123", { limit: 100, offset: 50 });

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-123/cash-collections?limit=100&offset=50",
			expect.objectContaining({ method: "GET" }),
		);
	});

	it("returns collection rows with nullable fields intact", async () => {
		const mockResponse = {
			booth_id: "booth-123",
			booth_name: "Downtown",
			collections: [
				{
					id: "3f6c1a9e-8d2b-4c11-9f7a-2e5b8c4d0a61",
					local_id: 12,
					total_amount: 42.0,
					bill1_amount: 30.0,
					bill2_amount: 12.0,
					collected_by_name: "Alice Operator",
					note: "weekly pickup",
					collected_at: "2026-06-28T09:12:00Z",
					synced_at: "2026-06-28T09:12:31Z",
				},
				{
					id: "b1d4e7f0-2a35-4968-8b1c-9d0e3f6a2c84",
					local_id: 11,
					total_amount: 13.0,
					bill1_amount: null,
					bill2_amount: null,
					collected_by_name: null,
					note: null,
					collected_at: "2026-05-14T17:40:00Z",
					synced_at: "2026-06-28T09:12:31Z",
				},
			],
			total: 2,
			limit: 50,
			offset: 0,
		};
		mockApiClient.mockResolvedValue(mockResponse);

		const result = await getBoothCashCollections("booth-123");

		expect(result.collections[0].collected_by_name).toBe("Alice Operator");
		expect(result.collections[1].bill1_amount).toBeNull();
		expect(result.collections[1].collected_by_name).toBeNull();
		expect(result.total).toBe(2);
	});

	it("throws when boothId is empty", async () => {
		await expect(getBoothCashCollections("")).rejects.toThrow(
			"Booth ID is required",
		);
		expect(mockApiClient).not.toHaveBeenCalled();
	});

	it("propagates API errors (404 unknown/un-owned booth, 422 validation)", async () => {
		mockApiClient.mockRejectedValue(new Error("Booth not found"));

		await expect(getBoothCashCollections("booth-123")).rejects.toThrow(
			"Booth not found",
		);
	});
});
