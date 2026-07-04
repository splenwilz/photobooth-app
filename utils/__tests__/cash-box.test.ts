/**
 * Tests for cash-box helpers.
 *
 * Semantics under test (see Cash Box API docs):
 * - bill1_inserted + bill2_inserted >= expected_total; a positive gap is
 *   cash paid out of the till as refunds (normal, never an error).
 * - The gap must never be negative even if the backend invariant breaks.
 * - Freshness: heartbeat cadence is ~30s; a snapshot older than the
 *   threshold means the booth is likely offline.
 */

import { getCashBoxFreshness, getCashBoxRefundGap } from "../cash-box";

describe("getCashBoxRefundGap", () => {
	it("returns the gap when inserted sum exceeds expected total", () => {
		expect(
			getCashBoxRefundGap({
				expected_total: 100,
				bill1_inserted: 55,
				bill2_inserted: 50,
			}),
		).toBe(5);
	});

	it("returns 0 when inserted sum equals expected total", () => {
		expect(
			getCashBoxRefundGap({
				expected_total: 35,
				bill1_inserted: 20,
				bill2_inserted: 15,
			}),
		).toBe(0);
	});

	it("clamps to 0 when inserted sum is below expected total (backend invariant violation)", () => {
		expect(
			getCashBoxRefundGap({
				expected_total: 50,
				bill1_inserted: 10,
				bill2_inserted: 10,
			}),
		).toBe(0);
	});

	it("returns 0 for an all-zero cash box", () => {
		expect(
			getCashBoxRefundGap({
				expected_total: 0,
				bill1_inserted: 0,
				bill2_inserted: 0,
			}),
		).toBe(0);
	});

	it("returns exact cent values for positive gaps (no float noise)", () => {
		expect(
			getCashBoxRefundGap({
				expected_total: 0.1,
				bill1_inserted: 0.2,
				bill2_inserted: 0.1,
			}),
		).toBe(0.2);
	});

	it("rounds float residue to exactly 0 so no phantom refund line renders", () => {
		// 0.2 + 0.1 - 0.3 === 5.55e-17 in IEEE 754; unrounded this passes a
		// `gap > 0` check and renders "$0.00 paid out as refunds".
		expect(
			getCashBoxRefundGap({
				expected_total: 0.3,
				bill1_inserted: 0.2,
				bill2_inserted: 0.1,
			}),
		).toBe(0);
	});

	it("rounds sub-cent residue on larger amounts to exact cents", () => {
		expect(
			getCashBoxRefundGap({
				expected_total: 100.3,
				bill1_inserted: 100.1,
				bill2_inserted: 0.2,
			}),
		).toBe(0);
	});
});

describe("getCashBoxFreshness", () => {
	const now = new Date("2026-07-04T12:00:00Z");

	it("returns 'unknown' for a null updated_at", () => {
		expect(getCashBoxFreshness(null, now)).toBe("unknown");
	});

	it("returns 'fresh' for a snapshot 30 seconds old", () => {
		expect(getCashBoxFreshness("2026-07-04T11:59:30Z", now)).toBe("fresh");
	});

	it("returns 'stale' for a snapshot 10 minutes old", () => {
		expect(getCashBoxFreshness("2026-07-04T11:50:00Z", now)).toBe("stale");
	});

	it("treats exactly the threshold age as fresh", () => {
		expect(getCashBoxFreshness("2026-07-04T11:58:00Z", now)).toBe("fresh");
	});

	it("respects a custom threshold", () => {
		expect(getCashBoxFreshness("2026-07-04T11:59:30Z", now, 10_000)).toBe(
			"stale",
		);
	});

	it("returns 'unknown' for an unparseable timestamp", () => {
		expect(getCashBoxFreshness("not-a-date", now)).toBe("unknown");
	});
});
