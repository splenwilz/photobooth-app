import { apiClient, clearTokens, clearQueryCache } from "@/api/client";
import type { SignoutResponse } from "./types";

/**
 * Sign out the current user
 * Clears tokens, React Query cache, and calls backend logout endpoint
 */
export const signout = async (): Promise<SignoutResponse> => {
    try {
        // Call backend logout endpoint
        const response = await apiClient<SignoutResponse>("/api/v1/auth/logout", {
            method: "POST",
        });

        // Clear tokens and cache regardless of API response
        // This ensures local state is cleared even if backend call fails
        await clearTokens();
        clearQueryCache();

        return response;
    } catch (error) {
        // Even if logout API fails, clear local state
        await clearTokens();
        clearQueryCache();
        throw error;
    }
};