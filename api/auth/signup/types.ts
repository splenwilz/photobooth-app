import { z } from "zod";
import { AuthUser } from "../types";

/**
 * Schema for user signup/registration request
 * Matches the backend API expectations
 */
export const SignupRequestSchema = z.object({
  first_name: z.string().min(2).max(50).optional(),
  last_name: z.string().min(2).max(50).optional(),
  email: z.email({ message: "Invalid email address" }),
  password: z.string().min(8),
  confirm_password: z.string().min(8),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

export interface SignupResponse {
  user: AuthUser;
  message: string;
  is_verified: boolean;
}

export type SignupRequest = z.infer<typeof SignupRequestSchema>;

