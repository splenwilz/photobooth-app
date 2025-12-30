/**
 * Credits API Services
 *
 * Service functions for booth credits operations.
 *
 * @see GET /api/v1/booths/{booth_id}/credits - Get credit balance
 * @see POST /api/v1/booths/{booth_id}/credits - Add credits
 * @see GET /api/v1/booths/{booth_id}/credits/history - Get credit history
 */

import { apiClient } from "../client";
import type {
    AddCreditsRequest,
    AddCreditsResponse,
    BoothCreditsResponse,
    CreditsHistoryParams,
    CreditsHistoryResponse,
} from "./types";

/**
 * Get booth credit balance
 *
 * @param boothId - The booth ID to get credits for
 * @returns Credit balance and metadata
 *
 * @example
 * const credits = await getBoothCredits("booth-123");
 * console.log(credits.credit_balance); // 12215
 */
export async function getBoothCredits(
	boothId: string,
): Promise<BoothCreditsResponse> {
	// apiClient is a fetch-like function, not axios
	const response = await apiClient<BoothCreditsResponse>(
		`/api/v1/booths/${boothId}/credits`,
		{ method: "GET" },
	);
	return response;
}

/**
 * Add credits to a booth
 *
 * @param boothId - The booth ID to add credits to
 * @param data - Amount and optional reason
 * @returns Command result with delivery status
 *
 * @example
 * const result = await addBoothCredits("booth-123", { amount: 100, reason: "Monthly top-up" });
 * console.log(result.status); // "delivered"
 */
export async function addBoothCredits(
	boothId: string,
	data: AddCreditsRequest,
): Promise<AddCreditsResponse> {
	// apiClient is a fetch-like function, not axios
	const response = await apiClient<AddCreditsResponse>(
		`/api/v1/booths/${boothId}/credits`,
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
	return response;
}

/**
 * Get booth credits history with pagination
 *
 * @param boothId - The booth ID to get history for
 * @param params - Pagination params (limit, offset)
 * @returns Paginated list of credit commands
 *
 * @example
 * const history = await getCreditsHistory("booth-123", { limit: 50, offset: 0 });
 * console.log(history.commands); // Array of credit commands
 */
export async function getCreditsHistory(
	boothId: string,
	params?: CreditsHistoryParams,
): Promise<CreditsHistoryResponse> {
	// Build query string for pagination
	const queryParams = new URLSearchParams();
	if (params?.limit) queryParams.append("limit", params.limit.toString());
	if (params?.offset) queryParams.append("offset", params.offset.toString());

	const queryString = queryParams.toString();
	const url = `/api/v1/booths/${boothId}/credits/history${queryString ? `?${queryString}` : ""}`;

	const response = await apiClient<CreditsHistoryResponse>(url, {
		method: "GET",
	});
	return response;
}
