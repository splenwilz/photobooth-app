/**
 * Verify Reset Code Types Tests
 *
 * Tests for Zod schema validation of verify-reset-code request.
 * This endpoint only takes a 6-digit code — passwords are handled by /reset-password.
 */

import { VerifyResetCodeRequestSchema } from "../types";

describe("VerifyResetCodeRequestSchema", () => {
	it("validates a correct request", () => {
		const result = VerifyResetCodeRequestSchema.safeParse({ code: "123456" });
		expect(result.success).toBe(true);
	});

	it("rejects code shorter than 6 digits", () => {
		const result = VerifyResetCodeRequestSchema.safeParse({ code: "12345" });
		expect(result.success).toBe(false);
	});

	it("rejects code with non-numeric characters", () => {
		const result = VerifyResetCodeRequestSchema.safeParse({ code: "12345a" });
		expect(result.success).toBe(false);
	});

	it("rejects code longer than 6 digits", () => {
		const result = VerifyResetCodeRequestSchema.safeParse({ code: "1234567" });
		expect(result.success).toBe(false);
	});

	it("rejects empty code", () => {
		const result = VerifyResetCodeRequestSchema.safeParse({ code: "" });
		expect(result.success).toBe(false);
	});

	it("rejects empty object (missing code field)", () => {
		const result = VerifyResetCodeRequestSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});
