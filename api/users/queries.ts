/**
 * User Profile React Query Hooks
 *
 * Query and mutation hooks for user profile and account-level business settings.
 * @see /api/v1/users endpoints
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/query-keys";
import {
	deleteAccountLogo,
	getUserProfile,
	updateBusinessName,
	uploadAccountLogo,
} from "./services";
import type { UpdateBusinessNameRequest, UserProfileResponse } from "./types";

/**
 * Hook to fetch user profile
 * Returns business_name and logo_url for account-level display.
 *
 * @param userId - The user ID to fetch (null to disable)
 * @returns React Query result with user profile data
 * @see GET /api/v1/users/{user_id}
 */
export function useUserProfile(userId: string | null) {
	return useQuery<UserProfileResponse>({
		queryKey: userId
			? queryKeys.users.profile(userId)
			: ["users", "profile", null],
		queryFn: () => getUserProfile(userId!),
		enabled: !!userId,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

/**
 * Hook to update business name
 * Invalidates user profile and booth caches since business_name syncs to all booths.
 *
 * @returns React Query mutation for business name update
 * @see PATCH /api/v1/users/{user_id}
 */
export function useUpdateBusinessName() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			userId,
			...data
		}: {
			userId: string;
		} & UpdateBusinessNameRequest) => updateBusinessName(userId, data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.users.profile(variables.userId),
			});
			// Invalidate booth queries affected by business name / display name toggle
			queryClient.invalidateQueries({
				queryKey: queryKeys.booths.overview(),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.booths.list(),
			});
			// All booths' business settings depend on use_display_name_on_booths
			queryClient.invalidateQueries({
				queryKey: ["booths", "businessSettings"],
			});
		},
	});
}

/**
 * Hook to upload account logo
 * Uses multipart/form-data upload directly to backend.
 *
 * @returns React Query mutation for account logo upload
 * @see PUT /api/v1/users/{user_id}/logo
 */
export function useUploadAccountLogo() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			userId,
			fileUri,
			mimeType,
			filename,
		}: {
			userId: string;
			fileUri: string;
			mimeType: string;
			filename: string;
		}) => uploadAccountLogo(userId, fileUri, mimeType, filename),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.users.profile(variables.userId),
			});
			// Account logo affects booth business settings and overview
			queryClient.invalidateQueries({
				queryKey: queryKeys.booths.overview(),
			});
			queryClient.invalidateQueries({
				queryKey: ["booths", "businessSettings"],
			});
		},
	});
}

/**
 * Hook to delete account logo
 * All booths using the account logo will have no logo.
 *
 * @returns React Query mutation for account logo deletion
 * @see DELETE /api/v1/users/{user_id}/logo
 */
export function useDeleteAccountLogo() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ userId }: { userId: string }) =>
			deleteAccountLogo(userId),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.users.profile(variables.userId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.booths.overview(),
			});
			queryClient.invalidateQueries({
				queryKey: ["booths", "businessSettings"],
			});
		},
	});
}
