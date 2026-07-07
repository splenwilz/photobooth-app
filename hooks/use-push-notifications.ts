/**
 * Push Notifications Hook (React glue)
 *
 * Mounted ONCE in the root layout. Responsibilities:
 * - Configure how notifications present in the foreground (SDK 54 API).
 * - Ensure the Android "default" channel exists at startup (so an incoming push
 *   referencing channelId "default" is never dropped/mis-rendered).
 * - Route tapped notifications (warm + cold start) via the shared deep-link
 *   router, and mark the associated alert read — exactly ONCE per response.
 *
 * Device registration lives in the tabs layout (useRegisterPushDevice), which
 * only mounts when the user is authenticated.
 *
 * @see https://docs.expo.dev/versions/latest/sdk/notifications/
 */

import { useMarkAlertRead } from "@/api/alerts/queries";
import { routeDeepLink } from "@/hooks/use-deep-links";
import { ensureAndroidChannel } from "@/utils/push-notifications";
import { useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef } from "react";

// Foreground presentation. SDK 54 uses shouldShowBanner + shouldShowList
// (shouldShowAlert is deprecated). Badge is left to the OS/notification.
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldPlaySound: true,
		shouldSetBadge: false,
		shouldShowBanner: true,
		shouldShowList: true,
	}),
});

/** Custom data attached to a push by the backend (contract §5). */
interface PushNotificationData {
	deep_link?: string;
	alert_id?: string;
	booth_id?: string;
	severity?: string;
}

export function usePushNotifications() {
	const queryClient = useQueryClient();
	// `.mutate` is a stable reference in React Query v5 — safe as a dep.
	const { mutate: markAlertRead } = useMarkAlertRead();

	// Guards against handling the SAME response twice. On a cold-start tap iOS
	// fires BOTH the listener and getLastNotificationResponseAsync for the launch
	// notification (expo/expo#30649), so we dedupe by request identifier.
	const handledResponseIds = useRef<Set<string>>(new Set());

	const handleResponse = useCallback(
		(response: Notifications.NotificationResponse | null) => {
			if (!response) return;
			// Ignore custom action buttons — only a plain tap "opens" the target.
			if (
				response.actionIdentifier !==
				Notifications.DEFAULT_ACTION_IDENTIFIER
			) {
				return;
			}
			const id = response.notification.request.identifier;
			if (handledResponseIds.current.has(id)) return;
			handledResponseIds.current.add(id);

			const data = response.notification.request.content
				.data as PushNotificationData;
			if (data?.alert_id) {
				markAlertRead({ alertId: data.alert_id, boothId: data.booth_id });
			}
			if (data?.deep_link) {
				routeDeepLink(data.deep_link, queryClient);
			}
		},
		[queryClient, markAlertRead],
	);

	// Ensure the Android channel exists as early as possible (M6) — decoupled
	// from token acquisition so a push can't arrive before the channel is made.
	useEffect(() => {
		ensureAndroidChannel().catch(() => {});
	}, []);

	// Warm taps via the listener; the cold-start tap (which launched the app) is
	// also delivered by getLastNotificationResponseAsync. We clear the stored
	// response after handling so a later NORMAL launch doesn't re-route to it
	// (per the clearLastNotificationResponseAsync doc), and dedupe covers the
	// iOS listener+async double-fire for the launch tap itself.
	useEffect(() => {
		const sub =
			Notifications.addNotificationResponseReceivedListener(handleResponse);
		Notifications.getLastNotificationResponseAsync()
			.then((r) => {
				if (!r) return;
				handleResponse(r);
				// Return into the chain so a rejection hits the trailing .catch.
				return Notifications.clearLastNotificationResponseAsync();
			})
			.catch(() => {});
		return () => sub.remove();
	}, [handleResponse]);
}
