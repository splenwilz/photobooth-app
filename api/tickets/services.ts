/**
 * Support Tickets API Services
 *
 * Service functions for creating and managing support tickets.
 *
 * @see POST /api/v1/tickets - Create ticket
 * @see GET /api/v1/tickets - List tickets
 * @see GET /api/v1/tickets/{ticket_id} - Get ticket detail
 * @see POST /api/v1/tickets/{ticket_id}/messages - Add message
 * @see POST /api/v1/tickets/{ticket_id}/upload-url - Get attachment upload URL
 */

import { apiClient } from "../client";
import type {
	AddMessageRequest,
	AddMessageResponse,
	CreateTicketRequest,
	CreateTicketResponse,
	GetUploadUrlRequest,
	GetUploadUrlResponse,
	ListTicketsParams,
	ListTicketsResponse,
	TicketDetailResponse,
} from "./types";

/**
 * Create a new support ticket
 *
 * Creates a ticket with an initial message. Optionally link to a booth.
 *
 * @param data - Ticket creation data
 * @returns Created ticket info
 *
 * @example
 * const ticket = await createTicket({
 *   subject: "Printer not working",
 *   message: "My printer stopped working after the update...",
 *   priority: "high",
 *   booth_id: "booth-123",
 * });
 * console.log(`Created ticket ${ticket.ticket_number}`);
 */
export async function createTicket(
	data: CreateTicketRequest,
): Promise<CreateTicketResponse> {
	const response = await apiClient<CreateTicketResponse>("/api/v1/tickets", {
		method: "POST",
		body: JSON.stringify(data),
	});
	return response;
}

/**
 * List user's support tickets
 *
 * Returns paginated list of tickets with optional status filter.
 *
 * @param params - Query parameters for pagination and filtering
 * @returns Paginated ticket list
 *
 * @example
 * const { tickets, total } = await listTickets({ status: "open", page: 1 });
 * tickets.forEach(t => console.log(t.ticket_number, t.subject));
 */
export async function listTickets(
	params?: ListTicketsParams,
): Promise<ListTicketsResponse> {
	const searchParams = new URLSearchParams();

	if (params?.page) {
		searchParams.set("page", params.page.toString());
	}
	if (params?.per_page) {
		searchParams.set("per_page", params.per_page.toString());
	}
	if (params?.status && params.status !== "all") {
		searchParams.set("status", params.status);
	}

	const queryString = searchParams.toString();
	const url = `/api/v1/tickets${queryString ? `?${queryString}` : ""}`;

	const response = await apiClient<ListTicketsResponse>(url, {
		method: "GET",
	});
	return response;
}

/**
 * Get ticket detail with full conversation history
 *
 * Returns ticket with all messages and attachments.
 *
 * @param ticketId - Ticket ID
 * @returns Ticket detail with messages
 *
 * @example
 * const ticket = await getTicketDetail(1);
 * ticket.messages.forEach(m => console.log(m.sender_name, m.message));
 */
export async function getTicketDetail(
	ticketId: number,
): Promise<TicketDetailResponse> {
	const response = await apiClient<TicketDetailResponse>(
		`/api/v1/tickets/${ticketId}`,
		{ method: "GET" },
	);
	return response;
}

/**
 * Add a reply message to a ticket
 *
 * Adds a message to an existing ticket. Can include attachments
 * by uploading to S3 first using getUploadUrl.
 *
 * @param ticketId - Ticket ID
 * @param data - Message data with optional attachment S3 keys
 * @returns Created message
 *
 * @example
 * const message = await addMessage(1, {
 *   message: "I tried restarting but it still doesn't work",
 * });
 */
export async function addMessage(
	ticketId: number,
	data: AddMessageRequest,
): Promise<AddMessageResponse> {
	const response = await apiClient<AddMessageResponse>(
		`/api/v1/tickets/${ticketId}/messages`,
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
	return response;
}

/**
 * Get presigned URL for uploading an attachment
 *
 * Returns a presigned S3 PUT URL for direct upload.
 * After uploading, use the s3_key when creating a message.
 *
 * @param ticketId - Ticket ID
 * @param data - Upload request with filename and content type
 * @returns Presigned upload URL and S3 key
 *
 * @example
 * // 1. Get upload URL
 * const { upload_url, s3_key } = await getUploadUrl(1, {
 *   filename: "screenshot.png",
 *   content_type: "image/png",
 * });
 *
 * // 2. Upload file to S3
 * await fetch(upload_url, {
 *   method: "PUT",
 *   headers: { "Content-Type": "image/png" },
 *   body: file,
 * });
 *
 * // 3. Include s3_key in message
 * await addMessage(1, {
 *   message: "Here's a screenshot",
 *   attachment_s3_keys: [s3_key],
 * });
 */
export async function getUploadUrl(
	ticketId: number,
	data: GetUploadUrlRequest,
): Promise<GetUploadUrlResponse> {
	const response = await apiClient<GetUploadUrlResponse>(
		`/api/v1/tickets/${ticketId}/upload-url`,
		{
			method: "POST",
			body: JSON.stringify(data),
		},
	);
	return response;
}
