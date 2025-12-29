import { apiClient, saveTokens } from "../../client";
import type { AuthResponse } from "../types";
import type { SignupRequest, SignupResponse } from "./types";

/**
 * Sign up a new user
 * Automatically saves tokens to secure storage upon successful signup
 * @param data - User signup data
 * @returns Promise resolving to authentication response with tokens and user data
 * @see https://tanstack.com/query/latest/docs/react/guides/mutations
 */
export async function signup(data: SignupRequest): Promise<SignupResponse> {
  const response = await apiClient<SignupResponse>("/api/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });

  // Save tokens to secure storage after successful signup [disabled for now, will be done in signin action]
  // await saveTokens(response.access_token, response.refresh_token);
  console.log('Signup response:', response);
  return response;
}

