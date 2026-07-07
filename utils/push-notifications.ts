/**
 * Push Notification Utilities (pure, non-React)
 *
 * Device-id persistence and Expo push-token acquisition. Kept out of the hook
 * so both the root listener hook and the "Enable push" settings button share
 * one implementation and it stays unit-testable.
 *
 * @see https://docs.expo.dev/push-notifications/push-notifications-setup/
 */

import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { DevicePlatform } from "@/api/push/types";

/** SecureStore key holding this install's stable device id */
const DEVICE_ID_KEY = "push_device_id";

/** SecureStore key marking that the one-time push priming prompt was shown. */
const PRIMING_SHOWN_KEY = "push_priming_shown";

/** Android notification channel id — MUST match the backend's `channelId`. */
export const ANDROID_CHANNEL_ID = "default";

/**
 * Read the persisted device id, or null if none exists yet.
 * Used on logout to unregister without creating a new id.
 */
export async function getStoredDeviceId(): Promise<string | null> {
	return SecureStore.getItemAsync(DEVICE_ID_KEY);
}

/**
 * In-flight guard so concurrent first-run callers share ONE creation promise
 * (otherwise two callers could each mint a different UUID and register twice).
 */
let creatingDeviceId: Promise<string> | null = null;

/**
 * Get the persisted device id, generating and storing one on first call.
 * A locally-generated UUID is platform-uniform and synchronous to read after
 * first generation — preferred over IDFV/ANDROID_ID, which are platform-split
 * and can be null at cold start (per Expo docs).
 */
export async function getOrCreateDeviceId(): Promise<string> {
	const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
	if (existing) return existing;
	// Coalesce concurrent creators onto the same promise → one shared id.
	if (!creatingDeviceId) {
		creatingDeviceId = (async () => {
			const id = Crypto.randomUUID();
			await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
			return id;
		})().finally(() => {
			creatingDeviceId = null;
		});
	}
	return creatingDeviceId;
}

/** Resolve the EAS projectId required by getExpoPushTokenAsync in SDK 54. */
export function resolveProjectId(): string | undefined {
	return (
		Constants?.expoConfig?.extra?.eas?.projectId ??
		Constants?.easConfig?.projectId
	);
}

/** Ensure the Android notification channel exists (no-op off Android). */
export async function ensureAndroidChannel(): Promise<void> {
	if (Platform.OS !== "android") return;
	await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
		name: "Alerts",
		importance: Notifications.AndroidImportance.HIGH,
		vibrationPattern: [0, 250, 250, 250],
		lightColor: "#FF231F7C",
	});
}

/** Whether the one-time push priming prompt has already been shown. */
export async function hasSeenPushPriming(): Promise<boolean> {
	return (await SecureStore.getItemAsync(PRIMING_SHOWN_KEY)) === "1";
}

/** Mark the push priming prompt as shown (idempotent). */
export async function markPushPrimingSeen(): Promise<void> {
	await SecureStore.setItemAsync(PRIMING_SHOWN_KEY, "1");
}

/** High-level push permission state the UI cares about. */
export type PushPermissionState = "granted" | "denied" | "undetermined";

/**
 * Interpret a permissions response as "may we deliver notifications?".
 *
 * On iOS the top-level `status`/`granted` is NOT reliable for PROVISIONAL (per
 * Expo docs), so when `ios.status` is present we read it — AUTHORIZED,
 * PROVISIONAL and EPHEMERAL all count as grantable. When `ios.status` is absent
 * (Android, or bare mocks) we fall back to the top-level `granted`/`status`.
 */
function isGranted(
	settings: Notifications.NotificationPermissionsStatus,
): boolean {
	const iosStatus = settings.ios?.status;
	if (Platform.OS === "ios" && iosStatus != null) {
		return (
			iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
			iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
			iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
		);
	}
	return settings.granted === true || settings.status === "granted";
}

/** Map a permissions response to granted / denied / undetermined. */
function toPermissionState(
	settings: Notifications.NotificationPermissionsStatus,
): PushPermissionState {
	if (isGranted(settings)) return "granted";
	const iosStatus = settings.ios?.status;
	if (Platform.OS === "ios" && iosStatus != null) {
		return iosStatus === Notifications.IosAuthorizationStatus.NOT_DETERMINED
			? "undetermined"
			: "denied";
	}
	return settings.status === "undetermined" ? "undetermined" : "denied";
}

/** Read the current push permission state (no user-facing effects). */
export async function getPushPermissionState(): Promise<PushPermissionState> {
	return toPermissionState(await Notifications.getPermissionsAsync());
}

/** Outcome of trying to acquire an Expo push token. */
export type AcquireTokenResult =
	| {
			status: "granted";
			token: string;
			deviceId: string;
			platform: DevicePlatform;
	  }
	| { status: "denied" }
	/** Simulator/emulator/web, or no EAS projectId — cannot obtain a token. */
	| { status: "unsupported" };

/**
 * Acquire an Expo push token, requesting OS permission if needed.
 *
 * @param requestIfUndetermined - when false, only proceeds if permission is
 *   ALREADY granted (silent, opportunistic path — never prompts). When true,
 *   shows the OS prompt (the "Enable alerts" button / priming modal).
 * @param provisional - iOS only: request QUIET provisional authorization (no
 *   system prompt) as the "Not now"/deny fallback. On Android (no provisional
 *   tier) this returns `denied` without prompting.
 */
export async function acquireExpoPushToken({
	requestIfUndetermined = true,
	provisional = false,
}: {
	requestIfUndetermined?: boolean;
	provisional?: boolean;
} = {}): Promise<AcquireTokenResult> {
	// A native remote-push token needs a real device and a mobile platform.
	if (!Device.isDevice || Platform.OS === "web") {
		return { status: "unsupported" };
	}

	let settings = await Notifications.getPermissionsAsync();
	if (!isGranted(settings)) {
		if (!requestIfUndetermined) return { status: "denied" };
		if (provisional && Platform.OS === "ios") {
			// Quiet provisional authorization — no system prompt is shown.
			settings = await Notifications.requestPermissionsAsync({
				ios: { allowProvisional: true },
			});
		} else if (provisional) {
			// Android has no provisional tier — don't prompt on the "Not now" path.
			return { status: "denied" };
		} else {
			settings = await Notifications.requestPermissionsAsync();
		}
		if (!isGranted(settings)) return { status: "denied" };
	}

	const projectId = resolveProjectId();
	if (!projectId) {
		console.warn("[push] missing EAS projectId; cannot get push token");
		return { status: "unsupported" };
	}

	await ensureAndroidChannel();

	const { data: token } = await Notifications.getExpoPushTokenAsync({
		projectId,
	});
	const deviceId = await getOrCreateDeviceId();
	const platform: DevicePlatform = Platform.OS === "ios" ? "ios" : "android";

	return { status: "granted", token, deviceId, platform };
}
