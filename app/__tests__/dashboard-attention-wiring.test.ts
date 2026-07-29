/**
 * Dashboard — critical-events error surfacing wiring contract
 *
 * A failed critical-events fetch with no attention card rendered would read
 * as "all good" for a refund-money signal. These contracts pin the error
 * handling added to the dashboard (mirroring the Booths tab).
 *
 * Verified via source inspection — rendering the dashboard requires
 * mounting every overview/detail query (same approach as
 * booths-attention-wiring.test.ts).
 */
import { readFileSync } from "fs";
import { join } from "path";

const DASHBOARD_SOURCE = readFileSync(
	join(__dirname, "..", "(tabs)", "index.tsx"),
	"utf8",
);

describe("app/(tabs)/index.tsx — critical-events error surfacing", () => {
	it("captures the error state from useBoothCriticalEvents", () => {
		expect(DASHBOARD_SOURCE).toMatch(/error:\s*criticalEventsError/);
	});

	it("derives attentionUnavailable only when no card will render", () => {
		expect(DASHBOARD_SOURCE).toMatch(
			/attentionUnavailable\s*=\s*!!criticalEventsError\s*&&\s*attentionCount\s*===\s*0/,
		);
	});

	it("renders the unavailable note gated on attentionUnavailable", () => {
		expect(DASHBOARD_SOURCE).toMatch(
			/attentionUnavailable\s*&&\s*\(/,
		);
		expect(DASHBOARD_SOURCE).toMatch(
			/Couldn&apos;t check critical events\. Pull to retry\./,
		);
	});
});
