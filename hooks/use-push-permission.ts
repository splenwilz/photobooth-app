/**
 * Tracks OS push-permission state and keeps it fresh.
 *
 * Re-reads on mount and whenever the app returns to the foreground — the latter
 * catches the user toggling notifications in the OS Settings app, which does NOT
 * change React Navigation focus. Shared by the Alerts banner and the
 * Notifications settings screen (was duplicated in both).
 *
 * @param active - when false, skips reading/subscribing (e.g. screen unfocused)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
	getPushPermissionState,
	type PushPermissionState,
} from "@/utils/push-notifications";

export function usePushPermission(active = true) {
	const [state, setState] = useState<PushPermissionState | "checking">(
		"checking",
	);
	const mountedRef = useRef(true);
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	// Imperative refresh (e.g. after an in-app "Enable" tap). Guarded so a late
	// resolve after unmount doesn't setState (parity with the effect's guard).
	const refresh = useCallback(() => {
		getPushPermissionState()
			.then((s) => mountedRef.current && setState(s))
			.catch(() => mountedRef.current && setState("undetermined"));
	}, []);

	useEffect(() => {
		if (!active) return;
		let cancelled = false;
		const read = () => {
			getPushPermissionState()
				.then((s) => !cancelled && setState(s))
				.catch(() => !cancelled && setState("undetermined"));
		};
		read();
		const sub = AppState.addEventListener("change", (s) => {
			if (s === "active") read();
		});
		return () => {
			cancelled = true;
			sub.remove();
		};
	}, [active]);

	return { state, refresh };
}
