/**
 * Opportunistic push-device registration.
 *
 * Called from the tabs layout, which only mounts once the user is authenticated
 * — so it fires reliably after an in-session login AND on every authed cold
 * start (fixing the stale-`isAuthenticated` gap where the root layout never
 * re-evaluated auth mid-session).
 *
 * Silent: it registers only when OS permission is ALREADY granted (never
 * prompts — the priming modal / settings own the prompt).
 */

import { useEffect } from "react";
import { useRegisterDevice } from "@/api/push/queries";
import { acquireExpoPushToken } from "@/utils/push-notifications";

export function useRegisterPushDevice() {
	const { mutate: registerDevice } = useRegisterDevice();

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const result = await acquireExpoPushToken({
				requestIfUndetermined: false,
			});
			if (cancelled || result.status !== "granted") return;
			registerDevice({
				expo_push_token: result.token,
				device_id: result.deviceId,
				platform: result.platform,
			});
		})();
		return () => {
			cancelled = true;
		};
	}, [registerDevice]);
}
