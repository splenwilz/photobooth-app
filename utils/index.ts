/**
 * Utils Index
 *
 * Central export for all utility functions.
 * Import from "@/utils" instead of individual files.
 *
 * @example
 * import { formatCurrency, mapPrinterStatus, mapBoothAlertToAppAlert } from "@/utils";
 */

// Formatting utilities
export {
	formatCurrency,
	formatTime,
	formatRelativeTime,
	formatProductName,
	formatPaymentMethod,
} from "./format";

// Hardware status mapping
export {
	type ComponentStatus,
	getBoothStatusColor,
	mapPrinterStatus,
	getPrinterStatusColor,
	mapPaymentControllerStatus,
	getPaymentControllerStatusColor,
	mapCameraStatus,
	getCameraStatusColor,
	getStatusColor,
} from "./status-mapping";

// Alert mapping
export {
	mapBoothAlertToAppAlert,
	mapDashboardAlertToAppAlert,
} from "./alert-mapping";

