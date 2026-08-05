/**
 * Refetch period aggregates when the operator's timezone changes.
 *
 * The server slices "today/week/month/year" on the zone sent with each
 * request (api/utils/timezone.ts), and cache keys embed that zone. Travelers
 * cross zones with the app killed or backgrounded, so on each return to the
 * foreground the device zone is re-read; if it differs from the last one
 * used, the tz-keyed analytics and booths queries are invalidated so every
 * screen re-slices on the new local calendar.
 *
 * Mount once at the root layout, inside QueryClientProvider.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { operatorTz, refreshOperatorTz } from "@/api/utils/timezone";

export function useTimezoneRefetch() {
	const queryClient = useQueryClient();
	const lastTz = useRef(operatorTz());

	useEffect(() => {
		function onAppStateChange(status: AppStateStatus) {
			if (status !== "active") return;
			// refreshOperatorTz re-reads the device zone natively — plain
			// operatorTz() returns the cached value and would never see a change
			// (and on Hermes, Intl alone can't either).
			const tz = refreshOperatorTz();
			if (tz === lastTz.current) return;
			lastTz.current = tz;
			queryClient.invalidateQueries({ queryKey: ["analytics"] });
			queryClient.invalidateQueries({ queryKey: ["booths"] });
		}

		const subscription = AppState.addEventListener("change", onAppStateChange);
		return () => subscription.remove();
	}, [queryClient]);
}
