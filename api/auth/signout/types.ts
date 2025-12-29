import { z } from "zod";

export const SignoutResponseSchema = z.object({
    message: z.string(),
});

export type SignoutResponse = z.infer<typeof SignoutResponseSchema>;