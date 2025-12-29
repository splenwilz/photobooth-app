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
            // Data is considered fresh for 5 minutes (prevents unnecessary refetches)
            staleTime: 1000 * 60 * 5, // 5 minutes
            // Cached data is kept for 10 minutes after it becomes unused
            gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
            // Refetch on window focus is not needed in React Native
            refetchOnWindowFocus: false,
            // Refetch on reconnect can be useful for mobile
            refetchOnReconnect: true,
        },
        mutations: {
            // Retry failed mutations once
            retry: 1,
        },
    },
});

