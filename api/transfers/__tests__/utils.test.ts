/**
 * Transfer display utils tests — expiry is stamped lazily server-side, so a
 * pending row past `expires_at` must render as expired client-side.
 */
import { displayStatus, formatTimeRemaining } from "../utils";

const NOW = Date.parse("2026-08-06T12:00:00Z");

describe("displayStatus", () => {
	it("keeps a pending transfer pending before expiry", () => {
		expect(
			displayStatus(
				{ status: "pending", expires_at: "2026-08-13T12:00:00Z" },
				NOW,
			),
		).toBe("pending");
	});

	it("renders a pending transfer past expires_at as expired (server stamps lazily)", () => {
		expect(
			displayStatus(
				{ status: "pending", expires_at: "2026-08-06T11:59:59Z" },
				NOW,
			),
		).toBe("expired");
	});

	it("leaves terminal statuses alone even with a past expiry", () => {
		expect(
			displayStatus(
				{ status: "completed", expires_at: "2026-08-01T00:00:00Z" },
				NOW,
			),
		).toBe("completed");
	});

	it("keeps pending on an unparseable expiry instead of guessing expired", () => {
		expect(
			displayStatus({ status: "pending", expires_at: "not-a-date" }, NOW),
		).toBe("pending");
	});
});

describe("formatTimeRemaining", () => {
	it("formats days and hours", () => {
		expect(formatTimeRemaining("2026-08-13T11:00:00Z", NOW)).toBe("6d 23h");
	});

	it("formats hours and minutes", () => {
		expect(formatTimeRemaining("2026-08-06T17:12:00Z", NOW)).toBe("5h 12m");
	});

	it("formats minutes only", () => {
		expect(formatTimeRemaining("2026-08-06T12:42:00Z", NOW)).toBe("42m");
	});

	it("formats the last sub-minute stretch", () => {
		expect(formatTimeRemaining("2026-08-06T12:00:30Z", NOW)).toBe(
			"less than a minute",
		);
	});

	it("returns null once expired", () => {
		expect(formatTimeRemaining("2026-08-06T11:00:00Z", NOW)).toBeNull();
	});

	it("returns null for unparseable timestamps", () => {
		expect(formatTimeRemaining("garbage", NOW)).toBeNull();
	});
});
