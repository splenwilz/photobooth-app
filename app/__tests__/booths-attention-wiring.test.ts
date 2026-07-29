/**
 * Booths tab — attention badge wiring contract
 *
 * The per-booth attention badges ride critical-events queries that are NOT
 * part of the overview fetch. These contracts pin the wiring that keeps the
 * badges honest:
 *  - pull-to-refresh must refetch the critical-events fan-out (fresh revenue
 *    next to stale badges reads as "all good"),
 *  - a failed fan-out must be surfaced (no badge ≠ no problems),
 *  - deleted booths must have their seen-markers pruned,
 *  - pre-hydration renders must not flash operational-incident counts.
 *
 * Verified via source inspection — rendering the screen requires mounting the
 * whole tab + navigation + every booth query (same approach as
 * booths-subscription-refresh.test.ts).
 */
import { readFileSync } from "fs";
import { join } from "path";

const BOOTHS_SOURCE = readFileSync(
	join(__dirname, "..", "(tabs)", "booths.tsx"),
	"utf8",
);

describe("app/(tabs)/booths.tsx — attention badge wiring", () => {
	it("refetches the critical-events fan-out on pull-to-refresh", () => {
		const refreshBlock = BOOTHS_SOURCE.match(
			/handleRefresh\s*=\s*useCallback\([\s\S]*?\}\s*,\s*\[[\s\S]*?\]\s*\)/,
		)?.[0];
		expect(refreshBlock).toBeTruthy();
		expect(refreshBlock).toMatch(/refetchQueries\(\{[\s\S]*?criticalEvents/);
	});

	it("surfaces fan-out errors instead of rendering badge-less booths silently", () => {
		expect(BOOTHS_SOURCE).toMatch(/isError:\s*attentionUnavailable/);
		expect(BOOTHS_SOURCE).toMatch(/attentionUnavailable\s*&&/);
	});

	it("prunes seen-markers against the overview's booth roster", () => {
		expect(BOOTHS_SOURCE).toMatch(
			/pruneBoothMarkers\(boothData\.booths\.map\(\(booth\) => booth\.booth_id\)\)/,
		);
	});

	it("suppresses operational counts until the seen-markers hydrate", () => {
		expect(BOOTHS_SOURCE).toMatch(
			/seenHydrated\s*\?\s*attention\.total\s*:\s*attention\.needsRefund/,
		);
	});

	it("passes the overflow flag so truncated feeds render a lower-bound badge", () => {
		expect(BOOTHS_SOURCE).toMatch(/attentionOverflow=\{/);
		expect(BOOTHS_SOURCE).toMatch(/truncatedByBooth\[booth\.id\]/);
	});
});
