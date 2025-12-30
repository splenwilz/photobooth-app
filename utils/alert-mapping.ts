/**
 * Alert Mapping Utilities
 *
 * Transforms API alert types to app Alert types for UI display.
 * Handles the mapping between different API response structures.
 *
 * API Alert Structure:
 * - type: string (e.g., "printer_error", "low_supplies")
 * - severity: "critical" | "warning" | "info"
 * - category: "hardware" | "supplies" | "connectivity" | "sales" | "system"
 *
 * App Alert Structure:
 * - type: "critical" | "warning" | "info" (AlertType)
 * - category: "hardware" | "supplies" | "connectivity" | "sales" (AlertCategory)
 */

import type { BoothDetailAlert, DashboardAlert } from "@/api/booths/types";
import type { Alert as ApiAlert } from "@/api/alerts/types";
import type { Alert as AppAlert } from "@/types/photobooth";

/** Category mapping from API to app (handles "system" → "connectivity") */
const CATEGORY_MAP: Record<string, AppAlert["category"]> = {
	hardware: "hardware",
	supplies: "supplies",
	connectivity: "connectivity",
	sales: "sales",
	system: "connectivity", // Map "system" category to "connectivity"
};

/**
 * Maps a single booth's API alert to app Alert type
 *
 * Used when displaying alerts from booth detail response.
 * The API severity becomes the app type, and category is normalized.
 *
 * @param apiAlert - Alert from booth detail API response
 * @returns Normalized Alert for AlertCard component
 *
 * @example
 * const appAlert = mapBoothAlertToAppAlert(apiAlert);
 * <AlertCard alert={appAlert} />
 */
export function mapBoothAlertToAppAlert(apiAlert: BoothDetailAlert): AppAlert {
	return {
		id: apiAlert.id,
		type: apiAlert.severity, // API severity → app type
		category: CATEGORY_MAP[apiAlert.category] ?? "hardware",
		title: apiAlert.title,
		message: apiAlert.message,
		boothId: apiAlert.booth_id,
		boothName: apiAlert.booth_name,
		timestamp: apiAlert.timestamp,
		isRead: apiAlert.is_read,
	};
}

/**
 * Maps dashboard overview alert to app Alert type
 *
 * Used when displaying alerts from aggregated dashboard response.
 * Structure is the same as booth alerts but defined separately
 * for type safety and future divergence.
 *
 * @param apiAlert - Alert from dashboard overview API response
 * @returns Normalized Alert for AlertCard component
 */
export function mapDashboardAlertToAppAlert(apiAlert: DashboardAlert): AppAlert {
	return {
		id: apiAlert.id,
		type: apiAlert.severity, // API severity → app type
		category: CATEGORY_MAP[apiAlert.category] ?? "hardware",
		title: apiAlert.title,
		message: apiAlert.message,
		boothId: apiAlert.booth_id,
		boothName: apiAlert.booth_name,
		timestamp: apiAlert.timestamp,
		isRead: apiAlert.is_read,
	};
}

/**
 * Maps alerts API alert to app Alert type
 *
 * Used when displaying alerts from the alerts API endpoint.
 * Transforms snake_case API properties to camelCase app properties.
 *
 * @param apiAlert - Alert from alerts API response
 * @returns Normalized Alert for UI components
 *
 * @example
 * const appAlert = mapAlertsApiAlertToAppAlert(apiAlert);
 * <AlertCard alert={appAlert} />
 */
export function mapAlertsApiAlertToAppAlert(apiAlert: ApiAlert): AppAlert {
	// Map API category to app category
	// Note: Alerts API uses different category names than booth/dashboard APIs:
	// - Alerts API: "network", "revenue"
	// - Booth/Dashboard APIs: "system", "sales"
	// Both map to the same app categories: "connectivity", "sales"
	const categoryMap: Record<string, AppAlert["category"]> = {
		hardware: "hardware",
		supplies: "supplies",
		network: "connectivity", // Alerts API uses "network", booth APIs use "system"
		revenue: "sales", // Alerts API uses "revenue", booth APIs use "sales"
	};

	return {
		id: apiAlert.id,
		type: apiAlert.severity, // API severity → app type
		category: categoryMap[apiAlert.category] ?? "hardware",
		title: apiAlert.title,
		message: apiAlert.message,
		boothId: apiAlert.booth_id,
		boothName: apiAlert.booth_name,
		timestamp: apiAlert.timestamp,
		isRead: apiAlert.is_read,
	};
}

