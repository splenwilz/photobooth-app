/**
 * Hardware Status Mapping Utilities
 *
 * Maps API status strings to standardized component status types.
 * Used by StatusCard component and hardware status displays.
 *
 * Status Types:
 * - healthy: Working correctly (green)
 * - warning: Needs attention (yellow)
 * - error: Critical issue (red)
 * - unknown: No data or offline (gray)
 */

import { StatusColors } from "@/constants/theme";

/** Standardized component status type */
export type ComponentStatus = "healthy" | "warning" | "error" | "unknown";

// ============================================
// Booth Status
// ============================================

/**
 * Get color for booth online/offline status
 *
 * @param status - Booth status from API (online, offline, warning, error)
 * @returns Hex color string from StatusColors
 */
export function getBoothStatusColor(status: string): string {
	switch (status) {
		case "online":
			return StatusColors.success;
		case "warning":
			return StatusColors.warning;
		case "offline":
		case "error":
			return StatusColors.error;
		default:
			return StatusColors.neutral;
	}
}

// ============================================
// Printer Status
// ============================================

/**
 * Map printer status string to ComponentStatus
 *
 * Mapping:
 * - Online/OK/Ready → healthy (connected, supplies > 25%)
 * - Low Supplies → warning (paper or ink ≤ 25%)
 * - Error → error (has error message)
 * - Offline → unknown (not detected/disconnected)
 *
 * @param status - Printer status from API
 * @returns Normalized ComponentStatus
 */
export function mapPrinterStatus(
	status: string | undefined,
): ComponentStatus {
	if (!status) return "unknown";
	const lower = status.toLowerCase();

	if (lower === "online" || lower === "ok" || lower === "ready") {
		return "healthy";
	}
	if (lower === "low supplies" || lower === "low") {
		return "warning";
	}
	if (lower === "error") {
		return "error";
	}
	if (lower === "offline") {
		return "unknown";
	}
	return "unknown";
}

/**
 * Get color for printer status
 *
 * @param status - Printer status from API
 * @returns Hex color string from StatusColors
 */
export function getPrinterStatusColor(status: string | undefined): string {
	const mapped = mapPrinterStatus(status);
	switch (mapped) {
		case "healthy":
			return StatusColors.success;
		case "warning":
			return StatusColors.warning;
		case "error":
			return StatusColors.error;
		default:
			return StatusColors.neutral;
	}
}

// ============================================
// Payment Controller Status
// ============================================

/**
 * Map payment controller status string to ComponentStatus
 *
 * Mapping:
 * - Connected/Active/Idle/OK → healthy (working)
 * - Disconnected → warning (was connected, now unplugged)
 * - Error → error (connection error)
 * - Not Configured → unknown (never set up)
 *
 * @param status - Payment controller status from API
 * @returns Normalized ComponentStatus
 */
export function mapPaymentControllerStatus(
	status: string | undefined,
): ComponentStatus {
	if (!status) return "unknown";
	const lower = status.toLowerCase();

	if (
		lower === "connected" ||
		lower === "active" ||
		lower === "idle" ||
		lower === "ok"
	) {
		return "healthy";
	}
	if (lower === "disconnected") {
		return "warning";
	}
	if (lower === "error") {
		return "error";
	}
	if (lower === "not configured") {
		return "unknown";
	}
	return "unknown";
}

/**
 * Get color for payment controller status
 *
 * @param status - Payment controller status from API
 * @returns Hex color string from StatusColors
 */
export function getPaymentControllerStatusColor(
	status: string | undefined,
): string {
	const mapped = mapPaymentControllerStatus(status);
	switch (mapped) {
		case "healthy":
			return StatusColors.success;
		case "warning":
			return StatusColors.warning;
		case "error":
			return StatusColors.error;
		default:
			return StatusColors.neutral;
	}
}

// ============================================
// Camera Status
// ============================================

/**
 * Map camera status string to ComponentStatus
 *
 * Mapping:
 * - Online/OK/Ready → healthy
 * - Warning → warning
 * - Error → error
 * - Offline/Unknown → unknown
 *
 * @param status - Camera status from API
 * @returns Normalized ComponentStatus
 */
export function mapCameraStatus(
	status: string | undefined,
): ComponentStatus {
	if (!status) return "unknown";
	const lower = status.toLowerCase();

	if (lower === "online" || lower === "ok" || lower === "ready") {
		return "healthy";
	}
	if (lower === "warning") {
		return "warning";
	}
	if (lower === "error") {
		return "error";
	}
	return "unknown";
}

/**
 * Get color for camera status
 *
 * @param status - Camera status from API
 * @returns Hex color string from StatusColors
 */
export function getCameraStatusColor(status: string | undefined): string {
	const mapped = mapCameraStatus(status);
	switch (mapped) {
		case "healthy":
			return StatusColors.success;
		case "warning":
			return StatusColors.warning;
		case "error":
			return StatusColors.error;
		default:
			return StatusColors.neutral;
	}
}

// ============================================
// Generic Status Color
// ============================================

/**
 * Get color for any ComponentStatus
 *
 * @param status - ComponentStatus value
 * @returns Hex color string from StatusColors
 */
export function getStatusColor(status: ComponentStatus): string {
	switch (status) {
		case "healthy":
			return StatusColors.success;
		case "warning":
			return StatusColors.warning;
		case "error":
			return StatusColors.error;
		default:
			return StatusColors.neutral;
	}
}

