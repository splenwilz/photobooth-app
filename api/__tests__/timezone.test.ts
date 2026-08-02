/**
 * Operator timezone contract (analytics tz parameter)
 *
 * Period aggregates ("today", "this week"…) are sliced server-side on the
 * operator's calendar, so every analytics/overview request must carry the
 * device's IANA zone — and every cache key must include it so a zone change
 * never serves stale UTC-sliced data.
 */
import { ApiError } from "@/api/client";
import * as Localization from "expo-localization";
import {
	operatorTz,
	refreshOperatorTz,
	withTzFallback,
} from "@/api/utils/timezone";
import { queryKeys } from "@/api/utils/query-keys";

// The native calendar read is the primary zone source (Hermes caches the
// Intl zone at engine start, so Intl alone can't see mid-session changes).
jest.mock("expo-localization", () => ({ getCalendars: jest.fn(() => []) }));
const mockGetCalendars = Localization.getCalendars as jest.Mock;

describe("operatorTz", () => {
	const realDateTimeFormat = Intl.DateTimeFormat;

	afterEach(() => {
		Intl.DateTimeFormat = realDateTimeFormat;
		mockGetCalendars.mockReset().mockReturnValue([]);
		jest.restoreAllMocks();
		refreshOperatorTz();
	});

	function mockIntlZone(timeZone: unknown) {
		Intl.DateTimeFormat = jest.fn().mockReturnValue({
			resolvedOptions: () => ({ timeZone }),
		}) as unknown as typeof Intl.DateTimeFormat;
	}

	it("returns the device IANA zone from Intl when no native source", () => {
		mockIntlZone("Africa/Lagos");
		expect(refreshOperatorTz()).toBe("Africa/Lagos");
		expect(operatorTz()).toBe("Africa/Lagos");
	});

	it("prefers the native calendar zone over Intl (Hermes zone cache)", () => {
		mockGetCalendars.mockReturnValue([{ timeZone: "America/Los_Angeles" }]);
		mockIntlZone("Africa/Lagos");
		expect(refreshOperatorTz()).toBe("America/Los_Angeles");
	});

	it("falls back to Intl when the native module throws", () => {
		mockGetCalendars.mockImplementation(() => {
			throw new Error("native module missing");
		});
		mockIntlZone("Africa/Lagos");
		expect(refreshOperatorTz()).toBe("Africa/Lagos");
	});

	it("caches the zone until refreshed", () => {
		mockIntlZone("Africa/Lagos");
		refreshOperatorTz();
		mockIntlZone("America/Los_Angeles");
		expect(operatorTz()).toBe("Africa/Lagos"); // cached
		expect(refreshOperatorTz()).toBe("America/Los_Angeles");
		expect(operatorTz()).toBe("America/Los_Angeles");
	});

	it("falls back to UTC when the zone is missing", () => {
		mockIntlZone(undefined);
		expect(refreshOperatorTz()).toBe("UTC");
	});

	it("falls back to UTC when the zone exceeds 64 chars", () => {
		mockIntlZone("A".repeat(65));
		expect(refreshOperatorTz()).toBe("UTC");
	});

	it("falls back to UTC when every source throws", () => {
		mockGetCalendars.mockImplementation(() => {
			throw new Error("boom");
		});
		Intl.DateTimeFormat = jest.fn(() => {
			throw new Error("boom");
		}) as unknown as typeof Intl.DateTimeFormat;
		expect(refreshOperatorTz()).toBe("UTC");
	});
});

describe("withTzFallback", () => {
	const realDateTimeFormat = Intl.DateTimeFormat;

	beforeEach(() => {
		Intl.DateTimeFormat = jest.fn().mockReturnValue({
			resolvedOptions: () => ({ timeZone: "Africa/Lagos" }),
		}) as unknown as typeof Intl.DateTimeFormat;
		refreshOperatorTz();
	});

	afterEach(() => {
		Intl.DateTimeFormat = realDateTimeFormat;
		refreshOperatorTz();
	});

	it("invokes the request with the device zone", async () => {
		const request = jest.fn().mockResolvedValue("ok");
		await expect(withTzFallback(request)).resolves.toBe("ok");
		expect(request).toHaveBeenCalledWith("Africa/Lagos");
	});

	it("retries once with UTC when the API rejects the zone", async () => {
		const request = jest
			.fn()
			.mockRejectedValueOnce(
				new ApiError(400, "Unknown IANA timezone: 'Africa/Lagos'"),
			)
			.mockResolvedValueOnce("ok");
		await expect(withTzFallback(request)).resolves.toBe("ok");
		expect(request).toHaveBeenNthCalledWith(1, "Africa/Lagos");
		expect(request).toHaveBeenNthCalledWith(2, "UTC");
	});

	it("does not retry on unrelated 400s", async () => {
		const request = jest
			.fn()
			.mockRejectedValue(new ApiError(400, "Invalid booth id"));
		await expect(withTzFallback(request)).rejects.toThrow("Invalid booth id");
		expect(request).toHaveBeenCalledTimes(1);
	});

	it("does not retry on server errors", async () => {
		const request = jest
			.fn()
			.mockRejectedValue(new ApiError(500, "Unknown IANA timezone parser"));
		await expect(withTzFallback(request)).rejects.toThrow();
		expect(request).toHaveBeenCalledTimes(1);
	});
});

describe("tz in cache keys", () => {
	it("booths overview key includes the operator zone", () => {
		expect(queryKeys.booths.overview()).toContain(operatorTz());
	});

	it("dashboard overview key includes the operator zone", () => {
		expect(queryKeys.dashboard.overview()).toContain(operatorTz());
	});

	it("booth detail key includes the operator zone", () => {
		expect(queryKeys.booths.detail("b1")).toContain(operatorTz());
	});

	it("analytics dashboard key includes the operator zone", () => {
		expect(queryKeys.analytics.dashboard()).toContain(operatorTz());
	});

	it("analytics booth revenue key includes the operator zone", () => {
		expect(queryKeys.analytics.boothRevenue("b1")).toContain(operatorTz());
	});
});

/**
 * The tz suffix must not silently break prefix-based invalidation: mutations
 * invalidate via tz-LESS prefixes so they reach every zone's cache entries
 * AND keep the historical booths.overview ⊂ dashboard.overview relationship.
 */
describe("tz-less invalidation prefixes", () => {
	const isPrefixOf = (prefix: readonly unknown[], key: readonly unknown[]) =>
		prefix.every((part, i) => key[i] === part);

	it("overviewAll() prefixes both the booths and dashboard overview keys", () => {
		const prefix = queryKeys.booths.overviewAll();
		expect(isPrefixOf(prefix, queryKeys.booths.overview())).toBe(true);
		expect(isPrefixOf(prefix, queryKeys.dashboard.overview())).toBe(true);
	});

	it("detailPrefix(id) prefixes detail(id) regardless of zone", () => {
		const prefix = queryKeys.booths.detailPrefix("b1");
		expect(isPrefixOf(prefix, queryKeys.booths.detail("b1"))).toBe(true);
		expect(isPrefixOf(prefix, queryKeys.booths.detail("b2"))).toBe(false);
	});

	it("detailAll() prefixes detailPrefix(id)", () => {
		const prefix = queryKeys.booths.detailAll();
		expect(isPrefixOf(prefix, queryKeys.booths.detailPrefix("b1"))).toBe(true);
	});
});
