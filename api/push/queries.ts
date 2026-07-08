/**
 * Push Device Registration Hooks
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/reference/useMutation
 */

import { useMutation } from "@tanstack/react-query";
import { ApiError } from "../client";
import { registerDevice, unregisterDevice } from "./services";
import type { RegisterDeviceRequest } from "./types";

/**
 * Whether an error is a 4xx (client) error we should NOT retry.
 * 429 (rate limited) and 409 (concurrent race) are transient-ish but retrying
 * them from the client is counterproductive — we re-register next launch.
 */
function isNonRetryable(error: unknown): boolean {
	return (
		error instanceof ApiError && error.status >= 400 && error.status < 500
	);
}

/**
 * Hook to register this device's Expo push token.
 *
 * Retries transient (5xx/network) failures twice; never retries 4xx. A 429/409
 * is logged and swallowed — registration is idempotent and repeats on next
 * launch, so a single failure must not crash the app.
 *
 * @see POST /api/v1/push/devices
 */
export function useRegisterDevice() {
	return useMutation({
		mutationFn: (body: RegisterDeviceRequest) => registerDevice(body),
		retry: (failureCount, error) => !isNonRetryable(error) && failureCount < 2,
		onError: (error) => {
			if (error instanceof ApiError && (error.status === 429 || error.status === 409)) {
				console.warn(
					`[push] device registration deferred (HTTP ${error.status}); will retry next launch`,
				);
				return;
			}
			console.error("[push] device registration failed:", error);
		},
	});
}

/**
 * Hook to unregister this device (on logout). Failures are non-fatal — the
 * backend also prunes dead tokens via push receipts.
 *
 * @see DELETE /api/v1/push/devices/{device_id}
 */
export function useUnregisterDevice() {
	return useMutation({
		mutationFn: (deviceId: string) => unregisterDevice(deviceId),
		onError: (error) => {
			console.warn("[push] device unregister failed:", error);
		},
	});
}
