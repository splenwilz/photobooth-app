/**
 * Owner payment history — read natively instead of redirecting to Stripe.
 *
 * The contract's sharpest rule is encoded here: a 404 means "not yours, or the
 * route is not deployed" and NEVER "no invoices". An owner with none gets 200
 * with an empty array, so the empty state must be driven by the array.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";

jest.mock("@/api/client", () => ({ apiClient: jest.fn() }));

import { apiClient } from "@/api/client";
import { getBoothInvoices } from "@/api/payments/services";
import { useBoothInvoices } from "@/api/payments/queries";

const mockApiClient = apiClient as jest.Mock;

const EMPTY = {
	booth_id: "booth-1",
	invoices: [],
	has_more: false,
	next_cursor: null,
	server_time: "2026-07-31T12:00:00Z",
};

const INVOICE = {
	id: "in_1",
	amount_cents: 2900,
	currency: "usd",
	status: "paid" as const,
	paid: true,
	attempt_count: 1,
	created: "2026-07-12T09:00:00Z",
	paid_at: "2026-07-12T09:00:04Z",
	hosted_invoice_url: "https://invoice.stripe.com/i/acct_x/test_abc",
	invoice_pdf: "https://pay.stripe.com/invoice/acct_x/test_abc/pdf",
};

function makeWrapper() {
	const client = new QueryClient({
		defaultOptions: {
			// retryDelay 0: the hook overrides `retry` per query, and the default
			// exponential backoff would outrun waitFor's timeout.
			queries: { retry: false, retryDelay: 0, gcTime: 0 },
			mutations: { retry: false, gcTime: 0 },
		},
	});
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
	};
}

beforeEach(() => jest.clearAllMocks());

describe("getBoothInvoices", () => {
	it("GETs the invoices endpoint with the default limit", async () => {
		mockApiClient.mockResolvedValue(EMPTY);

		await getBoothInvoices("booth-1");

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-1/invoices?limit=12",
			{ method: "GET" },
		);
	});

	it("passes an explicit limit through", async () => {
		mockApiClient.mockResolvedValue(EMPTY);

		await getBoothInvoices("booth-1", { limit: 100 });

		expect(mockApiClient.mock.calls[0][0]).toContain("limit=100");
	});

	it("sends the cursor as starting_after when paging", async () => {
		mockApiClient.mockResolvedValue(EMPTY);

		await getBoothInvoices("booth-1", { startingAfter: "in_1PwZyX" });

		expect(mockApiClient.mock.calls[0][0]).toContain(
			"starting_after=in_1PwZyX",
		);
	});

	it("omits starting_after on the first page", async () => {
		mockApiClient.mockResolvedValue(EMPTY);

		await getBoothInvoices("booth-1");

		expect(mockApiClient.mock.calls[0][0]).not.toContain("starting_after");
	});

	it("encodes the booth id", async () => {
		mockApiClient.mockResolvedValue(EMPTY);

		await getBoothInvoices("a/b?c");

		expect(mockApiClient.mock.calls[0][0]).toBe(
			"/api/v1/booths/a%2Fb%3Fc/invoices?limit=12",
		);
	});

	it("rejects an empty boothId before calling out", async () => {
		await expect(getBoothInvoices("")).rejects.toThrow(/Booth ID is required/i);
		expect(mockApiClient).not.toHaveBeenCalled();
	});
});

describe("useBoothInvoices", () => {
	it("is disabled without a booth id", () => {
		const { result } = renderHook(() => useBoothInvoices(null), {
			wrapper: makeWrapper(),
		});

		expect(result.current.fetchStatus).toBe("idle");
		expect(mockApiClient).not.toHaveBeenCalled();
	});

	it("treats an empty list as data, not as an error", async () => {
		mockApiClient.mockResolvedValue(EMPTY);

		const { result } = renderHook(() => useBoothInvoices("booth-1"), {
			wrapper: makeWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.pages[0].invoices).toEqual([]);
		expect(result.current.error).toBeNull();
	});

	it("does not retry a 404 — the route will not appear on a second try", async () => {
		// 404 means not yours, or not deployed. Retrying costs a round trip and
		// delays the error state; it can never succeed.
		mockApiClient.mockRejectedValue(
			Object.assign(new Error("Not Found"), { status: 404 }),
		);

		const { result } = renderHook(() => useBoothInvoices("booth-1"), {
			wrapper: makeWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(mockApiClient).toHaveBeenCalledTimes(1);
	});

	it("does not retry a 429 — it carries its own backoff", async () => {
		mockApiClient.mockRejectedValue(
			Object.assign(new Error("Too Many Requests"), { status: 429 }),
		);

		const { result } = renderHook(() => useBoothInvoices("booth-1"), {
			wrapper: makeWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(mockApiClient).toHaveBeenCalledTimes(1);
	});

	it("offers another page when has_more and a cursor are both present", async () => {
		mockApiClient.mockResolvedValue({
			...EMPTY,
			invoices: [INVOICE],
			has_more: true,
			next_cursor: "in_1",
		});

		const { result } = renderHook(() => useBoothInvoices("booth-1"), {
			wrapper: makeWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.hasNextPage).toBe(true);
	});

	it("stops paging on an empty page even if has_more stays true", async () => {
		// Otherwise the same cursor is requested forever — the classic
		// infinite-scroll loop.
		mockApiClient.mockResolvedValue({
			...EMPTY,
			invoices: [],
			has_more: true,
			next_cursor: "in_stuck",
		});

		const { result } = renderHook(() => useBoothInvoices("booth-1"), {
			wrapper: makeWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.hasNextPage).toBe(false);
	});

	it("does not retry a 400 — a bad cursor cannot succeed on a repeat", async () => {
		mockApiClient.mockRejectedValue(
			Object.assign(new Error("invalid_request"), { status: 400 }),
		);

		const { result } = renderHook(() => useBoothInvoices("booth-1"), {
			wrapper: makeWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(mockApiClient).toHaveBeenCalledTimes(1);
	});

	it("retries a 503 once — Stripe being unreachable is transient", async () => {
		mockApiClient.mockRejectedValue(
			Object.assign(new Error("stripe_unavailable"), { status: 503 }),
		);

		const { result } = renderHook(() => useBoothInvoices("booth-1"), {
			wrapper: makeWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(mockApiClient).toHaveBeenCalledTimes(2);
	});
});
