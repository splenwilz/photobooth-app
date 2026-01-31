/**
 * Support Tickets React Query Hooks
 *
 * Hooks for fetching and mutating support ticket data.
 *
 * @see https://tanstack.com/query/latest - React Query docs
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/utils/query-keys";
import {
	addMessage,
	createTicket,
	getTicketDetail,
	getUploadUrl,
	listTickets,
} from "./services";
import type {
	AddMessageRequest,
	CreateTicketRequest,
	GetUploadUrlRequest,
	ListTicketsParams,
	TicketStatus,
} from "./types";

/**
 * Hook to list user's support tickets
 *
 * Returns paginated list with optional status filter.
 * Supports pull-to-refresh by refetching.
 *
 * @param params - Query parameters for pagination and filtering
 * @returns Query result with ticket list
 *
 * @example
 * const { data, isLoading, refetch } = useTickets({ status: "open" });
 * data?.tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />);
 */
export function useTickets(params?: ListTicketsParams) {
	return useQuery({
		queryKey: queryKeys.tickets.list(params),
		queryFn: () => listTickets(params),
		staleTime: 2 * 60 * 1000, // 2 minutes - tickets may update frequently
		gcTime: 5 * 60 * 1000, // 5 minutes
	});
}

/**
 * Hook to get ticket detail with messages
 *
 * Returns full ticket info including conversation history.
 * Automatically disabled when ticketId is null.
 *
 * @param ticketId - Ticket ID to fetch (null to disable)
 * @returns Query result with ticket detail
 *
 * @example
 * const { data, isLoading } = useTicketDetail(ticketId);
 * data?.messages.map(msg => <Message key={msg.id} message={msg} />);
 */
export function useTicketDetail(ticketId: number | null) {
	return useQuery({
		queryKey: queryKeys.tickets.detail(ticketId ?? 0),
		queryFn: () => getTicketDetail(ticketId!),
		enabled: ticketId !== null,
		staleTime: 1 * 60 * 1000, // 1 minute - messages may arrive
		gcTime: 5 * 60 * 1000,
	});
}

/**
 * Hook to create a new support ticket
 *
 * Creates ticket and invalidates ticket list on success.
 *
 * @returns Mutation for creating ticket
 *
 * @example
 * const { mutate, isPending } = useCreateTicket();
 *
 * const handleSubmit = () => {
 *   mutate({
 *     subject: "Printer issue",
 *     message: "My printer stopped working...",
 *     priority: "high",
 *   }, {
 *     onSuccess: (ticket) => router.push(`/support/${ticket.id}`),
 *   });
 * };
 */
export function useCreateTicket() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateTicketRequest) => createTicket(data),
		onSuccess: () => {
			// Invalidate ticket list to show new ticket
			queryClient.invalidateQueries({
				queryKey: queryKeys.tickets.all(),
			});
		},
	});
}

/**
 * Hook to add a message to a ticket
 *
 * Adds reply message and invalidates ticket detail on success.
 *
 * @returns Mutation for adding message
 *
 * @example
 * const { mutate, isPending } = useAddMessage();
 *
 * const handleSend = () => {
 *   mutate({
 *     ticketId: 1,
 *     data: { message: "Thanks for the help!" },
 *   });
 * };
 */
export function useAddMessage() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			ticketId,
			data,
		}: {
			ticketId: number;
			data: AddMessageRequest;
		}) => addMessage(ticketId, data),
		onSuccess: (_, variables) => {
			// Invalidate ticket detail to show new message
			queryClient.invalidateQueries({
				queryKey: queryKeys.tickets.detail(variables.ticketId),
			});
			// Also invalidate list to update message count
			queryClient.invalidateQueries({
				queryKey: queryKeys.tickets.all(),
			});
		},
	});
}

/**
 * Hook to get presigned URL for file upload
 *
 * Returns upload URL for direct S3 upload.
 *
 * @returns Mutation for getting upload URL
 *
 * @example
 * const { mutateAsync } = useGetUploadUrl();
 *
 * const uploadFile = async (ticketId: number, file: File) => {
 *   const { upload_url, s3_key } = await mutateAsync({
 *     ticketId,
 *     data: { filename: file.name, content_type: file.type },
 *   });
 *
 *   await fetch(upload_url, {
 *     method: "PUT",
 *     headers: { "Content-Type": file.type },
 *     body: file,
 *   });
 *
 *   return s3_key;
 * };
 */
export function useGetUploadUrl() {
	return useMutation({
		mutationFn: ({
			ticketId,
			data,
		}: {
			ticketId: number;
			data: GetUploadUrlRequest;
		}) => getUploadUrl(ticketId, data),
	});
}
