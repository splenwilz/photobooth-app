import * as SecureStore from "expo-secure-store";
import type { AuthUser } from "./auth/types";
import { queryClient } from "./query-client";

// SecureStore keys - exported for use in clear data functionality
export const ACCESS_TOKEN_KEY = "auth_access_token";
export const REFRESH_TOKEN_KEY = "auth_refresh_token";
export const USER_STORAGE_KEY = "auth_user";
export const PENDING_PASSWORD_KEY = "auth_pending_password";
export const PENDING_RESET_EMAIL_KEY = "auth_pending_reset_email";
export const PENDING_RESET_TOKEN_KEY = "auth_pending_reset_token";

/**
 * Custom error class for API errors with status code and parsed error message
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public originalError?: unknown,
    public isSessionExpired: boolean = false,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Pydantic validation error structure
 */
interface ValidationError {
  type?: string;
  loc?: (string | number)[];
  msg?: string;
  input?: unknown;
}

/**
 * Parse Pydantic/FastAPI validation error array
 * Converts validation errors to user-friendly messages
 */
function parseValidationErrors(errorArray: unknown[]): string {
  if (!Array.isArray(errorArray) || errorArray.length === 0) {
    return "Validation error occurred";
  }

  const messages = errorArray.map((error: unknown) => {
    if (typeof error === "object" && error !== null) {
      const validationError = error as ValidationError;
      const field =
        validationError.loc?.[validationError.loc.length - 1] || "field";
      const message = validationError.msg || "Invalid value";

      // Create user-friendly field names
      const fieldName = String(field)
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .trim()
        .split(" ")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      return `${fieldName}: ${message}`;
    }
    return String(error);
  });

  return messages.join(". ");
}

/**
 * Parse error response from API
 * Extracts error message from JSON response (detail or message field)
 * Handles Pydantic validation errors (array format)
 * Ensures a string is always returned, even if the error field is an object
 */
async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const errorText = await response.text();

    // If response is empty (e.g., 204 No Content), return a default message
    if (!errorText || errorText.trim().length === 0) {
      return response.statusText || "An error occurred";
    }

    // Check if response is HTML (server error page, ngrok offline, etc.)
    if (
      errorText.trim().startsWith("<!DOCTYPE") ||
      errorText.trim().startsWith("<html")
    ) {
      // Try to extract meaningful message from ngrok error page
      if (errorText.includes("ngrok") && errorText.includes("offline")) {
        return "Server is offline. Please check your connection.";
      }
      if (errorText.includes("502") || errorText.includes("Bad Gateway")) {
        return "Server is temporarily unavailable. Please try again later.";
      }
      if (
        errorText.includes("503") ||
        errorText.includes("Service Unavailable")
      ) {
        return "Service is temporarily unavailable. Please try again later.";
      }
      return "Server is unreachable. Please check your connection.";
    }

    // Try to parse as JSON
    const errorJson = JSON.parse(errorText);

    // Extract detail or message field (common API error formats)
    const errorValue = errorJson.detail || errorJson.message || errorText;

    // Handle Pydantic validation errors (array format)
    if (Array.isArray(errorValue)) {
      return parseValidationErrors(errorValue);
    }

    // Ensure we always return a string
    if (typeof errorValue === "string") {
      return errorValue;
    }

    // If it's an object, try to extract a meaningful message or stringify it
    if (typeof errorValue === "object" && errorValue !== null) {
      // Try common nested error message fields
      if (errorValue.message && typeof errorValue.message === "string") {
        return errorValue.message;
      }
      if (errorValue.error && typeof errorValue.error === "string") {
        return errorValue.error;
      }
      // Fallback: stringify the object
      return JSON.stringify(errorValue);
    }

    // Fallback to error text
    return errorText || response.statusText || "An error occurred";
  } catch {
    // If parsing fails, use status text
    return response.statusText || "An error occurred";
  }
}

export function getApiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (url) return url;
  throw new Error(
    "API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL.",
  );
}

/**
 * Get access token from secure storage
 * @see https://docs.expo.dev/versions/latest/sdk/securestore/
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error("[API] Failed to get access token:", error);
    return null;
  }
}

/**
 * Get refresh token from secure storage
 */
async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error("[API] Failed to get refresh token:", error);
    return null;
  }
}

/**
 * Save tokens to secure storage
 */
export async function saveTokens(
  accessToken: string,
  refreshToken?: string,
): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
    // Reset redirect flag on successful login/token save
    isRedirectingToLogin = false;
  } catch (error) {
    console.error("[API] Failed to save tokens:", error);
    throw error;
  }
}

