import { apiClient } from "../../client";
import type { VerifyResetCodeRequest, VerifyResetCodeResponse } from "./types";

/**
 * Verify a 6-digit password reset code
 * @param data - The 6-digit OTP code
 * @returns Promise resolving to a short-lived token for use with /reset-password
 */
export async function verifyResetCode(
	data: VerifyResetCodeRequest,
): Promise<VerifyResetCodeResponse> {
	const response = await apiClient<VerifyResetCodeResponse>(
		"/api/v1/auth/verify-reset-code",
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
	return response;
}
