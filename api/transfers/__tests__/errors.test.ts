/**
 * Transfer error mapping tests.
 *
 * The backend reports transfer errors as `detail: { code, message }`. The
 * client lifts `code` onto ApiError.code and (for transfers) passes the whole
 * detail object through on ApiError.detail. These helpers branch on the code,
 * never on message text.
 */
import { ApiError } from "../../client";
import {
	getSubscriptionIncludedDetail,
	getTransferErrorCode,
	transferErrorMessage,
} from "../errors";

function apiError(
	status: number,
	detail: { code?: string; message?: string; [key: string]: unknown } | undefined,
	retryAfterSeconds?: number,
): ApiError {
	return new ApiError(
		status,
		detail?.message ?? "raw message",
		undefined,
		false,
		detail?.code,
		detail,
		retryAfterSeconds,
	);
}

describe("getTransferErrorCode", () => {
	it("reads the structured code from the error", () => {
		expect(
			getTransferErrorCode(apiError(409, { code: "self_transfer", message: "x" })),
		).toBe("self_transfer");
	});

	it("returns null for unstructured errors and non-ApiErrors", () => {
		expect(getTransferErrorCode(apiError(500, undefined))).toBeNull();
		expect(getTransferErrorCode(apiError(409, { message: "no code" }))).toBeNull();
		expect(getTransferErrorCode(new Error("boom"))).toBeNull();
		expect(getTransferErrorCode(null)).toBeNull();
	});
});

describe("transferErrorMessage", () => {
	it("maps known codes to friendly copy", () => {
		expect(
			transferErrorMessage(
				apiError(409, { code: "transfer_already_pending", message: "x" }),
			),
		).toContain("already has a pending transfer offer");
		expect(
			transferErrorMessage(
				apiError(410, { code: "transfer_expired", message: "x" }),
			),
		).toContain("expired");
		expect(
			transferErrorMessage(
				apiError(403, { code: "not_addressed_to_you", message: "x" }),
			),
		).toContain("different email address");
	});

	it("includes the Retry-After window for rate limits", () => {
		expect(
			transferErrorMessage(
				apiError(429, { code: "rate_limited", message: "x" }, 300),
			),
		).toContain("in 5 minutes");
		// No header → generic timing
		expect(
			transferErrorMessage(apiError(429, { code: "rate_limited", message: "x" })),
		).toContain("later");
		// Pathological header values fall back to generic timing too
		expect(
			transferErrorMessage(
				apiError(429, { code: "rate_limited", message: "x" }, 99999999999),
			),
		).toContain("later");
	});

	it("falls back to detail.message, then the error message, for unknown codes", () => {
		expect(
			transferErrorMessage(
				apiError(409, { code: "brand_new_code", message: "Server says no" }),
			),
		).toBe("Server says no");
		expect(transferErrorMessage(apiError(500, undefined))).toBe("raw message");
		expect(transferErrorMessage(new Error("plain failure"))).toBe(
			"plain failure",
		);
	});
});

describe("getSubscriptionIncludedDetail", () => {
	it("extracts included_until from the checkout guard 409", () => {
		expect(
			getSubscriptionIncludedDetail(
				apiError(409, {
					code: "subscription_included",
					message: "…",
					included_until: "2026-09-01T00:00:00Z",
				}),
			),
		).toEqual({
			code: "subscription_included",
			message: "…",
			included_until: "2026-09-01T00:00:00Z",
		});
	});

	it("normalizes a missing included_until to null (webhook-lag window)", () => {
		expect(
			getSubscriptionIncludedDetail(
				apiError(409, { code: "subscription_included", message: "…" }),
			)?.included_until,
		).toBeNull();
	});

	it("returns null for other errors", () => {
		expect(
			getSubscriptionIncludedDetail(
				apiError(409, { code: "self_transfer", message: "x" }),
			),
		).toBeNull();
		expect(getSubscriptionIncludedDetail(null)).toBeNull();
	});
});
