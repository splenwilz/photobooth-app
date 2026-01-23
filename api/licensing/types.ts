/**
 * Licensing API Types
 *
 * Type definitions for booth activation and license management.
 *
 * @see POST /api/v1/licensing/activate-booth/pre-check - Pre-check activation
 * @see POST /api/v1/licensing/activate-booth - Activate booth with QR code
 * @see POST /api/v1/licensing/regenerate - Regenerate lost license key
 */

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Activation error codes returned by API
 */
export type ActivationErrorCode =
	| "INVALID_QR"
	| "BOOTH_NOT_READY"
	| "SESSION_EXPIRED"
	| "NO_SUBSCRIPTION"
	| "FINGERPRINT_BOUND_ELSEWHERE"
	| "BOOTH_HAS_OTHER_DATA"
	| "BOOTH_NOT_FOUND";

// ============================================================================
// CONFLICT TYPES
// ============================================================================

/**
 * Types of conflicts that can occur during activation
 */
export type ConflictType =
	| "fingerprint_bound_elsewhere"
	| "booth_has_other_device_data";

/**
 * Conflict details when fingerprint is bound to another booth
 */
export interface FingerprintBoundElsewhereDetails {
	previous_booth_id: string;
	previous_booth_name: string;
}

/**
 * Conflict details when booth has data from another device
 */
export interface BoothHasOtherDeviceDataDetails {
	transaction_count: number;
	previous_hardware_id: string;
}

/**
 * Activation conflict information
 */
export interface ActivationConflict {
	/** Type of conflict */
	conflict_type: ConflictType;
	/** Human-readable message describing the conflict */
	message: string;
	/** Additional details about the conflict */
	details: FingerprintBoundElsewhereDetails | BoothHasOtherDeviceDataDetails;
}

// ============================================================================
// PRE-CHECK ACTIVATION (NEW)
// ============================================================================

/**
 * POST /api/v1/licensing/activate-booth/pre-check request body
 */
export interface PreCheckActivationRequest {
	/** 64-character hex fingerprint extracted from booth QR code */
	fingerprint: string;
	/** Target booth ID to activate on this device */
	booth_id: string;
}

/**
 * POST /api/v1/licensing/activate-booth/pre-check response
 */
export interface PreCheckActivationResponse {
	/** Target booth ID */
	booth_id: string;
	/** Target booth name for display */
	booth_name: string;
	/** Short fingerprint identifier (e.g., "PBX-V1-EF1DE6E3F5985...") */
	fingerprint_short: string;
	/** Whether booth has a valid subscription */
	has_valid_subscription: boolean;
	/** List of conflicts that need user confirmation */
	conflicts: ActivationConflict[];
	/** Whether activation can proceed (may need confirmations) */
	can_proceed: boolean;
	/** Human-readable status message */
	message: string;
}

// ============================================================================
// ACTIVATE BOOTH (MODIFIED)
// ============================================================================

/**
 * POST /api/v1/licensing/activate-booth request body
 *
 * Supports two modes:
 * 1. Flexible mode (with booth_id): User selects which booth to activate
 * 2. Legacy mode (without booth_id): Auto-determine booth (backward compatible)
 */
export interface ActivateBoothRequest {
	/** 64-character hex fingerprint extracted from booth QR code */
	fingerprint: string;
	/** Target booth ID (optional - omit for legacy auto-determine mode) */
	booth_id?: string;
	/** Confirm clearing booth data from previous device */
	confirm_clear_booth_data?: boolean;
	/** Confirm switching fingerprint from another booth */
	confirm_switch_fingerprint?: boolean;
}

/**
 * Cloud sync configuration returned on successful activation
 */
export interface CloudSyncConfig {
	enabled: boolean;
	booth_id: string;
	api_key: string;
	sync_endpoint: string;
	owner_id: string;
}

/**
 * POST /api/v1/licensing/activate-booth response
 */
export interface ActivateBoothResponse {
	/** Whether activation was successful */
	success: boolean;
	/** Short fingerprint identifier (e.g., "PBX-V1-A1B2C3D4E5F67890") */
	fingerprint_short: string;
	/** Generated license key (e.g., "XXXX-XXXX-XXXX-XXXX") or null on error */
	license_key: string | null;
	/** Cloud sync configuration (only on success) */
	cloud_sync?: CloudSyncConfig;
	/** Error code if activation failed, null on success */
	error_code: ActivationErrorCode | null;
	/** Human-readable result message */
	message: string;
}

// ============================================================================
// REGENERATE LICENSE
// ============================================================================

/**
 * POST /api/v1/licensing/regenerate response
 *
 * Regenerates a lost license key. Uses stored fingerprint from previous activation.
 */
export interface RegenerateLicenseResponse {
	/** Whether regeneration was successful */
	success: boolean;
	/** New license key */
	new_license_key: string;
	/** Previous license key (now invalidated) */
	old_license_key: string;
	/** License key type (e.g., "Subscription") */
	key_type: string;
	/** Days until license expires */
	expires_days: number;
	/** Offline license JSON or null */
	license_json: string | null;
	/** Human-readable result message */
	message: string;
}
