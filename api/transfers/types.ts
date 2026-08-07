/**
 * Booth Transfer Types
 *
 * Booth ownership transfer: a seller offers their booth to a buyer's email;
 * the buyer accepts (via the tokenized link in the offer email) and the booth
 * (settings, templates, remaining subscription time) moves to the buyer's
 * account.
 *
 * Mirrors the web dashboard's core/api/transfers/types.ts — keep in sync.
 */

// ============================================================================
// Transfer lifecycle
// ============================================================================

/**
 * Drive all transfer UI off this status.
 *
 * pending ──► cancelled (seller withdrew) / declined (buyer) / expired (7-day TTL)
 *    │ buyer accepts
 *    ▼
 * completed ── inherited subscription lapses ──► settled
 *
 * A transfer with no inherited subscription goes straight from `pending`
 * to `settled` on accept.
 */
export type TransferStatus =
	| "pending"
	| "completed"
	| "settled"
	| "cancelled"
	| "declined"
	| "expired";

// ============================================================================
// Transfer entity
// ============================================================================

export interface BoothTransfer {
	id: string;
	booth_id: string;
	booth_name: string;
	seller_id: string;
	/** Null until the buyer's account is known/created */
	buyer_id: string | null;
	buyer_email: string;
	status: TransferStatus;
	include_templates: boolean;
	/** How many templates conveyed; populated after acceptance */
	templates_copied: number | null;
	created_at: string;
	expires_at: string;
	accepted_at: string | null;
	settled_at: string | null;
	cancelled_at: string | null;
	/**
	 * Seller-facing fields, present on POST /booths/{id}/transfer responses
	 * only. `buyer_account_exists=false, invitation_sent=true` → the buyer was
	 * invited to create an account first. Both false → account lookup failed
	 * transiently; the offer still stands and the email still carries the
	 * accept link.
	 */
	buyer_account_exists?: boolean;
	invitation_sent?: boolean;
}

// ============================================================================
// Requests
// ============================================================================

export interface CreateTransferRequest {
	buyer_email: string;
}

export interface AcceptTransferRequest {
	/** The accept token from the buyer's offer link. Bearer credential — keep out of logs/analytics. */
	token: string;
}

// ============================================================================
// Error codes
// ============================================================================

/**
 * Structured error codes carried on `ApiError.code` / `ApiError.detail.code`.
 * Branch on the code, never on message text.
 */
export type TransferErrorCode =
	// Seller offer errors
	| "booth_not_found"
	| "self_transfer"
	| "transfer_already_pending"
	| "rate_limited"
	| "no_transfer"
	| "no_pending_transfer"
	// Buyer accept/decline errors
	| "not_addressed_to_you"
	| "invalid_token"
	| "transfer_not_found"
	| "transfer_not_pending"
	| "booth_owner_changed"
	| "transfer_expired"
	// Checkout guard while a completed transfer rides out the seller's subscription
	| "subscription_included";

/**
 * Shape of the 409 checkout rejection while an inherited subscription is
 * riding out. `included_until` can be null in rare webhook-lag windows;
 * fall back to "until the current billing period ends" copy.
 */
export interface SubscriptionIncludedDetail {
	code: "subscription_included";
	message: string;
	included_until: string | null;
}
