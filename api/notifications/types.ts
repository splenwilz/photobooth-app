/**
 * Notification Preferences API Types
 *
 * Types for email notification preference management.
 * @see GET /api/v1/notifications/preferences
 * @see PUT /api/v1/notifications/preferences/{event_type}
 * @see PUT /api/v1/notifications/preferences
 * @see GET /api/v1/notifications/history
 */

/** All 14 notification event types */
export type NotificationEventType =
	| "license_activated"
	| "license_deactivated"
	| "license_expiry_warning"
	| "license_revoked"
	| "booth_registered"
	| "booth_unregistered"
	| "booth_offline"
	| "subscription_created"
	| "payment_failed"
	| "subscription_cancelled"
	| "subscription_renewed"
	| "printer_error"
	| "supply_critical"
	| "pcb_error";

/** Notification category groupings */
export type NotificationCategory = "license" | "booth" | "billing" | "hardware";

/** Single notification preference from API */
export interface NotificationPreference {
	event_type: NotificationEventType;
	label: string;
	description: string;
	category: NotificationCategory;
	enabled: boolean;
}

/** GET /api/v1/notifications/preferences response */
export interface NotificationPreferencesResponse {
	preferences: NotificationPreference[];
}

/** PUT /api/v1/notifications/preferences/{event_type} request body */
export interface UpdatePreferenceRequest {
	enabled: boolean;
}

/** PUT /api/v1/notifications/preferences (bulk) request body */
export interface BulkUpdatePreferencesRequest {
	preferences: Partial<Record<NotificationEventType, boolean>>;
}

/** PUT /api/v1/notifications/preferences (bulk) response */
export interface BulkUpdatePreferencesResponse {
	updated: number;
}

/** Notification delivery status */
export type NotificationStatus = "sent" | "failed" | "skipped";

/** Single notification history item */
export interface NotificationHistoryItem {
	id: number;
	event_type: NotificationEventType;
	recipient_email: string;
	subject: string;
	booth_id: string | null;
	status: NotificationStatus;
	created_at: string;
}

/** GET /api/v1/notifications/history response */
export interface NotificationHistoryResponse {
	items: NotificationHistoryItem[];
	total: number;
}

/** GET /api/v1/notifications/history query params */
export interface NotificationHistoryParams {
	/** Number of entries to return (1-100, default 20) */
	limit?: number;
	/** Number of entries to skip (default 0) */
	offset?: number;
}
