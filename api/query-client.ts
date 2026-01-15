import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient configuration with sensible defaults for React Native
 * 
 * Default options:
 * - retry: 1 (retry failed requests once)
 * - staleTime: 5 minutes (data considered fresh for 5 minutes)
 * - gcTime: 10 minutes (cached data kept for 10 minutes after unused)
 * 
 * @see https://tanstack.com/query/latest/docs/react/guides/important-defaults
 * @see https://tanstack.com/query/latest/docs/react/reference/QueryClient
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Retry failed requests once before giving up
            retry: 1,
            // TEMPORARY: Disabled ALL caching - always fetch fresh data
            staleTime: 0,
            gcTime: 0, // Don't cache data at all
            refetchOnMount: 'always',
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
        },
        mutations: {
            // Retry failed mutations once
            retry: 1,
        },
    },
});

