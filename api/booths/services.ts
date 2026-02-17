import { apiClient } from "../client";
import type { LogoDeleteResponse, LogoUploadResponse } from "../users/types";
import type {
	BoothBusinessSettingsResponse,
	BoothCredentialsResponse,
	BoothDetailResponse,
	BoothListResponse,
	BoothOverviewResponse,
	BoothPricingResponse,
	CancelRestartResponse,
	CreateBoothRequest,
	CreateBoothResponse,
	DashboardOverviewResponse,
	DeleteBoothResponse,
	EmergencyPasswordRequest,
	EmergencyPasswordResponse,
	GenerateCodeResponse,
	RestartAppResponse,
	RestartRequest,
	RestartSystemResponse,
	SyncTemplatesResponse,
	UpdateBoothSettingsRequest,
	UpdateBoothSettingsResponse,
	UpdatePricingRequest,
	UpdatePricingResponse,
} from "./types";

/**
 * Booth API Services
 *
 * Service functions for booth management.
 * @see https://tanstack.com/query/latest/docs/react/guides/mutations
 */

/**
 * Create a new booth
 * @param data - Booth creation request data (name, address)
 * @returns Promise resolving to created booth with API key and QR code
 */
export async function createBooth(
	data: CreateBoothRequest,
): Promise<CreateBoothResponse> {
	const response = await apiClient<CreateBoothResponse>("/api/v1/booths", {
		method: "POST",
		body: JSON.stringify(data),
	});
	return response;
}

/**
 * Get list of all booths for the current user
 * @returns Promise resolving to booth list with total count
 * @see GET /api/v1/booths
 */
export async function getBoothList(): Promise<BoothListResponse> {
	const response = await apiClient<BoothListResponse>("/api/v1/booths", {
		method: "GET",
	});
	return response;
}

/**
 * Get detailed overview for a single booth
 * Includes revenue, hardware status, system info, and recent alerts
 * @param boothId - The booth ID to fetch
 * @returns Promise resolving to detailed booth data
 * @see GET /api/v1/booths/{booth_id}/overview
 */
export async function getBoothDetail(boothId: string): Promise<BoothDetailResponse> {
	if (!boothId) throw new Error("Booth ID is required for getBoothDetail");
	const response = await apiClient<BoothDetailResponse>(
		`/api/v1/booths/${boothId}/overview`,
		{
			method: "GET",
		},
	);
	return response;
}

/**
 * Get booth overview with summary and all booths (aggregated view)
 * @returns Promise resolving to booth overview with summary statistics
 * @see GET /api/v1/booths/overview
 */
export async function getBoothOverview(): Promise<BoothOverviewResponse> {
	const response = await apiClient<BoothOverviewResponse>(
		"/api/v1/booths/overview",
		{
			method: "GET",
		},
	);
	return response;
}

/**
 * Get dashboard overview with aggregated stats across all booths
 * Includes summary, revenue by period, payment breakdown, hardware summary, and alerts
 * @returns Promise resolving to dashboard overview data
 * @see GET /api/v1/booths/overview/all
 */
export async function getDashboardOverview(): Promise<DashboardOverviewResponse> {
	return apiClient<DashboardOverviewResponse>("/api/v1/booths/overview/all", {
		method: "GET",
	});
}

/**
 * Get current pricing for a booth
 * @param boothId - The booth ID to get pricing for
 * @returns Promise resolving to current pricing info
 * @see GET /api/v1/booths/{booth_id}/pricing
 */
export async function getBoothPricing(
	boothId: string,
): Promise<BoothPricingResponse> {
	if (!boothId) throw new Error("Booth ID is required for getBoothPricing");
	const response = await apiClient<BoothPricingResponse>(
		`/api/v1/booths/${boothId}/pricing`,
		{
			method: "GET",
		},
	);
	return response;
}

/**
 * Update pricing for a booth (partial update)
 * Sends pricing update command to the booth via WebSocket
 * @param boothId - The booth ID to update pricing for
 * @param data - Pricing update data (only include fields to update)
 * @returns Promise resolving to command result
 * @see PATCH /api/v1/booths/{booth_id}/pricing
 */