/**
 * Persist the authenticated user profile
 */
export async function saveUser(user: AuthUser): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("[API] Failed to save user:", error);
    throw error;
  }
}

/**
 * Retrieve the cached user profile
 */
export async function getStoredUser(): Promise<AuthUser | null> {
  try {
    const stored = await SecureStore.getItemAsync(USER_STORAGE_KEY);
    if (!stored) return null;
    const user = JSON.parse(stored) as AuthUser;
    // Backward compat: old cached users may lack newer fields
    if (user.use_display_name_on_booths === undefined) {
      user.use_display_name_on_booths = false;
    }
    return user;
  } catch (error) {
    console.error("[API] Failed to read stored user:", error);
    return null;
  }
}

/**
 * Save pending password to secure storage (for email verification resend)
 * This is temporarily stored during email verification flow
 */
export async function savePendingPassword(password: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PENDING_PASSWORD_KEY, password);
  } catch (error) {
    console.error("[API] Failed to save pending password:", error);
    throw error;
  }
}

/**
 * Retrieve pending password from secure storage
 */
export async function getPendingPassword(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PENDING_PASSWORD_KEY);
  } catch (error) {
    console.error("[API] Failed to read pending password:", error);
    return null;
  }
}

/**
 * Clear pending password from secure storage
 */
export async function clearPendingPassword(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_PASSWORD_KEY);
  } catch (error) {
    console.error("[API] Failed to clear pending password:", error);
  }
}

/**
 * Save pending reset email to secure storage (for password reset flow)
 */
export async function savePendingResetEmail(email: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PENDING_RESET_EMAIL_KEY, email);
  } catch (error) {
    console.error("[API] Failed to save pending reset email:", error);
    throw error;
  }
}

/**
 * Retrieve pending reset email from secure storage
 */
export async function getPendingResetEmail(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PENDING_RESET_EMAIL_KEY);
  } catch (error) {
    console.error("[API] Failed to read pending reset email:", error);
    return null;
  }
}

/**
 * Clear pending reset email from secure storage
 */
export async function clearPendingResetEmail(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_RESET_EMAIL_KEY);
  } catch (error) {
    console.error("[API] Failed to clear pending reset email:", error);
  }
}

/**
 * Save pending reset token to secure storage (for password reset flow step 3)
 */
export async function savePendingResetToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PENDING_RESET_TOKEN_KEY, token);
  } catch (error) {
    console.error("[API] Failed to save pending reset token:", error);
    throw error;
  }
}

/**
 * Retrieve pending reset token from secure storage
 */
export async function getPendingResetToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PENDING_RESET_TOKEN_KEY);
  } catch (error) {
    console.error("[API] Failed to read pending reset token:", error);
    return null;
  }
}

/**
 * Clear pending reset token from secure storage
 */
export async function clearPendingResetToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_RESET_TOKEN_KEY);
  } catch (error) {
    console.error("[API] Failed to clear pending reset token:", error);
  }
}

/**
 * Clear all pending password reset data from secure storage.
 * Call on explicit logout or when the reset flow completes/is abandoned.
 * Intentionally separate from clearTokens so that an unrelated session
 * expiry does not abort an in-progress reset flow.
 */
export async function clearPendingResetData(): Promise<void> {
  await clearPendingResetEmail();
  await clearPendingResetToken();
}

/**
 * Clear tokens from secure storage (on logout)
 */
export async function clearTokens(): Promise<void> {
  try {
    console.log("[API] [TOKEN] Clearing all tokens and user data");
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
    await SecureStore.deleteItemAsync(PENDING_PASSWORD_KEY);
    // Note: PENDING_RESET_EMAIL_KEY and PENDING_RESET_TOKEN_KEY are intentionally
    // NOT cleared here — they are managed by the reset flow itself so that an
    // unrelated session expiry does not abort a password reset in progress.
    console.log("[API] [TOKEN] All tokens cleared successfully");
  } catch (error) {
    console.error("[API] [TOKEN] Failed to clear tokens:", error);
  }
}

/**
 * Clear React Query cache
 * Should be called on logout and signin to prevent stale data from previous user
 */
export function clearQueryCache(): void {
  try {
    queryClient.clear();
  } catch (error) {
    console.error("[API] Failed to clear query cache:", error);
  }
}

// Global refresh lock to prevent parallel token refreshes
// If multiple requests hit 401 simultaneously, they'll share the same refresh
let refreshPromise: Promise<boolean> | null = null;

