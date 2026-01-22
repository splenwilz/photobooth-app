import * as SecureStore from 'expo-secure-store'
import type { AuthUser } from './auth/types'
import { queryClient } from './query-client'

// SecureStore keys - exported for use in clear data functionality
export const ACCESS_TOKEN_KEY = 'auth_access_token'
export const REFRESH_TOKEN_KEY = 'auth_refresh_token'
export const USER_STORAGE_KEY = 'auth_user'
export const PENDING_PASSWORD_KEY = 'auth_pending_password'

/**
 * Custom error class for API errors with status code and parsed error message
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public originalError?: unknown,
    public isSessionExpired: boolean = false
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
    return 'Validation error occurred';
  }

  const messages = errorArray.map((error: unknown) => {
    if (typeof error === 'object' && error !== null) {
      const validationError = error as ValidationError;
      const field = validationError.loc?.[validationError.loc.length - 1] || 'field';
      const message = validationError.msg || 'Invalid value';

      // Create user-friendly field names
      const fieldName = String(field)
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return `${fieldName}: ${message}`;
    }
    return String(error);
  });

  return messages.join('. ');
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
      return response.statusText || 'An error occurred';
    }

    // Check if response is HTML (server error page, ngrok offline, etc.)
    if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
      // Try to extract meaningful message from ngrok error page
      if (errorText.includes('ngrok') && errorText.includes('offline')) {
        return 'Server is offline. Please check your connection.';
      }
      if (errorText.includes('502') || errorText.includes('Bad Gateway')) {
        return 'Server is temporarily unavailable. Please try again later.';
      }
      if (errorText.includes('503') || errorText.includes('Service Unavailable')) {
        return 'Service is temporarily unavailable. Please try again later.';
      }
      return 'Server is unreachable. Please check your connection.';
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
    if (typeof errorValue === 'string') {
      return errorValue;
    }

    // If it's an object, try to extract a meaningful message or stringify it
    if (typeof errorValue === 'object' && errorValue !== null) {
      // Try common nested error message fields
      if (errorValue.message && typeof errorValue.message === 'string') {
        return errorValue.message;
      }
      if (errorValue.error && typeof errorValue.error === 'string') {
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
  const url = process.env.EXPO_PUBLIC_API_BASE_URL
  if (url) return url
  throw new Error("API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL.")
}

/**
 * Get access token from secure storage
 * @see https://docs.expo.dev/versions/latest/sdk/securestore/
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
  } catch (error) {
    console.error('[API] Failed to get access token:', error)
    return null
  }
}

/**
 * Get refresh token from secure storage
 */
async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
  } catch (error) {
    console.error('[API] Failed to get refresh token:', error)
    return null
  }
}

/**
 * Save tokens to secure storage
 */
export async function saveTokens(accessToken: string, refreshToken?: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken)
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
    }
    // Reset redirect flag on successful login/token save
    isRedirectingToLogin = false
  } catch (error) {
    console.error('[API] Failed to save tokens:', error)
    throw error
  }
}

/**
 * Persist the authenticated user profile
 */
export async function saveUser(user: AuthUser): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(user))
  } catch (error) {
    console.error('[API] Failed to save user:', error)
    throw error
  }
}

/**
 * Retrieve the cached user profile
 */
export async function getStoredUser(): Promise<AuthUser | null> {
  try {
    const stored = await SecureStore.getItemAsync(USER_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as AuthUser) : null
  } catch (error) {
    console.error('[API] Failed to read stored user:', error)
    return null
  }
}

/**
 * Save pending password to secure storage (for email verification resend)
 * This is temporarily stored during email verification flow
 */
export async function savePendingPassword(password: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PENDING_PASSWORD_KEY, password)
  } catch (error) {
    console.error('[API] Failed to save pending password:', error)
    throw error
  }
}

/**
 * Retrieve pending password from secure storage
 */
export async function getPendingPassword(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PENDING_PASSWORD_KEY)
  } catch (error) {
    console.error('[API] Failed to read pending password:', error)
    return null
  }
}

/**
 * Clear pending password from secure storage
 */
export async function clearPendingPassword(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_PASSWORD_KEY)
  } catch (error) {
    console.error('[API] Failed to clear pending password:', error)
  }
}

/**
 * Clear tokens from secure storage (on logout)
 */
export async function clearTokens(): Promise<void> {
  try {
    console.log('[API] [TOKEN] Clearing all tokens and user data')
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY)
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_STORAGE_KEY)
    await SecureStore.deleteItemAsync(PENDING_PASSWORD_KEY)
    console.log('[API] [TOKEN] All tokens cleared successfully')
  } catch (error) {
    console.error('[API] [TOKEN] Failed to clear tokens:', error)
  }
}

/**
 * Clear React Query cache
 * Should be called on logout and signin to prevent stale data from previous user
 */
export function clearQueryCache(): void {
  try {
    queryClient.clear()
  } catch (error) {
    console.error('[API] Failed to clear query cache:', error)
  }
}

