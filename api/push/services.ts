/**
 * Push Device Registration Services
 *
 * @see POST /api/v1/push/devices
 * @see DELETE /api/v1/push/devices/{device_id}
 */

import { apiClient } from "../client";
import type { RegisterDeviceRequest, RegisterDeviceResponse } from "./types";

/**
 * Register (upsert) this device's Expo push token with the backend.
 * 201 = new row, 200 = existing (user_id, device_id) refreshed.
 *
 * @param body - token + stable device_id + platform
 * @see POST /api/v1/push/devices
 */
export async function registerDevice(
	body: RegisterDeviceRequest,
): Promise<RegisterDeviceResponse> {
	return apiClient<RegisterDeviceResponse>("/api/v1/push/devices", {
		method: "POST",
		body: JSON.stringify(body),
	});
}

/**
 * Unregister this device (e.g. on logout). Idempotent — 204 even if gone.
 *
 * @param deviceId - the stable per-install device_id
 * @see DELETE /api/v1/push/devices/{device_id}
 */
export async function unregisterDevice(deviceId: string): Promise<void> {
	await apiClient<void>(
		`/api/v1/push/devices/${encodeURIComponent(deviceId)}`,
		{ method: "DELETE" },
	);
}
