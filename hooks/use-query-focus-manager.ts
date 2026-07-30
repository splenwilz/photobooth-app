/**
 * Drive React Query's focusManager from AppState.
 *
 * React Query's `refetchOnWindowFocus` listens for browser focus events, which
 * do not exist on native. Without this bridge the flag in api/query-client.ts
 * is inert, and nothing refetches when the app returns from the background —
 * so state changed elsewhere (a subscription cancelled at a kiosk, a booth
 * edited on the web dashboard) can stay wrong on screen indefinitely.
 *
 * Mount this once, at the root layout. It is deliberately app-wide rather than
 * per-screen: staleness after backgrounding is not a billing-specific problem.
 *
 * TWO CONSEQUENCES worth knowing before changing anything here:
 *
 * 1. React Query's retryer gates continuation on `focusManager.isFocused()`, so
 *    an in-flight request that is RETRYING pauses while the app is backgrounded
 *    and resumes on return. First attempts are unaffected. This is why the
 *    destructive billing mutations set `retry: false` — a paused retry of a
 *    non-idempotent POST is worse than a clean failure.
 * 2. On iOS, `inactive` fires for Control Centre, the notification shade,
 *    incoming calls and the app switcher — so focus round-trips are frequent,
 *    and each one refetches every stale active query.
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/react-native
 */

import { focusManager } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

export function useQueryFocusManager() {
	useEffect(() => {
		function onAppStateChange(status: AppStateStatus) {
			// On web the browser's own focus events already drive this.
			if (Platform.OS !== "web") {
				focusManager.setFocused(status === "active");
			}
		}

		const subscription = AppState.addEventListener(
			"change",
			onAppStateChange,
		);
		return () => subscription.remove();
	}, []);
}
