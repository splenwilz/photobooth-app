/**
 * Licensing API Services
 *
 * Service functions for booth activation and license management.
 *
 * @see POST /api/v1/licensing/activate-booth/pre-check - Pre-check activation
 * @see POST /api/v1/licensing/activate-booth - Activate booth with QR code
 * @see POST /api/v1/licensing/regenerate - Regenerate lost license key
 */

import { apiClient } from "../client";
import type {
	ActivateBoothRequest,
	ActivateBoothResponse,
	PreCheckActivationRequest,
	PreCheckActivationResponse,
	RegenerateLicenseResponse,
} from "./types";

/**
 * Pre-check booth activation
 *
 * Call this AFTER QR scan, BEFORE showing confirmation UI.
 * Returns information about conflicts that need user confirmation.
 *
 * @param data - Fingerprint from QR code and target booth ID
 * @returns Pre-check result with conflicts and subscription status
 *
 * @example
 * const result = await preCheckActivation({
 *   fingerprint: "A1B2C3D4...",
 *   booth_id: "booth-123"
 * });
 * if (!result.can_proceed) {
 *   // Show subscribe prompt
 * } else if (result.conflicts.length > 0) {
 *   // Show conflict warnings
 * }
 */
export async function preCheckActivation(
	data: PreCheckActivationRequest,
): Promise<PreCheckActivationResponse> {
	const response = await apiClient<PreCheckActivationResponse>(
		"/api/v1/licensing/activate-booth/pre-check",
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
	return response;
}

/**
 * Activate booth with QR code fingerprint
 *
 * Supports two modes:
 * 1. Flexible mode (with booth_id): User selects which booth to activate
 * 2. Legacy mode (without booth_id): Auto-determine booth (backward compatible)
 *
 * @param data - Activation request with fingerprint and optional booth_id
 * @returns Activation result with license key or error
 *
 * @example
 * // Flexible mode with confirmations
 * const result = await activateBooth({
 *   fingerprint: "A1B2C3D4...",
 *   booth_id: "booth-123",
 *   confirm_clear_booth_data: true,
 *   confirm_switch_fingerprint: true
 * });
 *
 * // Legacy mode (auto-determine)
 * const result = await activateBooth({
 *   fingerprint: "A1B2C3D4..."
 * });
 */
export async function activateBooth(
	data: ActivateBoothRequest,
): Promise<ActivateBoothResponse> {
	const response = await apiClient<ActivateBoothResponse>(
		"/api/v1/licensing/activate-booth",
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
	return response;
}

/**
 * Regenerate lost license key
 *
 * Creates a new license key using the stored fingerprint from previous activation.
 * The old license key is invalidated.
 *
 * @returns New license key and metadata
 *
 * @example
 * const result = await regenerateLicense();
 * console.log("New key:", result.new_license_key);
 * console.log("Old key (invalidated):", result.old_license_key);
 */
export async function regenerateLicense(): Promise<RegenerateLicenseResponse> {
	const response = await apiClient<RegenerateLicenseResponse>(
		"/api/v1/licensing/regenerate",
		{ method: "POST" },
	);
	return response;
}
