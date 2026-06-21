/**
 * User Profile API Services
 *
 * Service functions for user profile and account-level business settings.
 * @see /api/v1/users endpoints
 */

import {
	apiClient,
	clearPendingResetData,
	clearQueryCache,
	clearTokens,
} from "../client";
import type {
	AccountDeleteResponse,
	LogoDeleteResponse,
	LogoUploadResponse,
	UpdateBusinessNameRequest,
	UserProfileResponse,
} from "./types";

/**
 * Get user profile
 * @param userId - The user ID to fetch
 * @returns Promise resolving to user profile with business_name and logo_url
 * @see GET /api/v1/users/{user_id}
 */
export async function getUserProfile(
	userId: string,
): Promise<UserProfileResponse> {
	const response = await apiClient<UserProfileResponse>(
		`/api/v1/users/${userId}`,
		{ method: "GET" },
	);
	return response;
}

/**
 * Update user profile (business name)
 * @param userId - The user ID to update
 * @param data - Fields to update
 * @returns Promise resolving to updated user profile
 * @see PATCH /api/v1/users/{user_id}
 */
export async function updateBusinessName(
	userId: string,
	data: UpdateBusinessNameRequest,
): Promise<UserProfileResponse> {
	const response = await apiClient<UserProfileResponse>(
		`/api/v1/users/${userId}`,
		{
			method: "PATCH",
			body: JSON.stringify(data),
		},
	);
	return response;
}

/**
 * Upload account logo (multipart/form-data)
 * apiClient auto-detects FormData and skips Content-Type header for boundary.
 * @param userId - The user ID to upload logo for
 * @param fileUri - Local file URI from image picker
 * @param mimeType - MIME type (image/png or image/jpeg)
 * @param filename - File name
 * @returns Promise resolving to logo URL and S3 key
 * @see PUT /api/v1/users/{user_id}/logo
 */
export async function uploadAccountLogo(
	userId: string,
	fileUri: string,
	mimeType: string,
	filename: string,
): Promise<LogoUploadResponse> {
	const formData = new FormData();
	formData.append("file", {
		uri: fileUri,
		type: mimeType,
		name: filename,
	} as any);

	const response = await apiClient<LogoUploadResponse>(
		`/api/v1/users/${userId}/logo`,
		{
			method: "PUT",
			body: formData,
		},
	);
	return response;
}

/**
 * Remove account logo
 * All booths using the account logo will have no logo until a new one is uploaded.
 * @param userId - The user ID to remove logo for
 * @returns Promise resolving to confirmation message
 * @see DELETE /api/v1/users/{user_id}/logo
 */
export async function deleteAccountLogo(
	userId: string,
): Promise<LogoDeleteResponse> {
	const response = await apiClient<LogoDeleteResponse>(
		`/api/v1/users/${userId}/logo`,
		{ method: "DELETE" },
	);
	return response;
}

/**
 * Permanently delete the user's account and all associated data.
 * Required by Apple Guideline 5.1.1(v) for any app supporting account creation.
 *
 * The local session (tokens, pending reset flow data, React Query cache) is
 * torn down only AFTER the server confirms deletion — if the request fails the
 * account still exists, so the user stays signed in.
 * @param userId - The user ID to delete
 * @returns Promise resolving to confirmation message
 * @see DELETE /api/v1/users/{user_id}
 */
export async function deleteAccount(
	userId: string,
): Promise<AccountDeleteResponse> {
	const response = await apiClient<AccountDeleteResponse>(
		`/api/v1/users/${userId}`,
		{ method: "DELETE" },
	);

	// Account is gone server-side — clear all local state.
	await clearTokens();
	await clearPendingResetData();
	clearQueryCache();

	return response;
}
