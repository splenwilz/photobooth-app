/**
 * Booth Transfer Services
 *
 * Raw API calls for booth ownership transfers. Seller endpoints hang off the
 * booth; buyer endpoints hang off the transfer id.
 *
 * Mirrors the web dashboard's core/api/transfers/services.ts — keep in sync.
 */

import { apiClient } from "../client";
import type {
	AcceptTransferRequest,
	BoothTransfer,
	CreateTransferRequest,
} from "./types";

// ============================================================================
// Seller endpoints
// ============================================================================

/**
 * Offer the booth to a buyer's email. One open offer per booth;
 * rate limited to 10 offers/hour per seller.
 * @see POST /api/v1/booths/{booth_id}/transfer
 */
export async function createBoothTransfer(
	boothId: string,
	data: CreateTransferRequest,
): Promise<BoothTransfer> {
	return apiClient<BoothTransfer>(
		`/api/v1/booths/${encodeURIComponent(boothId)}/transfer`,
		{ method: "POST", body: JSON.stringify(data) },
	);
}

/**
 * Latest transfer (any status) for a booth the caller owns or sold.
 * 404 `no_transfer` when the booth has never been offered.
 * @see GET /api/v1/booths/{booth_id}/transfer
 */
export async function getLatestBoothTransfer(
	boothId: string,
): Promise<BoothTransfer> {
	return apiClient<BoothTransfer>(
		`/api/v1/booths/${encodeURIComponent(boothId)}/transfer`,
	);
}

/**
 * Re-send the offer email: rotates the accept token (the old email link
 * stops working), restarts the 7-day expiry window, and emails the buyer a
 * fresh link. Also the right call for a pending offer whose window lapsed.
 * Shares the initiate rate-limit bucket (10/hour per seller). 404
 * `no_pending_transfer` when there is no open offer. The token is never in
 * the response.
 * @see POST /api/v1/booths/{booth_id}/transfer/resend
 */
export async function resendBoothTransfer(
	boothId: string,
): Promise<BoothTransfer> {
	return apiClient<BoothTransfer>(
		`/api/v1/booths/${encodeURIComponent(boothId)}/transfer/resend`,
		{ method: "POST" },
	);
}

/**
 * Withdraw the pending offer. 404 `no_pending_transfer` when there is
 * nothing to cancel.
 * @see DELETE /api/v1/booths/{booth_id}/transfer
 */
export async function cancelBoothTransfer(
	boothId: string,
): Promise<BoothTransfer> {
	return apiClient<BoothTransfer>(
		`/api/v1/booths/${encodeURIComponent(boothId)}/transfer`,
		{ method: "DELETE" },
	);
}

// ============================================================================
// Buyer endpoints
// ============================================================================

/**
 * Offers addressed to the signed-in user's email, newest first.
 * @see GET /api/v1/transfers
 */
export async function listMyTransfers(): Promise<BoothTransfer[]> {
	return apiClient<BoothTransfer[]>("/api/v1/transfers");
}

/**
 * Offer detail.
 * @see GET /api/v1/transfers/{transfer_id}
 */
export async function getTransfer(transferId: string): Promise<BoothTransfer> {
	return apiClient<BoothTransfer>(
		`/api/v1/transfers/${encodeURIComponent(transferId)}`,
	);
}

/**
 * Accept the offer — executes the handover atomically (Stripe + S3 copies),
 * which can take a few seconds on template-heavy booths. Never auto-retry on
 * timeout; re-fetch the transfer instead (a successful accept shows as
 * completed/settled; a second POST returns 409 `transfer_not_pending`).
 * @see POST /api/v1/transfers/{transfer_id}/accept
 */
export async function acceptTransfer(
	transferId: string,
	data: AcceptTransferRequest,
): Promise<BoothTransfer> {
	return apiClient<BoothTransfer>(
		`/api/v1/transfers/${encodeURIComponent(transferId)}/accept`,
		{ method: "POST", body: JSON.stringify(data) },
	);
}

/**
 * Decline the offer. No token needed.
 * @see POST /api/v1/transfers/{transfer_id}/decline
 */
export async function declineTransfer(
	transferId: string,
): Promise<BoothTransfer> {
	return apiClient<BoothTransfer>(
		`/api/v1/transfers/${encodeURIComponent(transferId)}/decline`,
		{ method: "POST" },
	);
}
