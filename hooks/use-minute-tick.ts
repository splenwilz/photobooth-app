/**
 * Minute-granularity clock for countdown/expiry rendering.
 *
 * Returns a `Date.now()` snapshot that refreshes every 60s and immediately on
 * app foreground (a plain setInterval freezes while the app is backgrounded,
 * so a countdown could lag by however long the app slept). Used by the
 * booth-transfer surfaces, where a "pending" row past its `expires_at` must
 * flip to expired client-side — the server stamps expiry lazily and a frozen
 * timestamp would keep a lapsed offer "pending" forever.
 */

import { useEffect, useState } from "react";
import { AppState } from "react-native";

export function useMinuteTick(enabled: boolean = true): number {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (!enabled) return;
		setNow(Date.now());
		const timer = setInterval(() => setNow(Date.now()), 60_000);
		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") setNow(Date.now());
		});
		return () => {
			clearInterval(timer);
			subscription.remove();
		};
	}, [enabled]);

	return now;
}
