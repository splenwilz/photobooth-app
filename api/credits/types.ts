/**
 * Credits API Types
 *
 * Type definitions for booth credits endpoints.
 *
 * @see GET /api/v1/booths/{booth_id}/credits - Get credit balance
 * @see POST /api/v1/booths/{booth_id}/credits - Add credits
 * @see GET /api/v1/booths/{booth_id}/credits/history - Get credit history
 */

/**
 * GET /api/v1/booths/{booth_id}/credits response
 */
export interface BoothCreditsResponse {
	booth_id: string;
	booth_name: string;
	credit_balance: number;
	has_credits: boolean;
	last_updated: string;
}

/**
 * POST /api/v1/booths/{booth_id}/credits request body
 */
export interface AddCreditsRequest {
	amount: number;
	reason?: string;
}

/**
 * POST /api/v1/booths/{booth_id}/credits response
 */
export interface AddCreditsResponse {
	command_id: number;
	booth_id: string;
	amount: number;
	status: "delivered" | "pending" | "failed";
	message: string;
}

// ============================================================================
// CREDITS HISTORY TYPES
// ============================================================================

/**
 * Credit command status
 */
export type CreditCommandStatus = "delivered" | "pending" | "completed" | "failed";

/**
 * Single credit history command item
 */
export interface CreditHistoryCommand {
	id: number;
	command_type: "add_credits";
	amount: number;
	reason: string | null;
	status: CreditCommandStatus;
	created_at: string;
	delivered_at: string | null;
	completed_at: string | null;
	result_message: string | null;
}

/**
 * GET /api/v1/booths/{booth_id}/credits/history response
 */
export interface CreditsHistoryResponse {
	booth_id: string;
	booth_name: string;
	commands: CreditHistoryCommand[];
	total: number;
	limit: number;
	offset: number;
}

/**
 * GET /api/v1/booths/{booth_id}/credits/history query params
 */
export interface CreditsHistoryParams {
	limit?: number;
	offset?: number;
}

