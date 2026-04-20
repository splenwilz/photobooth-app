/**
 * User Services Tests
 *
 * Tests for updateBusinessName service function with use_display_name_on_booths support.
 */
import { updateBusinessName } from "../services";
import { apiClient } from "../../client";

jest.mock("../../client", () => ({
	apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe("updateBusinessName", () => {
	beforeEach(() => jest.clearAllMocks());

	it("sends PATCH with business_name only", async () => {
		const mockResponse = {
			id: "user_01ABC",
			first_name: "Michael",
			last_name: "Johnson",
			email: "michael@snapshot.com",
			business_name: "Snapshot Studios",
			logo_url: null,
			use_display_name_on_booths: false,
			created_at: "2024-08-15T10:30:00Z",
			updated_at: "2024-08-20T14:00:00Z",
		};
		mockApiClient.mockResolvedValue(mockResponse);

		const result = await updateBusinessName("user_01ABC", {
			business_name: "Snapshot Studios",
		});

		expect(mockApiClient).toHaveBeenCalledWith("/api/v1/users/user_01ABC", {
			method: "PATCH",
			body: JSON.stringify({ business_name: "Snapshot Studios" }),
		});
		expect(result).toEqual(mockResponse);
	});

	it("sends PATCH with use_display_name_on_booths only", async () => {
		const mockResponse = {
			id: "user_01ABC",
			first_name: "Michael",
			last_name: "Johnson",
			email: "michael@snapshot.com",
			business_name: "Snapshot Studios",
			logo_url: null,
			use_display_name_on_booths: true,
			created_at: "2024-08-15T10:30:00Z",
			updated_at: "2024-08-20T14:00:00Z",
		};
		mockApiClient.mockResolvedValue(mockResponse);

		const result = await updateBusinessName("user_01ABC", {
			use_display_name_on_booths: true,
		});

		expect(mockApiClient).toHaveBeenCalledWith("/api/v1/users/user_01ABC", {
			method: "PATCH",
			body: JSON.stringify({ use_display_name_on_booths: true }),
		});
		expect(result).toEqual(mockResponse);
	});

	it("sends PATCH with both business_name and use_display_name_on_booths", async () => {
		const mockResponse = {
			id: "user_01ABC",
			first_name: "Michael",
			last_name: "Johnson",
			email: "michael@snapshot.com",
			business_name: "New Name",
			logo_url: null,
			use_display_name_on_booths: true,
			created_at: "2024-08-15T10:30:00Z",
			updated_at: "2024-08-20T14:00:00Z",
		};
		mockApiClient.mockResolvedValue(mockResponse);

		const result = await updateBusinessName("user_01ABC", {
			business_name: "New Name",
			use_display_name_on_booths: true,
		});

		expect(mockApiClient).toHaveBeenCalledWith("/api/v1/users/user_01ABC", {
			method: "PATCH",
			body: JSON.stringify({
				business_name: "New Name",
				use_display_name_on_booths: true,
			}),
		});
		expect(result).toEqual(mockResponse);
		expect(result.use_display_name_on_booths).toBe(true);
	});

	it("propagates API errors", async () => {
		mockApiClient.mockRejectedValue(new Error("Forbidden"));

		await expect(
			updateBusinessName("user_01ABC", { business_name: "Test" }),
		).rejects.toThrow("Forbidden");
	});
});
