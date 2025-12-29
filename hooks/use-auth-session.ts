import { useEffect, useState, useCallback } from 'react';
import { getAccessToken, getStoredUser } from '@/api/client';
import type { AuthUser } from '@/api/auth/types';

/**
 * Hook to check if user has an active session
 * 
 * Checks for both access token and stored user data.
 * Used for protecting routes and conditional rendering based on auth state.
 * 
 * @returns Object with session status, user data, and loading state
 * @see https://docs.expo.dev/router/reference/authentication/
 * 
 * @example
 * ```tsx
 * const { isAuthenticated, isLoading, session } = useAuthSession();
 * 
 * if (isLoading) return <LoadingScreen />;
 * if (!isAuthenticated) return <Redirect href="/auth/signin" />;
 * 
 * return <ProtectedContent user={session} />;
 * ```
 */
export function useAuthSession() {
    const [session, setSession] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkSession = useCallback(async () => {
        try {
            // Check for both access token and user data
            const [accessToken, user] = await Promise.all([
                getAccessToken(),
                getStoredUser(),
            ]);

            // User is authenticated if they have both token and user data
            setSession(accessToken && user ? user : null);
        } catch (error) {
            console.error('[Auth] Failed to check session:', error);
            setSession(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function init() {
            await checkSession();
            if (!isMounted) {
                // Reset state if component unmounted during check
                setSession(null);
            }
        }

        init();

        return () => {
            isMounted = false;
        };
    }, [checkSession]);

    return {
        /** Current user session data, null if not authenticated */
        session,
        /** Whether the user is authenticated */
        isAuthenticated: !!session,
        /** Whether the session check is in progress */
        isLoading,
        /** Manually refresh the session (useful after login/logout) */
        refreshSession: checkSession,
    };
}

