/**
 * Notification Preferences API Types
 *
 * Types for email notification preference management.
 * @see GET /api/v1/notifications/preferences
 * @see PUT /api/v1/notifications/preferences/{event_type}
 * @see PUT /api/v1/notifications/preferences
 * @see GET /api/v1/notifications/history
 */

/**
 * Notification event types (16 total).
 * The original 14 plus two push-only critical events added with the push
 * channel: `stranded_paid_session`, `payment_result_invalid`.
 */
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
	| "pcb_error"
	| "stranded_paid_session"
	| "payment_result_invalid";

/**
 * Notification category groupings. Widened to `string` because the backend
 * owns the category taxonomy — the UI renders whatever categories arrive and
 * falls back gracefully for unknown ones, so a new category can't crash the
 * screen. The known values are documented in {@link KNOWN_NOTIFICATION_CATEGORIES}.
 */
export type NotificationCategory = string;

/** Delivery channels a preference can toggle independently. */
export type NotificationChannel = "email" | "push";

/**
 * Per-channel enabled state for a single event.
 *
 * A channel key is present ONLY if that channel is **offered** for this event.
 * The backend omits `email` for operational events (booth/hardware) so users
 * can disable what's provided but can never ADD email we don't want — this caps
 * email volume (SendGrid quota) at the source. Render a toggle only for the
 * keys that are present.
 */
export interface NotificationChannelState {
	email?: boolean;
	push?: boolean;
}

/** Single notification preference from API */
export interface NotificationPreference {
	event_type: NotificationEventType;
	label: string;
	description: string;
	category: NotificationCategory;
	/** @deprecated Mirrors `channels.email`. Read `channels` instead. */
	enabled: boolean;
	/** Per-channel toggles (email + push). */
	channels: NotificationChannelState;
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

/** One channel toggle in a PATCH preferences request. */
export interface PreferenceChannelUpdate {
	event_type: NotificationEventType;
	channel: NotificationChannel;
	enabled: boolean;
}

/** PATCH /api/v1/notifications/preferences request body */
export interface PatchPreferencesRequest {
	updates: PreferenceChannelUpdate[];
}

/** PATCH /api/v1/notifications/preferences response */
export interface PatchPreferencesResponse {
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
