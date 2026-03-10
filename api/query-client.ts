import { QueryCache, QueryClient } from '@tanstack/react-query';

/**
 * Handle session-expired errors globally as a fallback.
 * If the API client's handleSessionExpiration() fails to redirect,
 * this ensures the user still gets sent to the login screen.
 *
 * Uses duck typing to check for isSessionExpired to avoid circular imports
 * (client.ts imports queryClient from this file).
 */
function handleGlobalQueryError(error: Error) {
    if (error != null && typeof error === 'object' && 'isSessionExpired' in error && (error as { isSessionExpired: boolean }).isSessionExpired) {
        import('expo-router').then(({ router }) => {
            router.replace('/auth/signin');
        }).catch(() => {
            // Last resort: nothing we can do, error state will show in the UI
        });
    }
}

/**
 * QueryClient configuration with sensible defaults for React Native
 *
 * Default options:
 * - retry: Don't retry session-expired errors (no point retrying with invalid tokens)
 * - staleTime: 5 minutes (data considered fresh for 5 minutes)
 * - gcTime: 10 minutes (cached data kept for 10 minutes after unused)
 *
 * @see https://tanstack.com/query/latest/docs/react/guides/important-defaults
 * @see https://tanstack.com/query/latest/docs/react/reference/QueryClient
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Don't retry session-expired errors, retry others once
            retry: (failureCount, error) => {
                if (error != null && typeof error === 'object' && 'isSessionExpired' in error && (error as { isSessionExpired: boolean }).isSessionExpired) return false;
                return failureCount < 1;
            },
            // Data considered fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cached data kept for 10 minutes after unused
            gcTime: 10 * 60 * 1000,
            refetchOnMount: true,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
        },
        mutations: {
            // Retry failed mutations once
            retry: 1,
        },
    },
    queryCache: new QueryCache({
        onError: handleGlobalQueryError,
    }),
});
