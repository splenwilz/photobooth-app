/**
 * Critical Events Utilities
 *
 * Pure helpers for joining, categorizing, counting, and formatting the
 * booth critical-event feed powering the "needs attention" screens.
 *
 * Events fall into two categories, distinguished by `transaction_code`:
 * - Transaction events (code set): money is involved; actionable until the
 *   underlying transaction is refunded.
 * - Operational events (code null): device incidents (printer wedged,
 *   self-recovery exhausted); informational until the operator has seen them.
 *
 * @see api/booths — useBoothCriticalEvents, useBoothTransactions
 */
import type {
	BoothCriticalEvent,
	CriticalEventTag,
	StrandedReason,
	SyncedTransaction,
} from "@/api/booths/types";

/**
 * A critical event paired with its matching booth transaction (if any).
 * `transaction` is null when the event's `transaction_code` does not yet
 * match any synced transaction (e.g. the first sync arrived before the
 * booth re-synced the stranded marker), and always null for operational
 * events.
 */
export interface CriticalEventRow {
	event: BoothCriticalEvent;
	transaction: SyncedTransaction | null;
}

/**
 * Whether an event references a customer transaction (money involved).
 * Per the API contract, `transaction_code` is set exactly for
 * money-related events.
 */
export function isTransactionEvent(event: BoothCriticalEvent): boolean {
	return event.transaction_code !== null;
}

/** Attention counts derived from one booth's critical-event feed. */
export interface CriticalAttentionCounts {
	/** Unrefunded transaction events — actionable until refunded, seen or not. */
	needsRefund: number;
	/** Operational events newer than the operator's seen marker. */
	unseenOperational: number;
	/** Badge value: needsRefund + unseenOperational. */
	total: number;
}

/**
 * Compute the attention counts for a booth's critical-event feed.
 *
 * Dedupes with the same rule as the list screen so a badge can never
 * disagree with the list it links to. `lastSeenEventId` is the operator's
 * per-booth seen marker (event ids are monotonically increasing);
 * undefined means the feed has never been viewed.
 */
export function countCriticalAttention(
	events: BoothCriticalEvent[],
	lastSeenEventId: number | undefined,
): CriticalAttentionCounts {
	const seenMarker = lastSeenEventId ?? 0;
	let needsRefund = 0;
	let unseenOperational = 0;
	for (const { event } of joinCriticalEventsWithTransactions(events, [])) {
		if (isTransactionEvent(event)) {
			if (event.refund === null) needsRefund++;
		} else if (event.id > seenMarker) {
			unseenOperational++;
		}
	}
	return {
		needsRefund,
		unseenOperational,
		total: needsRefund + unseenOperational,
	};
}

const EVENT_GUIDANCE: Record<string, string> = {
	PRINTER_RECOVERY_FAILED: "Booth can't fix its printer — needs an on-site visit.",
};

/**
 * Operator guidance line for tags that imply a specific next step, or null
 * when the event's `details` speak for themselves.
 */
export function criticalEventGuidance(tag: CriticalEventTag): string | null {
	return EVENT_GUIDANCE[tag] ?? null;
}

/**
 * Join a list of critical events with their matching transactions by
 * `transaction_code`, de-duplicating events on
 * `(tag, occurred_at, transaction_code)` as the API docs recommend
 * (critical events use at-least-once delivery).
 *
 * The event list's ordering is preserved (API returns newest `occurred_at`
 * first, so the first occurrence of a dup wins). When `transaction_code`
 * is null, `event.id` is folded into the dedupe key so distinct null-code
 * events stay distinct.
 */
export function joinCriticalEventsWithTransactions(
	events: BoothCriticalEvent[],
	transactions: SyncedTransaction[],
): CriticalEventRow[] {
	const byCode = new Map<string, SyncedTransaction>();
	for (const tx of transactions) {
		byCode.set(tx.transaction_code, tx);
	}

	const seen = new Set<string>();
	const rows: CriticalEventRow[] = [];
	for (const event of events) {
		const codePart = event.transaction_code ?? `null:${event.id}`;
		const dedupeKey = `${event.tag}::${event.occurred_at}::${codePart}`;
		if (seen.has(dedupeKey)) continue;
		seen.add(dedupeKey);

		const transaction = event.transaction_code
			? (byCode.get(event.transaction_code) ?? null)
			: null;
		rows.push({ event, transaction });
	}
	return rows;
}

const KNOWN_STRANDED_REASONS: Record<string, string> = {
	payment_completion_handler_exception: "Payment completion failed",
	thank_you_navigation_failure: "Thank-you screen failed",
	print_thank_you_navigation_failure: "Post-print navigation failed",
	extra_prints_completion_failure: "Extra prints failed",
};

const KNOWN_EVENT_TAGS: Record<string, string> = {
	STRANDED_PAID_SESSION: "Stranded",
	PAYMENT_RESULT_INVALID: "Bad Payment",
	PRINT_JOB_STUCK: "Print Stuck",
	PRINT_JOB_ERROR: "Print Error",
	PRINTER_RECOVERY_FAILED: "Printer Down",
};

/**
 * Short, badge-friendly label for a critical event tag.
 * Falls back to a lowercased/space-joined form for unknown tags so newly
 * introduced cloud tags still render readably.
 */
export function formatCriticalEventTag(tag: CriticalEventTag): string {
	if (tag in KNOWN_EVENT_TAGS) return KNOWN_EVENT_TAGS[tag];
	return tag
		.toLowerCase()
		.split("_")
		.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
		.join(" ");
}

/**
 * Format a stranded-reason tag as a human-readable label.
 * Falls back to a title-cased version of the tag for unknown values so
 * new reasons introduced by the cloud are still readable.
 */
export function formatStrandedReason(
	reason: StrandedReason | null | undefined,
): string {
	if (!reason) return "Unknown reason";
	if (reason in KNOWN_STRANDED_REASONS) {
		return KNOWN_STRANDED_REASONS[reason];
	}
	// `String.prototype.split` always returns at least one element, so
	// `words[0]` is safe to index. Capitalize the first chunk and append the
	// rest space-joined.
	const words = reason.split("_");
	const head = words[0].charAt(0).toUpperCase() + words[0].slice(1);
	const tail = words.length > 1 ? " " + words.slice(1).join(" ") : "";
	return head + tail;
}
