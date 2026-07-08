/**
 * Push device registration service tests
 */
import { registerDevice, unregisterDevice } from "../services";
import { apiClient } from "../../client";
import type { RegisterDeviceRequest } from "../types";

jest.mock("../../client", () => ({
	apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

const body: RegisterDeviceRequest = {
	expo_push_token: "ExponentPushToken[abc]",
	device_id: "device-uuid-1",
	platform: "ios",
};

describe("registerDevice", () => {
	beforeEach(() => jest.clearAllMocks());

	it("POSTs /api/v1/push/devices with the token body", async () => {
		mockApiClient.mockResolvedValue({
			id: 1,
			device_id: "device-uuid-1",
			platform: "ios",
			registered: true,
		});

		const result = await registerDevice(body);

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/push/devices",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify(body),
			}),
		);
		expect(result.registered).toBe(true);
	});

	it("propagates API errors", async () => {
		mockApiClient.mockRejectedValue(new Error("429"));
		await expect(registerDevice(body)).rejects.toThrow("429");
	});
});

describe("unregisterDevice", () => {
	beforeEach(() => jest.clearAllMocks());

	it("DELETEs /api/v1/push/devices/{device_id}", async () => {
		mockApiClient.mockResolvedValue(undefined);

		await unregisterDevice("device-uuid-1");

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/push/devices/device-uuid-1",
			expect.objectContaining({ method: "DELETE" }),
		);
	});

	it("URL-encodes the device id", async () => {
		mockApiClient.mockResolvedValue(undefined);

		await unregisterDevice("weird/id");

		expect(mockApiClient).toHaveBeenCalledWith(
			`/api/v1/push/devices/${encodeURIComponent("weird/id")}`,
			expect.objectContaining({ method: "DELETE" }),
		);
	});
});
