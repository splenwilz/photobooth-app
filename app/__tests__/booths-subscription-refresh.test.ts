/**
 * Booth subscription freshness contract
 *
 * Bug: After creating a new booth and subscribing (subscription happens
 * outside the app via Stripe), the Booths screen kept showing the cached
 * `useBoothSubscriptions()` list (5-min staleTime), so the new/just-subscribed
 * booth showed "No Subscription" until a full app reload — even though the
 * single-booth endpoint (Settings) correctly reported `is_active: true`.
 *
 * Fix: the Booths screen must refetch the subscriptions list when it regains
 * focus (returning from the create/subscribe flow) and on pull-to-refresh.
 *
 * Verified via source inspection — rendering the screen requires mounting the
 * whole tab + navigation + every booth query, which is unnecessary complexity
 * for a wiring contract (same approach as booths-create-copy.test.ts).
 */
import { readFileSync } from "fs";
import { join } from "path";

const BOOTHS_SOURCE = readFileSync(
	join(__dirname, "..", "(tabs)", "booths.tsx"),
	"utf8",
);

describe("app/(tabs)/booths.tsx — subscription list freshness", () => {
	// Now delegated to the shared hook, which applies TanStack Query's
	// documented recipe: skip the first focus (that is the mount fetch) and
	// refetch only stale, active queries.
	it("uses the shared refresh-on-focus hook", () => {
		expect(BOOTHS_SOURCE).toMatch(
			/import\s*\{\s*useRefreshOnFocus\s*\}\s*from\s*"@\/hooks\/use-refresh-on-focus"/,
		);
	});

	it("captures the subscriptions refetch function from useBoothSubscriptions", () => {
		expect(BOOTHS_SOURCE).toMatch(/refetch:\s*refetchSubscriptions/);
	});

	it("refreshes the booth-subscriptions query on focus", () => {
		expect(BOOTHS_SOURCE).toMatch(
			/useRefreshOnFocus\(\s*queryKeys\.payments\.boothSubscriptions\(\)/,
		);
	});

	it("refreshes even when the cached list is still considered fresh", () => {
		// The list has a 5-minute staleTime and changes outside the app (kiosk
		// cancellations, web purchases). With the hook's default stale-only
		// filter, returning to this screen inside that window would refetch
		// nothing — which is exactly the window that matters.
		expect(BOOTHS_SOURCE).toMatch(/staleOnly:\s*false/);
	});

	it("no longer hand-rolls a focus refetch that fires on mount", () => {
		expect(BOOTHS_SOURCE).not.toMatch(
			/useFocusEffect\(\s*useCallback\(\s*\(\)\s*=>\s*\{\s*refetchSubscriptions\(\)/,
		);
	});

	it("refetches subscriptions on pull-to-refresh", () => {
		const refreshBlock = BOOTHS_SOURCE.match(
			/handleRefresh\s*=\s*useCallback\([\s\S]*?\}\s*,\s*\[[\s\S]*?\]\s*\)/,
		)?.[0];
		expect(refreshBlock).toBeTruthy();
		expect(refreshBlock).toMatch(/refetchSubscriptions/);
	});
});
