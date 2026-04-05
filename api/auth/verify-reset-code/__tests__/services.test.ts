/**
 * Verify Reset Code Services Tests
 *
 * Tests for verifyResetCode service function.
 */
import { verifyResetCode } from "../services";
import { apiClient } from "../../../client";

jest.mock("../../../client", () => ({
	apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe("verifyResetCode", () => {
	beforeEach(() => jest.clearAllMocks());

	it("calls POST /api/v1/auth/verify-reset-code with code only", async () => {
		const mockResponse = {
			message: "Code verified successfully.",
			token: "Z3J2X1...",
		};
		mockApiClient.mockResolvedValue(mockResponse);

		const result = await verifyResetCode({ code: "123456" });

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/auth/verify-reset-code",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ code: "123456" }),
			}),
		);
		expect(result).toEqual(mockResponse);
	});

	it("propagates API errors", async () => {
		const error = new Error("Invalid or expired reset code");
		mockApiClient.mockRejectedValue(error);

		await expect(verifyResetCode({ code: "123456" })).rejects.toThrow(
			"Invalid or expired reset code",
		);
	});
});
