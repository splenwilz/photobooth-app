/**
 * Booth Transfer React Query Hooks
 *
 * Mirrors the web dashboard's core/api/transfers/queries.ts — keep in sync.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../client";
import { queryKeys } from "../utils/query-keys";
import { getTransferErrorCode } from "./errors";
import {
	acceptTransfer,
	cancelBoothTransfer,
	createBoothTransfer,
	declineTransfer,
	getLatestBoothTransfer,
	getTransfer,
	listMyTransfers,
	resendBoothTransfer,
} from "./services";
import type { BoothTransfer, CreateTransferRequest } from "./types";
import { displayStatus } from "./utils";

/** Poll a pending offer so seller withdrawals / expiry show up while the buyer looks at it. */
const PENDING_POLL_INTERVAL_MS = 30_000;

/**
 * The app-level QueryClient retries mutations once (api/query-client.ts).
 * Transfer mutations must opt out: accept is non-idempotent (a retried
 * timeout would re-run the handover and surface a spurious 409), and
 * create/resend draw from a 10/hour rate bucket.
 */
const NO_RETRY = { retry: false as const };

/**
 * Latest transfer (any status) for a booth the caller owns or sold.
 * Resolves to null when the booth has never been offered (404 `no_transfer`).
 */
export function useLatestBoothTransfer(
	boothId: string | null,
	enabled: boolean = true,
) {
	return useQuery<BoothTransfer | null>({
		queryKey: queryKeys.transfers.boothLatest(boothId ?? ""),
		queryFn: async () => {
			try {
				return await getLatestBoothTransfer(boothId!);
			} catch (error) {
				// "Never offered" is an expected state, not an error. Only that
				// specific 404 — a `booth_not_found` 404 (deleted booth) must
				// surface as a real error, not an empty offer form.
				if (
					error instanceof ApiError &&
					error.status === 404 &&
					getTransferErrorCode(error) === "no_transfer"
				) {
					return null;
				}
				throw error;
			}
		},
		enabled: !!boothId && enabled,
		staleTime: 30 * 1000,
	});
}

/** Offers addressed to the signed-in user's email, newest first. */
export function useMyTransfers(enabled: boolean = true) {
	return useQuery<BoothTransfer[]>({
		queryKey: queryKeys.transfers.list(),
		queryFn: listMyTransfers,
		enabled,
		staleTime: 60 * 1000,
	});
}

/** Offer detail for the buyer review screen. Polls while the offer is pending. */
export function useTransfer(transferId: string | null) {
	return useQuery<BoothTransfer>({
		queryKey: queryKeys.transfers.detail(transferId ?? ""),
		queryFn: () => getTransfer(transferId!),
		enabled: !!transferId,
		// displayStatus, not raw status: the server stamps `expired` lazily, so a
		// lapsed offer can report `pending` forever — don't poll it forever.
		refetchInterval: (query) =>
			query.state.data &&
			displayStatus(query.state.data, Date.now()) === "pending"
				? PENDING_POLL_INTERVAL_MS
				: false,
	});
}

/** Seller: offer the booth to a buyer's email. */
export function useCreateBoothTransfer() {
	const queryClient = useQueryClient();

	return useMutation<
		BoothTransfer,
		Error,
		{ boothId: string } & CreateTransferRequest
	>({
		...NO_RETRY,
		mutationFn: ({ boothId, ...data }) => createBoothTransfer(boothId, data),
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.transfers.boothLatest(variables.boothId),
			});
		},
	});
}

/**
 * Seller: rotate the accept token and re-send the offer email. The buyer's
 * old link stops working and the 7-day window restarts.
 */
export function useResendBoothTransfer() {
	const queryClient = useQueryClient();

	return useMutation<BoothTransfer, Error, { boothId: string }>({
		...NO_RETRY,
		mutationFn: ({ boothId }) => resendBoothTransfer(boothId),
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.transfers.boothLatest(variables.boothId),
			});
		},
	});
}

/** Seller: withdraw the pending offer. */
export function useCancelBoothTransfer() {
	const queryClient = useQueryClient();

	return useMutation<BoothTransfer, Error, { boothId: string }>({
		...NO_RETRY,
		mutationFn: ({ boothId }) => cancelBoothTransfer(boothId),
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.transfers.boothLatest(variables.boothId),
			});
		},
	});
}

/**
 * Buyer: accept the offer — executes the handover.
 *
 * Non-idempotent and can take a few seconds (Stripe + S3 copies). NO_RETRY is
 * load-bearing here: a retried timeout would re-POST the accept and turn a
 * success into a spurious 409. On ANY outcome (including an ambiguous
 * timeout, where the accept may have succeeded server-side) invalidate
 * everything ownership touches so the UI re-fetches the real world instead
 * of re-POSTing — a successful accept shows as completed/settled.
 */
export function useAcceptTransfer() {
	const queryClient = useQueryClient();

	return useMutation<
		BoothTransfer,
		Error,
		{ transferId: string; token: string }
	>({
		...NO_RETRY,
		mutationFn: ({ transferId, token }) => acceptTransfer(transferId, { token }),
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.transfers.detail(variables.transferId),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.transfers.list() });
			// Ownership may have flipped (even when the POST errored ambiguously):
			// the booth, its billing, and any conveyed templates now belong to the
			// buyer. Invalidating on failure is harmless; missing it on an
			// ambiguous success leaves stale caches. `booths.all()` prefix-matches
			// both the booths overview and the dashboard overview.
			queryClient.invalidateQueries({ queryKey: queryKeys.booths.all() });
			queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() });
			queryClient.invalidateQueries({
				queryKey: queryKeys.templates.purchasedAll(),
			});
			// Mobile keeps alerts and revenue analytics under their own key
			// roots (the web app nests them under dashboard/booths), and both
			// are ownership-scoped — without these, the alerts badge and the
			// analytics totals exclude the just-acquired booth for a staleTime.
			queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all() });
			queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() });
		},
	});
}

/** Buyer: decline the offer. */
export function useDeclineTransfer() {
	const queryClient = useQueryClient();

	return useMutation<BoothTransfer, Error, { transferId: string }>({
		...NO_RETRY,
		mutationFn: ({ transferId }) => declineTransfer(transferId),
		onSettled: (_data, _error, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.transfers.detail(variables.transferId),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.transfers.list() });
		},
	});
}