// Global refresh lock to prevent parallel token refreshes
// If multiple requests hit 401 simultaneously, they'll share the same refresh
let refreshPromise: Promise<boolean> | null = null

// Global flag to prevent multiple redirects when session expires
let isRedirectingToLogin = false

/**
 * Handle session expiration by redirecting to login
 * Uses dynamic import to avoid React context issues
 */
async function handleSessionExpiration(): Promise<void> {
  // Prevent multiple redirects if already redirecting
  if (isRedirectingToLogin) {
    return
  }

  isRedirectingToLogin = true

  try {
    // Clear query cache to prevent stale data
    clearQueryCache()

    // Dynamically import router to avoid React context issues
    const { router } = await import('expo-router')
    router.replace('/auth/signin')
  } catch (error) {
    console.error('[API] Failed to redirect to login:', error)
    // Reset flag on error so user can try again
    isRedirectingToLogin = false
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
    return refreshPromise
  }

  // Start new refresh and store the promise
  refreshPromise = (async (): Promise<boolean> => {
    try {
      const refreshToken = await getRefreshToken()
      if (!refreshToken) {
        await clearTokens()
        await handleSessionExpiration()
        return false
      }

      const apiBaseUrl = getApiBaseUrl()
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!response.ok) {
        await clearTokens()
        await handleSessionExpiration()
        return false
      }

      const data = await response.json()

      if (data.access_token) {
        await saveTokens(data.access_token, data.refresh_token)
        return true
      }

      console.error('[API] Refresh response missing access_token')
      await clearTokens()
      return false
    } catch (e) {
      console.error('[API] Token refresh failed:', e instanceof Error ? e.message : String(e))
      await clearTokens()
      await handleSessionExpiration()
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * API client with improved error handling
 * Parses error responses and throws user-friendly error messages
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 */
export async function apiClient<T>(url: string, options?: RequestInit): Promise<T> {
  const apiBaseUrl = getApiBaseUrl()

  async function makeRequest(isRetry: boolean = false): Promise<Response> {
    // Get access token from secure storage
    const accessToken = await getAccessToken()
    console.log('[API] Access Token:', accessToken)

    // If no token and this is not a retry, check if we should redirect to login
    // Skip for public endpoints (like signin, signup, refresh-token)
    if (!accessToken && !isRetry) {
      const isPublicEndpoint = url.includes('/auth/signin') ||
        url.includes('/auth/signup') ||
        url.includes('/auth/refresh-token') ||
        url.includes('/auth/forgot-password') ||
        url.includes('/auth/reset-password') ||
        url.includes('/auth/verify-email') ||
        url.includes('/auth/authorize') ||
        url.includes('/auth/callback')  

      if (!isPublicEndpoint) {
        // No token and not a public endpoint - session expired
        await handleSessionExpiration()
        throw new ApiError(401, 'Session expired. Please sign in again.', undefined, true)
      }
    }

    const isFormDataBody =
      typeof FormData !== 'undefined' && options?.body instanceof FormData

    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string> ?? {}),
    }

    const hasContentTypeHeader = Object.keys(headers).some(
      (key) => key.toLowerCase() === 'content-type',
    )

    if (!isFormDataBody && !hasContentTypeHeader) {
      headers['Content-Type'] = 'application/json'
    }

    // Add Authorization header if token exists
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const targetUrl = url.startsWith('http') ? url : `${apiBaseUrl}${url}`

    const fetchOptions: RequestInit = {
      ...options,
      headers,
    }

    try {
      return await fetch(targetUrl, fetchOptions)
    } catch (fetchError) {
      console.error('[API] Network Error:', {
        url: targetUrl,
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
      })

      throw new ApiError(
        0,
        fetchError instanceof Error
          ? `Network error: ${fetchError.message}`
          : 'Network error: Failed to connect to server',
        fetchError
      )
    }
  }

  let res = await makeRequest()

  if (res.status === 401) {
    // Attempt token refresh
    const refreshed = await triggerRefresh()

    if (refreshed) {
      // Retry the original request with new token
      res = await makeRequest(true)

      // If still 401 after refresh, invalid credentials (not token expiry)
      if (res.status === 401) {
        const msg = await parseErrorResponse(res)
        throw new ApiError(401, msg, undefined, false)
      }
    } else {
      // Refresh failed - session expired
      const msg = await parseErrorResponse(res)
      throw new ApiError(401, msg || 'Session expired. Please sign in again.', undefined, true)
    }
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T
  }

  if (!res.ok) {
    const errorMessage = await parseErrorResponse(res)

    // Log server errors for debugging
    if (res.status >= 500) {
      console.error('[API] Server Error:', { status: res.status, url, message: errorMessage })
    }

    throw new ApiError(res.status, errorMessage)
  }

  const responseContentType = res.headers.get('content-type') ?? ''

  if (responseContentType.includes('application/json')) {
    return await res.json()
  }

  if (res.status === 204 || responseContentType.length === 0) {
    return undefined as T
  }

  // Fallback: return plain text for non-JSON responses
  return await res.text() as unknown as T
}