/**
 * Formatting Utilities
 *
 * Pure functions for formatting values for display.
 * These are stateless utilities with no side effects.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
 */

/**
 * Format a number as US currency (e.g., $1,234.56)
 *
 * @param amount - The numeric amount to format
 * @returns Formatted currency string with $ prefix
 *
 * @example
 * formatCurrency(1234.5) // "$1,234.50"
 * formatCurrency(0) // "$0.00"
 */
export function formatCurrency(amount: number): string {
	return `$${amount.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

/**
 * Format a timestamp as time only (e.g., "2:30 PM")
 *
 * @param timestamp - ISO timestamp string
 * @returns Formatted time string
 *
 * @example
 * formatTime("2025-12-29T14:30:00Z") // "2:30 PM"
 */
export function formatTime(timestamp: string): string {
	const date = new Date(timestamp);
	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});
}

/**
 * Format a timestamp as relative time (e.g., "2 hours ago")
 *
 * @param timestamp - ISO timestamp string
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: string): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);

	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;

	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d ago`;

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

/**
 * Format product name from API (e.g., "photo_4x6" -> "Photo 4x6")
 *
 * @param name - API product name with underscores
 * @returns Formatted display name
 *
 * @example
 * formatProductName("photo_4x6") // "Photo 4x6"
 */
export function formatProductName(name: string): string {
	return name
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * Format payment method from API (e.g., "credit" -> "Credit")
 *
 * @param method - API payment method name
 * @returns Capitalized display name
 *
 * @example
 * formatPaymentMethod("credit") // "Credit"
 */
export function formatPaymentMethod(method: string): string {
	return method.charAt(0).toUpperCase() + method.slice(1);
}

