import { apiClient } from "../../client";
import type { ResetPasswordRequest, ResetPasswordResponse } from "./types";

/**
 * Reset password using token from verify-reset-code
 * @param data - Token, new password, and confirm new password
 * @returns Promise resolving to user info
 */
export async function resetPassword(
	data: ResetPasswordRequest,
): Promise<ResetPasswordResponse> {
	const response = await apiClient<ResetPasswordResponse>(
		"/api/v1/auth/reset-password",
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
	return response;
}
