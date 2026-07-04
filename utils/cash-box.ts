/**
 * Cash Box Utilities
 *
 * Pure helpers for the booth cash-box feature (physical cash sitting in the
 * bill acceptors — distinct from revenue).
 *
 * @see docs Cash Box API — GET /api/v1/booths/{booth_id}/overview `cash_box`
 */

import type { CashBox } from "@/api/booths/types";

/**
 * Snapshot age classification for the cash-box heartbeat (~30s cadence).
 * - fresh: within the staleness threshold
 * - stale: older than the threshold — booth is likely offline
 * - unknown: no (or unparseable) updated_at, e.g. awaiting first report
 */
export type CashBoxFreshness = "fresh" | "stale" | "unknown";

/**
 * Four missed 30s heartbeats — past this the booth is likely offline and the
 * balance should be presented as "as of {updated_at}", not live.
 */
const DEFAULT_STALENESS_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * Cash paid out of the till as refunds since the last collection.
 *
 * The API guarantees bill1_inserted + bill2_inserted >= expected_total:
 * refunds are netted against the total only, because the booth cannot know
 * which physical acceptor box the operator took refund cash from. A positive
 * gap is therefore normal (not an error and not theft). Clamped to >= 0 so a
 * backend invariant violation can never render a negative "refunds" line.
 *
 * Rounded to whole cents: IEEE 754 residue (e.g. 0.2 + 0.1 - 0.3 = 5.55e-17)
 * would otherwise pass a `gap > 0` check and render a phantom "$0.00 paid
 * out as refunds" line.
 */
export function getCashBoxRefundGap(
	cashBox: Pick<CashBox, "expected_total" | "bill1_inserted" | "bill2_inserted">,
): number {
	const rawGap =
		cashBox.bill1_inserted + cashBox.bill2_inserted - cashBox.expected_total;
	return Math.max(0, Math.round(rawGap * 100) / 100);
}

/**
 * Classify how current the cash-box snapshot is.
 *
 * @param updatedAt - ISO timestamp of the booth's last cash-box heartbeat
 * @param now - Injectable clock for testability (defaults to the real time)
 * @param thresholdMs - Age beyond which the snapshot counts as stale
 */
export function getCashBoxFreshness(
	updatedAt: string | null,
	now: Date = new Date(),
	thresholdMs: number = DEFAULT_STALENESS_THRESHOLD_MS,
): CashBoxFreshness {
	if (!updatedAt) return "unknown";

	const updatedMs = Date.parse(updatedAt);
	if (Number.isNaN(updatedMs)) return "unknown";

	return now.getTime() - updatedMs > thresholdMs ? "stale" : "fresh";
}