// Global flag to prevent multiple redirects when session expires
let isRedirectingToLogin = false;

/**
 * Handle session expiration by redirecting to login
 * Uses dynamic import to avoid React context issues
 */
async function handleSessionExpiration(): Promise<void> {
  // Prevent multiple redirects if already redirecting
  if (isRedirectingToLogin) {
    return;
  }

  isRedirectingToLogin = true;

  try {
    // NOTE: Do NOT clear query cache here. Clearing the cache before errors
    // propagate causes useQuery hooks to re-enter loading state (skeleton),
    // and the errors from in-flight requests are lost. The cache is cleared
    // on the signin page instead, which prevents stale data from a previous session.

    // Dynamically import router to avoid React context issues
    const { router } = await import("expo-router");
    router.replace("/auth/signin");
  } catch (error) {
    console.error("[API] Failed to redirect to login:", error);
    // Reset flag on error so user can try again
    isRedirectingToLogin = false;
  }
}

/**
 * Refresh access token using refresh token
 * Calls your backend refresh endpoint and updates stored tokens
 * Uses a global lock to prevent parallel refreshes when multiple requests hit 401 simultaneously
 */
async function triggerRefresh(): Promise<boolean> {
  // If a refresh is already in progress, wait for it instead of starting a new one
  if (refreshPromise) {
    return refreshPromise;
  }

  // Start new refresh and store the promise
  refreshPromise = (async (): Promise<boolean> => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        await clearTokens();
        await handleSessionExpiration();
        return false;
      }

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/refresh-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        await clearTokens();
        await handleSessionExpiration();
        return false;
      }

      const data = await response.json();

      if (data.access_token) {
        await saveTokens(data.access_token, data.refresh_token);
        return true;
      }

      console.error("[API] Refresh response missing access_token");
      await clearTokens();
      return false;
    } catch (e) {
      console.error(
        "[API] Token refresh failed:",
        e instanceof Error ? e.message : String(e),
      );
      await clearTokens();
      await handleSessionExpiration();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Auth endpoint policies — single source of truth for public auth endpoint behavior.
 *
 * noAccessToken:       Endpoint can proceed without a Bearer token.
 * treat401AsCredError: A 401 means invalid credentials, not session expiry.
 *                      /auth/refresh-token is excluded because a 401 there IS
 *                      session expiry and must set isSessionExpired: true.
 */
const AUTH_ENDPOINT_POLICIES: Record<string, { noAccessToken: boolean; treat401AsCredError: boolean }> = {
  "/auth/signin":            { noAccessToken: true,  treat401AsCredError: true  },
  "/auth/signup":            { noAccessToken: true,  treat401AsCredError: true  },
  "/auth/refresh-token":     { noAccessToken: true,  treat401AsCredError: false },
  "/auth/forgot-password":   { noAccessToken: true,  treat401AsCredError: true  },
  "/auth/reset-password":    { noAccessToken: true,  treat401AsCredError: true  },
  "/auth/verify-reset-code": { noAccessToken: true,  treat401AsCredError: true  },
  "/auth/verify-email":      { noAccessToken: true,  treat401AsCredError: true  },
  "/auth/authorize":         { noAccessToken: true,  treat401AsCredError: true  },
  "/auth/callback":          { noAccessToken: true,  treat401AsCredError: true  },
};

function findEndpointPolicy(url: string) {
  let pathname: string;
  try {
    // Handle both relative ("/api/v1/...") and absolute ("https://...") URLs
    const parsed = new URL(url, "http://localhost");
    pathname = parsed.pathname.replace(/\/+$/, "");
  } catch {
    pathname = url;
  }
  for (const [path, policy] of Object.entries(AUTH_ENDPOINT_POLICIES)) {
    if (pathname === path || pathname.endsWith(path)) return policy;
  }
  return null;
}

function isNoAccessTokenPublicAuthEndpoint(url: string): boolean {
  return findEndpointPolicy(url)?.noAccessToken === true;
}

function isCredentialErrorPublicAuthEndpoint(url: string): boolean {
  return findEndpointPolicy(url)?.treat401AsCredError === true;
}

/**
 * Extended options for apiClient with custom timeout support
 */
interface ApiClientOptions extends RequestInit {
  /** Custom timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * API client with improved error handling
 * Parses error responses and throws user-friendly error messages
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 */
export async function apiClient<T>(
  url: string,
  options?: ApiClientOptions,
): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();

  async function makeRequest(isRetry: boolean = false): Promise<Response> {
    // Get access token from secure storage
    const accessToken = await getAccessToken();

    // If no token and this is not a retry, check if we should redirect to login
    // Skip for public endpoints (like signin, signup, refresh-token)
    if (!accessToken && !isRetry) {
      if (!isNoAccessTokenPublicAuthEndpoint(url)) {
        // No token and not a public endpoint - session expired
        await handleSessionExpiration();
        throw new ApiError(
          401,
          "Session expired. Please sign in again.",
          undefined,
          true,
        );
      }
    }

    const isFormDataBody =
      typeof FormData !== "undefined" && options?.body instanceof FormData;

    const headers: Record<string, string> = {
      ...((options?.headers as Record<string, string>) ?? {}),
    };

    const hasContentTypeHeader = Object.keys(headers).some(
      (key) => key.toLowerCase() === "content-type",
    );

    if (!isFormDataBody && !hasContentTypeHeader) {
      headers["Content-Type"] = "application/json";
    }

    // Add Authorization header if token exists
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const targetUrl = url.startsWith("http") ? url : `${apiBaseUrl}${url}`;

    // Destructure custom timeout before spreading into fetchOptions
    const { timeout: customTimeout, ...restOptions } = options ?? {};

    const fetchOptions: RequestInit = {
      ...restOptions,
      headers,
    };

    // Track whether our timeout triggered the abort (vs caller cancellation)
    let timedOut = false;

    // Add timeout to prevent fetch from hanging indefinitely
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, customTimeout ?? 30000);

    // If the caller passed an AbortSignal (e.g. React Query cancellation),
    // forward its abort to our local controller so both can cancel the request.
    const callerSignal = fetchOptions.signal;
    const onCallerAbort = callerSignal
      ? () => controller.abort()
      : undefined;
    if (callerSignal && onCallerAbort) {
      if (callerSignal.aborted) {
        controller.abort();
      } else {
        callerSignal.addEventListener("abort", onCallerAbort, { once: true });
      }
    }

    try {
      const response = await fetch(targetUrl, {
        ...fetchOptions,
        signal: controller.signal,
      });
      return response;
    } catch (fetchError) {
      // If the caller's AbortSignal triggered the abort (e.g. React Query
      // unmount cancellation), rethrow the original error so the caller's
      // abort handling works as expected instead of wrapping it as an ApiError.
      if (
        !timedOut &&
        callerSignal?.aborted &&
        fetchError instanceof DOMException &&
        fetchError.name === "AbortError"
      ) {
        throw fetchError;
      }
      throw new ApiError(
        0,
        timedOut
          ? "Request timed out. Please check your connection."
          : fetchError instanceof Error
            ? `Network error: ${fetchError.message}`
            : "Network error: Failed to connect to server",
        fetchError,
      );
    } finally {
      clearTimeout(timeoutId);
      if (callerSignal && onCallerAbort) {
        callerSignal.removeEventListener("abort", onCallerAbort);
      }
    }
  }

  let res = await makeRequest();

  if (res.status === 401) {
    // Skip token refresh for public auth endpoints — a 401 here means
    // invalid credentials, not an expired session.
    if (!isCredentialErrorPublicAuthEndpoint(url)) {
      // Attempt token refresh
      const refreshed = await triggerRefresh();

      if (refreshed) {
        // Retry the original request with new token
        res = await makeRequest(true);

        // If still 401 after refresh, invalid credentials (not token expiry)
        if (res.status === 401) {
          const msg = await parseErrorResponse(res);
          throw new ApiError(401, msg, undefined, false);
        }
      } else {
        // Refresh failed - session expired
        const msg = await parseErrorResponse(res);
        throw new ApiError(
          401,
          msg || "Session expired. Please sign in again.",
          undefined,
          true,
        );
      }
    } else {
      // Public auth endpoint — surface the error directly (e.g. wrong password)
      const msg = await parseErrorResponse(res);
      throw new ApiError(401, msg, undefined, false);
    }
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const errorMessage = await parseErrorResponse(res);

    // Log server errors for debugging
    if (res.status >= 500) {
      console.error("[API] Server Error:", {
        status: res.status,
        url,
        message: errorMessage,
      });
    }

    throw new ApiError(res.status, errorMessage);
  }

  const responseContentType = res.headers.get("content-type") ?? "";

  if (responseContentType.includes("application/json")) {
    return await res.json();
  }

  if (res.status === 204 || responseContentType.length === 0) {
    return undefined as T;
  }

  // Fallback: return plain text for non-JSON responses
  return (await res.text()) as unknown as T;
}
