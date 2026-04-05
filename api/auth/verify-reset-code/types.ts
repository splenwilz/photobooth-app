import { z } from "zod";

export const VerifyResetCodeRequestSchema = z.object({
	code: z
		.string()
		.regex(/^\d{6}$/, { message: "Reset code must be 6 digits" }),
});

export type VerifyResetCodeRequest = z.infer<
	typeof VerifyResetCodeRequestSchema
>;

export interface VerifyResetCodeResponse {
	message: string;
	token: string;
}
