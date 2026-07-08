/**
 * Opportunistic push-device registration.
 *
 * Called from the tabs layout, which only mounts once the user is authenticated
 * — so it fires reliably after an in-session login AND on every authed cold
 * start. It also re-runs on app foreground, so a user who enables notifications
 * in the OS Settings app (rather than the in-app button) gets registered on
 * return instead of only at the next cold start.
 *
 * Silent: it registers only when OS permission is ALREADY granted (never
 * prompts — the priming modal / settings own the prompt).
 */

import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useRegisterDevice } from "@/api/push/queries";
import { acquireExpoPushToken } from "@/utils/push-notifications";

export function useRegisterPushDevice() {
	const { mutate: registerDevice } = useRegisterDevice();
	const mountedRef = useRef(true);

	const register = useCallback(async () => {
		try {
			const result = await acquireExpoPushToken({
				requestIfUndetermined: false,
			});
			if (!mountedRef.current || result.status !== "granted") return;
			registerDevice({
				expo_push_token: result.token,
				device_id: result.deviceId,
				platform: result.platform,
			});
		} catch (e) {
			// Nothing awaits this — swallow native failures so they don't become
			// an unhandled rejection.
			console.warn("[push] silent registration failed:", e);
		}
	}, [registerDevice]);

	useEffect(() => {
		mountedRef.current = true;
		register();
		const sub = AppState.addEventListener("change", (state) => {
			if (state === "active") register();
		});
		return () => {
			mountedRef.current = false;
			sub.remove();
		};
	}, [register]);
}
