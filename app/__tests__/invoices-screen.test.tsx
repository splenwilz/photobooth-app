/**
 * Payment history screen — render-state rules.
 *
 * The one that matters: a failed BACKGROUND refetch keeps `data` and sets
 * `error`. Replacing a populated list with an error card in that case hides
 * invoices the user was already reading, along with the pull-to-refresh that
 * would recover them. The same mistake was made once in
 * SubscriptionDetailsModal and fixed there.
 */
import React from "react";
import { render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockUseBoothInvoices = jest.fn();
jest.mock("@/api/payments", () => ({
	...jest.requireActual("@/api/payments"),
	useBoothInvoices: () => mockUseBoothInvoices(),
}));

import InvoicesScreen from "../booths/[boothId]/invoices";

const PAID_INVOICE = {
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

function page(invoices: (typeof PAID_INVOICE)[]) {
	return {
		booth_id: "booth-1",
		invoices,
		has_more: false,
		next_cursor: null,
		server_time: "2026-08-01T12:00:00Z",
	};
}

/** The shape useInfiniteQuery hands the screen. */
function hookState(overrides: Record<string, unknown> = {}) {
	return {
		data: undefined,
		isLoading: false,
		isError: false,
		error: null,
		refetch: jest.fn(),
		fetchNextPage: jest.fn(),
		hasNextPage: false,
		isFetchingNextPage: false,
		...overrides,
	};
}

function renderScreen() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return render(
		<QueryClientProvider client={client}>
			<InvoicesScreen />
		</QueryClientProvider>,
	);
}

beforeEach(() => jest.clearAllMocks());

it("keeps cached invoices on screen when a refetch fails", () => {
	// data present AND error set — the background-refetch failure case.
	mockUseBoothInvoices.mockReturnValue(
		hookState({
			data: { pages: [page([PAID_INVOICE])], pageParams: [undefined] },
			isError: true,
			error: Object.assign(new Error("Network request failed"), {
				status: 503,
			}),
		}),
	);

	const { getByText, queryByText } = renderScreen();

	expect(getByText("$29.00")).toBeTruthy();
	expect(getByText("Paid")).toBeTruthy();
	expect(queryByText("Payment history is unavailable")).toBeNull();
});

it("blocks with an error only when there is nothing to show", () => {
	mockUseBoothInvoices.mockReturnValue(
		hookState({
			isError: true,
			error: Object.assign(new Error("Not Found"), { status: 404 }),
		}),
	);

	const { getByText, queryByText } = renderScreen();

	expect(getByText("Payment history is unavailable")).toBeTruthy();
	// A 404 must never be presented as "no invoices" — it means not ours, or
	// not deployed.
	expect(queryByText("No invoices yet")).toBeNull();
});

it("shows the empty state only for a successful empty response", () => {
	mockUseBoothInvoices.mockReturnValue(
		hookState({ data: { pages: [page([])], pageParams: [undefined] } }),
	);

	const { getByText, queryByText } = renderScreen();

	expect(getByText("No invoices yet")).toBeTruthy();
	expect(queryByText("Payment history is unavailable")).toBeNull();
});
