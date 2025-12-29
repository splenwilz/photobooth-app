import { apiClient } from "../client";
import type {
    BoothDetailResponse,
    BoothListResponse,
    BoothOverviewResponse,
    CreateBoothRequest,
    CreateBoothResponse,
    DashboardOverviewResponse,
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
	const response = await apiClient<DashboardOverviewResponse>(
		"/api/v1/booths/overview/all",
		{
			method: "GET",
		},
	);
	return response;
}
