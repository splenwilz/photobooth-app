/**
 * Machine-readable error codes on ApiError.
 *
 * The backend distinguishes billing conflicts by code (`period_elapsed`,
 * `not_scheduled_to_cancel`, `flow_not_available`, `invalid_return_url`, …) so
 * the client can route the user correctly instead of dumping a sentence into
 * an alert. `parseErrorResponse` flattens the body to a display string, which
 * discards the code — `extractErrorCode` recovers it without changing the
 * message behaviour every existing caller relies on.
 */
import { extractErrorCode } from "@/api/client";
import {
	BOOTH_BILLING_ERROR_CODES,
	isBoothBillingErrorCode,
} from "@/api/payments/types";

describe("extractErrorCode", () => {
	it("reads a code from a structured FastAPI detail object", () => {
		expect(
			extractErrorCode({ detail: { code: "period_elapsed", message: "Ended" } }),
		).toBe("period_elapsed");
	});

	it("reads a top-level code", () => {
		expect(extractErrorCode({ code: "flow_not_available" })).toBe(
			"flow_not_available",
		);
	});

	it("reads a bare string detail that is a snake_case code", () => {
		expect(extractErrorCode({ detail: "not_scheduled_to_cancel" })).toBe(
			"not_scheduled_to_cancel",
		);
	});

	it("ignores a prose detail that merely contains underscores mid-sentence", () => {
		expect(
			extractErrorCode({ detail: "The return_url you sent is not allowed." }),
		).toBeUndefined();
	});

	it("ignores prose with spaces", () => {
		expect(extractErrorCode({ detail: "Subscription already ended" })).toBeUndefined();
	});

	it("returns undefined for shapes carrying no code", () => {
		expect(extractErrorCode({ detail: [{ msg: "field required" }] })).toBeUndefined();
		expect(extractErrorCode({})).toBeUndefined();
		expect(extractErrorCode(null)).toBeUndefined();
		expect(extractErrorCode("plain text")).toBeUndefined();
		expect(extractErrorCode(undefined)).toBeUndefined();
	});

	it("does not treat an error_code alias as prose", () => {
		expect(extractErrorCode({ error_code: "stripe_unavailable" })).toBe(
			"stripe_unavailable",
		);
	});
});

describe("isBoothBillingErrorCode", () => {
	// Extraction is deliberately permissive, so the UI narrows before routing.
	// Without this guard a bare `{"detail": "unauthorized"}` would populate
	// ApiError.code and could match a branch by accident.
	it("accepts every code the app routes on", () => {
		// Iterate the source array, not a copy: a duplicated list drifts silently
		// the moment a code is added on one side only.
		for (const code of BOOTH_BILLING_ERROR_CODES) {
			expect(isBoothBillingErrorCode(code)).toBe(true);
		}
	});

	it("rejects single-word prose that parses as a code", () => {
		expect(isBoothBillingErrorCode("unauthorized")).toBe(false);
		expect(isBoothBillingErrorCode("error")).toBe(false);
		expect(isBoothBillingErrorCode("none")).toBe(false);
		expect(isBoothBillingErrorCode(undefined)).toBe(false);
	});

	it("rejects a near-miss typo rather than matching loosely", () => {
		expect(isBoothBillingErrorCode("period_elasped")).toBe(false);
	});
});
