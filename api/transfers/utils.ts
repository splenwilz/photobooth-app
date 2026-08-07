/**
 * Booth Transfer Utilities
 *
 * Pure helpers for expiry display. Mirrors the web dashboard's
 * core/api/transfers/utils.ts (minus the cookie plumbing, which is
 * web-only) — keep in sync.
 */

import type { BoothTransfer, TransferStatus } from "./types";

/**
 * A `pending` row whose `expires_at` is in the past renders as expired —
 * the server stamps the status lazily.
 */
export function displayStatus(
	transfer: Pick<BoothTransfer, "status" | "expires_at">,
	nowMs: number,
): TransferStatus {
	if (transfer.status !== "pending") return transfer.status;
	const expiresMs = Date.parse(transfer.expires_at);
	if (!Number.isNaN(expiresMs) && expiresMs <= nowMs) return "expired";
	return "pending";
}

/**
 * Coarse countdown for the 7-day offer TTL, e.g. "6d 23h", "5h 12m", "42m".
 * Returns null when already expired or the timestamp is unparseable.
 */
export function formatTimeRemaining(
	expiresAt: string,
	nowMs: number,
): string | null {
	const expiresMs = Date.parse(expiresAt);
	if (Number.isNaN(expiresMs)) return null;
	const remainingMs = expiresMs - nowMs;
	if (remainingMs <= 0) return null;

	const minutes = Math.floor(remainingMs / 60_000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ${hours % 24}h`;
	if (hours > 0) return `${hours}h ${minutes % 60}m`;
	if (minutes > 0) return `${minutes}m`;
	return "less than a minute";
}
