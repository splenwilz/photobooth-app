import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationOptions,
    type UseMutationResult,
    type UseQueryOptions,
    type UseQueryResult
} from "@tanstack/react-query";

/**
 * Factory function to create React Query mutation hooks with queryClient
 * 
 * Abstracts the common pattern of:
 * - useMutation + useQueryClient
 * - Spreading mutation result with queryClient
 * 
 * @param mutationFn - The async function to call for the mutation
 * @param options - Optional React Query mutation options
 * @returns A hook that returns mutation result and queryClient
 * 
 * @example
 * ```ts
 * export const useOAuth = createMutationHook<OAuthRequest, OAuthResponse>(oauth);
 * ```
 */
export function createMutationHook<TRequest, TResponse>(
    mutationFn: (data: TRequest) => Promise<TResponse>,
    options?: Omit<UseMutationOptions<TResponse, Error, TRequest, unknown>, 'mutationFn'>
) {
    return function useMutationHook(): UseMutationResult<TResponse, Error, TRequest, unknown> & { queryClient: ReturnType<typeof useQueryClient> } {
        const queryClient = useQueryClient();

        const mutation = useMutation({
            mutationFn,
            ...options,
        });

        return {
            ...mutation,
            queryClient,
        };
    };
}

/**
 * Factory function to create React Query query hooks with queryClient
 * 
 * Abstracts the common pattern of:
 * - useQuery + useQueryClient
 * - Spreading query result with queryClient
 * 
 * @param queryKey - The query key (from queryKeys factory recommended)
 * @param queryFn - The async function to fetch data
 * @param options - Optional React Query query options
 * @returns A hook that returns query result and queryClient
 * 
 * @example
 * ```ts
 * export const useUser = createQueryHook(
 *   queryKeys.auth.user(),
 *   () => fetchUser()
 * );
 * ```
 */
export function createQueryHook<TData>(
    queryKey: readonly unknown[],
    queryFn: () => Promise<TData>,
    options?: Omit<UseQueryOptions<TData, Error, TData, readonly unknown[]>, 'queryKey' | 'queryFn'>
) {
    return function useQueryHook(): UseQueryResult<TData, Error> & { queryClient: ReturnType<typeof useQueryClient> } {
        const queryClient = useQueryClient();

        const query = useQuery({
            queryKey,
            queryFn,
            ...options,
        });

        return {
            ...query,
            queryClient,
        };
    };
}