export async function updateBoothPricing(
	boothId: string,
	data: UpdatePricingRequest,
): Promise<UpdatePricingResponse> {
	const response = await apiClient<UpdatePricingResponse>(
		`/api/v1/booths/${boothId}/pricing`,
		{
			method: "PATCH",
			body: JSON.stringify(data),
		},
	);
	return response;
}

// ============================================================================
// RESTART SERVICES
// ============================================================================

/**
 * Restart the booth application
 * @param boothId - The booth ID to restart
 * @param data - Optional delay and force settings
 * @returns Promise resolving to command result
 * @see POST /api/v1/booths/{booth_id}/restart-app
 */
export async function restartBoothApp(
	boothId: string,
	data?: RestartRequest,
): Promise<RestartAppResponse> {
	const response = await apiClient<RestartAppResponse>(
		`/api/v1/booths/${boothId}/restart-app`,
		{
			method: "POST",
			body: JSON.stringify(data ?? { delay_seconds: 5, force: false }),
		},
	);
	return response;
}

/**
 * Restart the booth system (PC reboot)
 * @param boothId - The booth ID to restart
 * @param data - Optional delay and force settings
 * @returns Promise resolving to command result
 * @see POST /api/v1/booths/{booth_id}/restart-system
 */
export async function restartBoothSystem(
	boothId: string,
	data?: RestartRequest,
): Promise<RestartSystemResponse> {
	const response = await apiClient<RestartSystemResponse>(
		`/api/v1/booths/${boothId}/restart-system`,
		{
			method: "POST",
			body: JSON.stringify(data ?? { delay_seconds: 15, force: false }),
		},
	);
	return response;
}

/**
 * Cancel a pending restart command
 * @param boothId - The booth ID to cancel restart for
 * @returns Promise resolving to command result
 * @see POST /api/v1/booths/{booth_id}/cancel-restart
 */
export async function cancelBoothRestart(
	boothId: string,
): Promise<CancelRestartResponse> {
	const response = await apiClient<CancelRestartResponse>(
		`/api/v1/booths/${boothId}/cancel-restart`,
		{
			method: "POST",
			body: JSON.stringify({}),
		},
	);
	return response;
}

// ============================================================================
// BOOTH CREDENTIALS SERVICES
// ============================================================================

/**
 * Get booth credentials (API key and QR code for reconnection)
 * @param boothId - The booth ID to get credentials for
 * @returns Promise resolving to credentials with API key and QR code
 * @see GET /api/v1/booths/{booth_id}/credentials
 */
export async function getBoothCredentials(
	boothId: string,
): Promise<BoothCredentialsResponse> {
	const response = await apiClient<BoothCredentialsResponse>(
		`/api/v1/booths/${boothId}/credentials`,
		{
			method: "GET",
		},
	);
	return response;
}

/**
 * Generate a new 6-digit registration code for a booth
 * Code is valid for 15 minutes and is one-time use
 * User types this code on the photobooth instead of scanning QR codes
 * 
 * @param boothId - The booth ID to generate code for
 * @returns Promise resolving to code and expiration info
 * @see POST /api/v1/booths/{booth_id}/generate-code
 */
export async function generateBoothCode(
	boothId: string,
): Promise<GenerateCodeResponse> {
	const response = await apiClient<GenerateCodeResponse>(
		`/api/v1/booths/${boothId}/generate-code`,
		{
			method: "POST",
			body: JSON.stringify({}),
		},
	);
	return response;
}

// ============================================================================
// DELETE BOOTH SERVICES
// ============================================================================

/**
 * Delete a booth permanently
 * @param boothId - The booth ID to delete
 * @returns Promise resolving to delete confirmation
 * @see DELETE /api/v1/booths/{booth_id}
 */
export async function deleteBooth(
	boothId: string,
): Promise<DeleteBoothResponse> {
	const response = await apiClient<DeleteBoothResponse>(
		`/api/v1/booths/${boothId}`,
		{
			method: "DELETE",
		},
	);
	return response;
}

