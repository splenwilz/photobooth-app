/**
 * Support Tickets API Types
 *
 * Type definitions for support ticket endpoints.
 *
 * @see POST /api/v1/tickets - Create ticket
 * @see GET /api/v1/tickets - List tickets
 * @see GET /api/v1/tickets/{ticket_id} - Get ticket detail
 * @see POST /api/v1/tickets/{ticket_id}/messages - Add message
 * @see POST /api/v1/tickets/{ticket_id}/upload-url - Get attachment upload URL
 */

import { z } from "zod";

// ============================================================================
// TICKET STATUS & PRIORITY
// ============================================================================

/**
 * Ticket status values
 */
export type TicketStatus =
	| "open"
	| "pending"
	| "in_progress"
	| "resolved"
	| "closed";

/**
 * Ticket priority values
 */
export type TicketPriority = "low" | "medium" | "high" | "critical";

// ============================================================================
// CREATE TICKET
// ============================================================================

/**
 * Zod schema for create ticket request validation
 */
export const CreateTicketRequestSchema = z.object({
	subject: z
		.string()
		.min(5, "Subject must be at least 5 characters")
		.max(200, "Subject must be at most 200 characters"),
	message: z.string().min(10, "Message must be at least 10 characters"),
	priority: z.enum(["low", "medium", "high", "critical"]).optional(),
	booth_id: z.string().uuid().optional(),
});

/**
 * POST /api/v1/tickets request body
 */
export type CreateTicketRequest = z.infer<typeof CreateTicketRequestSchema>;

/**
 * POST /api/v1/tickets response
 */
export interface CreateTicketResponse {
	/** Ticket ID */
	id: number;
	/** Human-readable ticket number (e.g., "TKT-001") */
	ticket_number: string;
	/** Ticket subject */
	subject: string;
	/** Current status */
	status: TicketStatus;
	/** Priority level */
	priority: TicketPriority;
	/** Associated booth ID (optional) */
	booth_id: string | null;
	/** Associated booth name (optional) */
	booth_name: string | null;
	/** Number of messages in the ticket */
	message_count: number;
	/** Creation timestamp (ISO 8601) */
	created_at: string;
}

// ============================================================================
// LIST TICKETS
// ============================================================================

/**
 * Query parameters for listing tickets
 */
export interface ListTicketsParams {
	/** Page number (1-indexed) */
	page?: number;
	/** Items per page (max 100) */
	per_page?: number;
	/** Filter by status */
	status?: TicketStatus | "all";
}

/**
 * Ticket item in list response
 */
export interface TicketListItem {
	/** Ticket ID */
	id: number;
	/** Human-readable ticket number (e.g., "TKT-001") */
	ticket_number: string;
	/** Ticket subject */
	subject: string;
	/** Current status */
	status: TicketStatus;
	/** Priority level */
	priority: TicketPriority;
	/** Associated booth ID (optional) */
	booth_id: string | null;
	/** Associated booth name (optional) */
	booth_name: string | null;
	/** Number of messages in the ticket */
	message_count: number;
	/** Timestamp of last message (ISO 8601) */
	last_message_at: string | null;
	/** Creation timestamp (ISO 8601) */
	created_at: string;
}

/**
 * GET /api/v1/tickets response
 */
export interface ListTicketsResponse {
	/** List of tickets */
	tickets: TicketListItem[];
	/** Total number of tickets matching filter */
	total: number;
	/** Current page number */
	page: number;
	/** Items per page */
	per_page: number;
	/** Total number of pages */
	total_pages: number;
}

// ============================================================================
// TICKET DETAIL
// ============================================================================

/**
 * Attachment in a message
 */
export interface TicketAttachment {
	/** Attachment ID */
	id: number;
	/** Original filename */
	filename: string;
	/** File size in bytes */
	file_size: number;
	/** MIME type */
	file_type: string;
	/** Presigned download URL */
	download_url: string;
}

/**
 * Message in a ticket
 */
export interface TicketMessage {
	/** Message ID */
	id: number;
	/** Sender type: user or admin */
	sender_type: "user" | "admin";
	/** Sender display name */
	sender_name: string;
	/** Message content */
	message: string;
	/** Attachments */
	attachments: TicketAttachment[];
	/** Creation timestamp (ISO 8601) */
	created_at: string;
}

/**
 * Booth info in ticket detail
 */
export interface TicketBooth {
	/** Booth ID */
	id: string;
	/** Booth name */
	name: string;
}

/**
 * GET /api/v1/tickets/{ticket_id} response
 */
export interface TicketDetailResponse {
	/** Ticket ID */
	id: number;
	/** Human-readable ticket number (e.g., "TKT-001") */
	ticket_number: string;
	/** Ticket subject */
	subject: string;
	/** Current status */
	status: TicketStatus;
	/** Priority level */
	priority: TicketPriority;
	/** Associated booth (optional) */
	booth: TicketBooth | null;
	/** Assigned admin (optional) */
	assigned_to: string | null;
	/** All messages in chronological order */
	messages: TicketMessage[];
	/** Creation timestamp (ISO 8601) */
	created_at: string;
	/** Last update timestamp (ISO 8601) */
	updated_at: string;
	/** Resolution timestamp (ISO 8601) or null */
	resolved_at: string | null;
}

// ============================================================================
// ADD MESSAGE
// ============================================================================

/**
 * Zod schema for add message request validation
 */
export const AddMessageRequestSchema = z.object({
	message: z.string().min(1, "Message cannot be empty"),
	attachment_s3_keys: z.array(z.string()).optional(),
});

/**
 * POST /api/v1/tickets/{ticket_id}/messages request body
 */
export type AddMessageRequest = z.infer<typeof AddMessageRequestSchema>;

/**
 * POST /api/v1/tickets/{ticket_id}/messages response
 */
export interface AddMessageResponse {
	/** Message ID */
	id: number;
	/** Sender type: user or admin */
	sender_type: "user" | "admin";
	/** Sender display name */
	sender_name: string;
	/** Message content */
	message: string;
	/** Attachments */
	attachments: TicketAttachment[];
	/** Creation timestamp (ISO 8601) */
	created_at: string;
}

// ============================================================================
// UPLOAD URL
// ============================================================================

/**
 * POST /api/v1/tickets/{ticket_id}/upload-url request body
 */
export interface GetUploadUrlRequest {
	/** Original filename (max 300 chars) */
	filename: string;
	/** MIME type (e.g., "image/png", "video/mp4") */
	content_type: string;
}

/**
 * POST /api/v1/tickets/{ticket_id}/upload-url response
 */
export interface GetUploadUrlResponse {
	/** Presigned PUT URL for uploading to S3 */
	upload_url: string;
	/** S3 key to use when creating message */
	s3_key: string;
	/** URL expiration time in seconds */
	expires_in: number;
}
