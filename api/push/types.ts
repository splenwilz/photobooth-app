/**
 * Push Device Registration API Types
 *
 * Types for registering an Expo push token per device install.
 * @see POST /api/v1/push/devices
 * @see DELETE /api/v1/push/devices/{device_id}
 */

/** Device platform reported at registration */
export type DevicePlatform = "ios" | "android";

/**
 * Request body for registering (upserting) a device's Expo push token.
 * The backend keys on (user_id, device_id) — a rotated token updates in place.
 */
export interface RegisterDeviceRequest {
	/** Expo push token, e.g. "ExponentPushToken[xxxx]" */
	expo_push_token: string;
	/** Stable per-install UUID (persisted client-side) */
	device_id: string;
	platform: DevicePlatform;
}

/**
 * Response from registering a device.
 * @see POST /api/v1/push/devices (201 created / 200 refreshed)
 */
export interface RegisterDeviceResponse {
	id: number;
	device_id: string;
	platform: DevicePlatform;
	registered: boolean;
}