/**
 * Trigger template sync for a booth
 * Queues a SYNC_TEMPLATE command for the booth to download purchased templates
 * @param boothId - The booth ID to sync
 * @returns Promise resolving to command result
 * @see POST /api/v1/booths/{booth_id}/sync-templates
 */
export async function syncBoothTemplates(
	boothId: string,
): Promise<SyncTemplatesResponse> {
	const response = await apiClient<SyncTemplatesResponse>(
		`/api/v1/booths/${boothId}/sync-templates`,
		{
			method: "POST",
		},
	);
	return response;
}

// ============================================================================
// BUSINESS SETTINGS SERVICES
// ============================================================================

/**
 * Get booth business settings
 * Returns account-level business name, effective logo, and per-booth settings.
 * @param boothId - The booth ID to fetch settings for
 * @returns Promise resolving to business settings
 * @see GET /api/v1/booths/{booth_id}/business-settings
 */
export async function getBoothBusinessSettings(
	boothId: string,
): Promise<BoothBusinessSettingsResponse> {
	const response = await apiClient<BoothBusinessSettingsResponse>(
		`/api/v1/booths/${boothId}/business-settings`,
		{ method: "GET" },
	);
	return response;
}

/**
 * Update booth settings (address, logo toggles)
 * @param boothId - The booth ID to update
 * @param data - Settings update payload
 * @returns Promise resolving to updated booth
 * @see PATCH /api/v1/booths/{booth_id}
 */
export async function updateBoothSettings(
	boothId: string,
	data: UpdateBoothSettingsRequest,
): Promise<UpdateBoothSettingsResponse> {
	const response = await apiClient<UpdateBoothSettingsResponse>(
		`/api/v1/booths/${boothId}`,
		{
			method: "PATCH",
			body: JSON.stringify(data),
		},
	);
	return response;
}

/**
 * Upload a custom logo for a specific booth (multipart/form-data)
 * Automatically sets use_custom_logo=true on the booth.
 * @param boothId - The booth ID to upload logo for
 * @param fileUri - Local file URI from image picker
 * @param mimeType - MIME type (image/png or image/jpeg)
 * @param filename - File name
 * @returns Promise resolving to logo URL and S3 key
 * @see PUT /api/v1/booths/{booth_id}/logo
 */
export async function uploadBoothLogo(
	boothId: string,
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
		`/api/v1/booths/${boothId}/logo`,
		{
			method: "PUT",
			body: formData,
		},
	);
	return response;
}

/**
 * Remove custom booth logo
 * The booth reverts to using the account logo.
 * @param boothId - The booth ID to remove logo for
 * @returns Promise resolving to confirmation message
 * @see DELETE /api/v1/booths/{booth_id}/logo
 */
export async function deleteBoothLogo(
	boothId: string,
): Promise<LogoDeleteResponse> {
	const response = await apiClient<LogoDeleteResponse>(
		`/api/v1/booths/${boothId}/logo`,
		{ method: "DELETE" },
	);
	return response;
}

// ============================================================================
// EMERGENCY PASSWORD SERVICES
// ============================================================================

/**
 * Request a self-service emergency password for a booth
 * The password is emailed to the booth owner's registered email and is NOT included in the response.
 * Maximum 3 active emergency passwords per booth at any time.
 *
 * @param boothId - The booth ID to generate emergency password for
 * @param data - Request with reason and optional validity duration
 * @returns Promise resolving to confirmation with masked email and expiry info
 * @see POST /api/v1/booths/{booth_id}/emergency-password
 */
export async function requestEmergencyPassword(
	boothId: string,
	data: EmergencyPasswordRequest,
): Promise<EmergencyPasswordResponse> {
	if (!boothId) throw new Error("Booth ID is required for requestEmergencyPassword");
	const response = await apiClient<EmergencyPasswordResponse>(
		`/api/v1/booths/${boothId}/emergency-password`,
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
	return response;
}
