/**
 * Rewrite raw minute counts in server-composed prose into human units.
 *
 * Alert messages are composed server-side when the alert is created and can
 * embed values like "2946 minutes ago". The durable fix is server-side
 * (compose at fetch time, humanized); until then this display-time pass
 * converts any "N minutes ago" of an hour or more into hours/days. Counts
 * under an hour are left exactly as written.
 */
export function humanizeDurationsInText(text: string): string {
	// The prefix group rejects digit/separator/sign prefixes so grouped or
	// signed counts ("1,440", "-75", "2.5") are left verbatim instead of
	// splicing a partial match ("1,440" must never become "1,7 hours").
	return text.replace(
		/(^|[^\d.,-])(\d+)\s+minutes?\s+ago\b/gi,
		(match, prefix, raw) => {
			const minutes = Number(raw);
			if (!Number.isFinite(minutes) || minutes < 60) return match;
			const days = Math.floor(minutes / 1440);
			if (days >= 1) return `${prefix}${days} day${days === 1 ? "" : "s"} ago`;
			const hours = Math.floor(minutes / 60);
			return `${prefix}${hours} hour${hours === 1 ? "" : "s"} ago`;
		},
	);
}
