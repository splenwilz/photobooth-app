/**
 * Refetch stale data when a screen regains focus.
 *
 * This is TanStack Query's documented React Native recipe. Two details matter
 * and are easy to get wrong by hand:
 *
 * - The first focus fires on mount, where the query is already fetching. The
 *   `firstTimeRef` guard skips it so a screen does not fetch twice on open.
 * - `stale: true, type: "active"` limits the refetch to mounted queries whose
 *   data has actually aged out, instead of refetching fresh data on every
 *   navigation.
 *
 * `useQueryFocusManager` covers app foreground/background; this covers moving
 * between screens inside the app.
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/react-native
 *
 * @example
 * useRefreshOnFocus(queryKeys.payments.boothSubscriptions());
 */

import { useFocusEffect } from "@react-navigation/native";
import { hashKey, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

export function useRefreshOnFocus(
	queryKey: readonly unknown[],
	options: {
		/**
		 * Refetch only entries React Query already considers stale (the default,
		 * and TanStack's published recipe).
		 *
		 * Set `false` when the data can change OUTSIDE the app — a subscription
		 * cancelled at a kiosk, a purchase made on the web. With a multi-minute
		 * `staleTime`, `staleOnly` means returning to the screen inside that
		 * window refetches nothing, which is precisely the window that matters.
		 */
		staleOnly?: boolean;
	} = {},
) {
	const { staleOnly = true } = options;
	const queryClient = useQueryClient();
	const firstTimeRef = useRef(true);

	// Compared by value, not identity: callers pass a fresh array from a
	// queryKeys factory on every render, so depending on the array itself would
	// rebuild the callback each time. `hashKey` is React Query's own key hash, so
	// the memo agrees with the library about when a key has changed. The ORIGINAL
	// array is what gets passed to refetchQueries — matching uses
	// `partialMatchKey`, which is typeof-strict, so a JSON round-trip here would
	// silently fail to match any key holding `undefined` in the array.
	const keyToken = hashKey(queryKey);
	const keyRef = useRef(queryKey);

	// Synced in an effect, not during render: React documents writing
	// `ref.current` while rendering as unsupported outside lazy initialisation,
	// and under concurrent rendering a discarded render would still have
	// mutated the ref.
	useEffect(() => {
		keyRef.current = queryKey;
	}, [queryKey]);

	const onFocus = useCallback(() => {
		if (firstTimeRef.current) {
			firstTimeRef.current = false;
			return;
		}

		queryClient.refetchQueries({
			queryKey: keyRef.current,
			...(staleOnly ? { stale: true } : {}),
			type: "active",
		});
		// keyToken is React Query's own hash of the key: it is the change signal
		// for the ref above, even though the callback reads the ref rather than
		// the token itself.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [queryClient, keyToken, staleOnly]);

	useFocusEffect(onFocus);
}
