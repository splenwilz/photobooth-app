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
	it("imports useFocusEffect to refetch on screen focus", () => {
		expect(BOOTHS_SOURCE).toMatch(
			/import\s*\{[^}]*useFocusEffect[^}]*\}\s*from\s*"@react-navigation\/native"/,
		);
	});

	it("captures the subscriptions refetch function from useBoothSubscriptions", () => {
		expect(BOOTHS_SOURCE).toMatch(/refetch:\s*refetchSubscriptions/);
	});

	it("refetches subscriptions inside a useFocusEffect", () => {
		const focusBlock = BOOTHS_SOURCE.match(
			/useFocusEffect\([\s\S]*?\)\s*;/,
		)?.[0];
		expect(focusBlock).toBeTruthy();
		expect(focusBlock).toMatch(/refetchSubscriptions\(\)/);
	});

	it("refetches subscriptions on pull-to-refresh", () => {
		const refreshBlock = BOOTHS_SOURCE.match(
			/handleRefresh\s*=\s*useCallback\([\s\S]*?\}\s*,\s*\[[\s\S]*?\]\s*\)/,
		)?.[0];
		expect(refreshBlock).toBeTruthy();
		expect(refreshBlock).toMatch(/refetchSubscriptions/);
	});
});
