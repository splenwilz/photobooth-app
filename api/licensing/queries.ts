/**
 * Licensing React Query Hooks
 *
 * Hooks for booth activation and license management.
 *
 * @see https://tanstack.com/query/latest - React Query docs
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/utils/query-keys";
import { activateBooth, preCheckActivation, regenerateLicense } from "./services";
import type { ActivateBoothRequest, PreCheckActivationRequest } from "./types";

/**
 * Hook to pre-check booth activation
 *
 * Call this after scanning QR code and selecting a booth, before showing
 * confirmation UI. Returns information about conflicts that need user confirmation.
 *
 * @returns Mutation for pre-checking activation
 *
 * @example
 * const { mutate, isPending, data } = usePreCheckActivation();
 *
 * const handleBoothSelected = (boothId: string, fingerprint: string) => {
 *   mutate({ fingerprint, booth_id: boothId }, {
 *     onSuccess: (result) => {
 *       if (!result.can_proceed) {
 *         // Show subscribe prompt
 *       } else if (result.conflicts.length > 0) {
 *         // Show conflict warnings
 *       } else {
 *         // Proceed to activate
 *       }
 *     },
 *   });
 * };
 */
export function usePreCheckActivation() {
	return useMutation({
		mutationFn: (data: PreCheckActivationRequest) => preCheckActivation(data),
	});
}

/**
 * Hook to activate booth with QR code
 *
 * After scanning the QR code on the physical booth, select a booth and
 * call this mutation to activate the booth.
 *
 * Supports two modes:
 * 1. Flexible mode (with booth_id): User selects which booth to activate
 * 2. Legacy mode (without booth_id): Auto-determine booth (backward compatible)
 *
 * @returns Mutation for activating booth
 *
 * @example
 * const { mutate, isPending, data, error } = useActivateBooth();
 *
 * // Flexible mode with confirmations
 * const handleActivate = (fingerprint: string, boothId: string, conflicts: Conflict[]) => {
 *   const hasConflicts = conflicts.length > 0;
 *   mutate({
 *     fingerprint,
 *     booth_id: boothId,
 *     confirm_clear_booth_data: hasConflicts,
 *     confirm_switch_fingerprint: hasConflicts,
 *   }, {
 *     onSuccess: (result) => {
 *       if (result.success) {
 *         Alert.alert('Success', `Booth activated! License: ${result.license_key}`);
 *       } else {
 *         Alert.alert('Error', result.message);
 *       }
 *     },
 *   });
 * };
 */
export function useActivateBooth() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: ActivateBoothRequest) => activateBooth(data),
		onSuccess: (result) => {
			if (result.success) {
				// Invalidate booth list to show newly activated booth
				queryClient.invalidateQueries({
					queryKey: queryKeys.booths.all(),
				});
				queryClient.invalidateQueries({
					queryKey: queryKeys.booths.list(),
				});
				// Invalidate dashboard overview
				queryClient.invalidateQueries({
					queryKey: queryKeys.dashboard.overview(),
				});
				// Invalidate booth subscriptions
				queryClient.invalidateQueries({
					queryKey: queryKeys.payments.boothSubscriptions(),
				});
			}
		},
	});
}

/**
 * Hook to regenerate lost license key
 *
 * Creates a new license key using the stored fingerprint.
 * Use this when a user has lost their license key.
 *
 * @returns Mutation for regenerating license
 *
 * @example
 * const { mutate, isPending } = useRegenerateLicense();
 *
 * const handleRegenerate = () => {
 *   mutate(undefined, {
 *     onSuccess: (result) => {
 *       Alert.alert('New License Key', result.new_license_key);
 *     },
 *   });
 * };
 */
export function useRegenerateLicense() {
	return useMutation({
		mutationFn: () => regenerateLicense(),
	});
}
