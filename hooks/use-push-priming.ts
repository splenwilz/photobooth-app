/**
 * Push Priming Trigger
 *
 * Decides whether to show the one-time push priming modal. Fires at the value
 * moment — once the operator has at least one booth (so there's something to be
 * alerted about) — but only if the OS permission is still undetermined and we
 * haven't shown the prompt before.
 *
 * Rendered from the tabs layout so it's robust to every booth-activation path
 * and also catches existing users on their next entry.
 */

import { useCallback, useEffect, useState } from "react";
import { useBoothOverview } from "@/api/booths/queries";
import {
	getPushPermissionState,
	hasSeenPushPriming,
} from "@/utils/push-notifications";

export function usePushPriming() {
	const { data } = useBoothOverview();
	const hasBooths = (data?.summary?.total_booths ?? 0) > 0;

	const [visible, setVisible] = useState(false);
	const [evaluated, setEvaluated] = useState(false);

	useEffect(() => {
		// Only evaluate once, and only after the user actually has a booth.
		if (!hasBooths || evaluated) return;
		let cancelled = false;
		(async () => {
			try {
				const [state, seen] = await Promise.all([
					getPushPermissionState(),
					hasSeenPushPriming(),
				]);
				if (cancelled) return;
				setEvaluated(true);
				if (state === "undetermined" && !seen) setVisible(true);
			} catch (e) {
				// Transient permissions/SecureStore failure: stop the flow (mark
				// evaluated, never show) instead of leaking an unhandled rejection.
				if (cancelled) return;
				setEvaluated(true);
				console.warn("[push] priming eligibility check failed:", e);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [hasBooths, evaluated]);

	const dismiss = useCallback(() => setVisible(false), []);

	return { visible, dismiss };
}
