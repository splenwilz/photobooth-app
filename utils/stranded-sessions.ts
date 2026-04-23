/**
 * Stranded Paid Sessions Utilities
 *
 * Pure helpers for joining and formatting the data powering the
 * "needs attention" screens.
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
 * booth re-synced the stranded marker).
 */
export interface StrandedSessionRow {
	event: BoothCriticalEvent;
	transaction: SyncedTransaction | null;
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
): StrandedSessionRow[] {
	const byCode = new Map<string, SyncedTransaction>();
	for (const tx of transactions) {
		byCode.set(tx.transaction_code, tx);
	}

	const seen = new Set<string>();
	const rows: StrandedSessionRow[] = [];
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
