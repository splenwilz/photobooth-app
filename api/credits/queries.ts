/**
 * Credits React Query Hooks
 *
 * Hooks for fetching and mutating booth credits.
 *
 * @see https://tanstack.com/query/latest - React Query docs
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/utils/query-keys";
import { getBoothCredits, addBoothCredits, getCreditsHistory } from "./services";
import type { CreditsHistoryParams } from "./types";

/**
 * Hook to fetch booth credit balance
 *
 * @param boothId - The booth ID to get credits for
 * @returns Query result with credit balance
 *
 * @example
 * const { data, isLoading } = useBoothCredits("booth-123");
 * console.log(data?.credit_balance);
 */
export function useBoothCredits(boothId: string | null) {
	return useQuery({
		queryKey: queryKeys.credits.balance(boothId ?? ""),
		queryFn: () => getBoothCredits(boothId!),
		enabled: !!boothId,
		staleTime: 30 * 1000, // 30 seconds
	});
}

/**
 * Hook to add credits to a booth
 *
 * Automatically invalidates the credits query on success.
 *
 * @returns Mutation for adding credits
 *
 * @example
 * const { mutate } = useAddCredits();
 * mutate({ boothId: "booth-123", amount: 100, reason: "Top-up" });
 */
export function useAddCredits() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			boothId,
			amount,
			reason,
		}: {
			boothId: string;
			amount: number;
			reason?: string;
		}) => addBoothCredits(boothId, { amount, reason }),
		onSuccess: (_, variables) => {
			// Invalidate credits query to refetch the new balance
			queryClient.invalidateQueries({
				queryKey: queryKeys.credits.balance(variables.boothId),
			});
			// Invalidate history to show new command
			queryClient.invalidateQueries({
				queryKey: queryKeys.credits.history(variables.boothId),
			});
			// Also invalidate booth detail as it may show credit info
			queryClient.invalidateQueries({
				queryKey: queryKeys.booths.detail(variables.boothId),
			});
		},
	});
}

/**
 * Hook to fetch credits history with pagination
 *
 * @param boothId - The booth ID to get history for
 * @param params - Pagination params (limit, offset)
 * @returns Query result with paginated history
 *
 * @example
 * const { data, isLoading } = useCreditsHistory("booth-123", { limit: 50 });
 * console.log(data?.commands);
 */
export function useCreditsHistory(
	boothId: string | null,
	params?: CreditsHistoryParams,
) {
	return useQuery({
		queryKey: queryKeys.credits.history(boothId ?? ""),
		queryFn: () => getCreditsHistory(boothId!, params),
		enabled: !!boothId,
		staleTime: 30 * 1000, // 30 seconds
	});
}

/**
 * Hook to fetch credits history with infinite scroll pagination
 *
 * @param boothId - The booth ID to get history for
 * @param params - Base pagination params (limit)
 * @returns Infinite query result with paginated history
 *
 * @example
 * const { data, fetchNextPage, hasNextPage } = useCreditsHistoryInfinite("booth-123");
 */
export function useCreditsHistoryInfinite(
	boothId: string | null,
	params?: { limit?: number },
) {
	const limit = params?.limit ?? 20;

	return useInfiniteQuery({
		queryKey: [...queryKeys.credits.history(boothId ?? ""), "infinite"],
		queryFn: ({ pageParam = 0 }) =>
			getCreditsHistory(boothId!, { limit, offset: pageParam }),
		enabled: !!boothId,
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			// If we got fewer items than the limit, we've reached the end
			const nextOffset = lastPage.offset + lastPage.commands.length;
			return nextOffset < lastPage.total ? nextOffset : undefined;
		},
	});
}

