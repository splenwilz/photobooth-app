/**
 * Stranded Paid Sessions Services Tests
 *
 * Tests for getBoothTransactions and getBoothCriticalEvents service functions.
 * @see docs ../../docs/STRANDED_SESSIONS_API.md (or referenced API spec)
 */
import {
	getBoothCriticalEvents,
	getBoothTransactions,
	refundBoothTransaction,
} from "../services";
import { apiClient } from "../../client";

jest.mock("../../client", () => ({
	apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe("getBoothTransactions", () => {
	beforeEach(() => jest.clearAllMocks());

	it("calls GET /api/v1/booths/{booth_id}/transactions with default pagination", async () => {
		const mockResponse = {
			booth_id: "booth-123",
			booth_name: "Downtown Booth",
			transactions: [],
			count: 0,
			limit: 50,
			offset: 0,
		};
		mockApiClient.mockResolvedValue(mockResponse);

		const result = await getBoothTransactions("booth-123");

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-123/transactions?limit=50&offset=0",
			expect.objectContaining({ method: "GET" }),
		);
		expect(result).toEqual(mockResponse);
	});

	it("respects custom limit and offset", async () => {
		mockApiClient.mockResolvedValue({
			booth_id: "booth-123",
			booth_name: "Downtown",
			transactions: [],
			count: 0,
			limit: 200,
			offset: 100,
		});

		await getBoothTransactions("booth-123", { limit: 200, offset: 100 });

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-123/transactions?limit=200&offset=100",
			expect.objectContaining({ method: "GET" }),
		);
	});

	it("returns transactions with stranded fields populated", async () => {
		const mockResponse = {
			booth_id: "booth-123",
			booth_name: "Downtown",
			transactions: [
				{
					id: "cloud-uuid",
					local_id: 842,
					transaction_code: "TXN-20260421143022-a1b2c3",
					product_type: "strips",
					template_name: "Classic Black & White",
					quantity: 1,
					base_price: 5.0,
					total_price: 5.0,
					payment_method: "cash",
					payment_status: "completed",
					local_created_at: "2026-04-21T14:30:22Z",
					synced_at: "2026-04-21T14:30:51Z",
					stranded_at: "2026-04-21T14:30:23Z",
					stranded_reason: "payment_completion_handler_exception",
				},
			],
			count: 1,
			limit: 50,
			offset: 0,
		};
		mockApiClient.mockResolvedValue(mockResponse);

		const result = await getBoothTransactions("booth-123");

		expect(result.transactions[0].stranded_at).toBe("2026-04-21T14:30:23Z");
		expect(result.transactions[0].stranded_reason).toBe(
			"payment_completion_handler_exception",
		);
	});

	it("throws when boothId is empty", async () => {
		await expect(getBoothTransactions("")).rejects.toThrow(
			"Booth ID is required",
		);
	});

	it("propagates API errors", async () => {
		mockApiClient.mockRejectedValue(new Error("Booth not found"));

		await expect(getBoothTransactions("booth-123")).rejects.toThrow(
			"Booth not found",
		);
	});
});

describe("getBoothCriticalEvents", () => {
	beforeEach(() => jest.clearAllMocks());

	it("calls GET /api/v1/booths/{booth_id}/critical-events with default pagination", async () => {
		const mockResponse = {
			booth_id: "booth-123",
			booth_name: "Downtown Booth",
			events: [],
			count: 0,
			limit: 50,
			offset: 0,
		};
		mockApiClient.mockResolvedValue(mockResponse);

		const result = await getBoothCriticalEvents("booth-123");

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-123/critical-events?limit=50&offset=0",
			expect.objectContaining({ method: "GET" }),
		);
		expect(result).toEqual(mockResponse);
	});

	it("respects custom limit and offset", async () => {
		mockApiClient.mockResolvedValue({
			booth_id: "booth-123",
			booth_name: "Downtown",
			events: [],
			count: 0,
			limit: 100,
			offset: 50,
		});

		await getBoothCriticalEvents("booth-123", { limit: 100, offset: 50 });

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-123/critical-events?limit=100&offset=50",
			expect.objectContaining({ method: "GET" }),
		);
	});

	it("returns critical events with inline refund enrichment", async () => {
		const mockResponse = {
			booth_id: "booth-123",
			booth_name: "Downtown",
			events: [
				{
					id: 12345,
					tag: "STRANDED_PAID_SESSION" as const,
					details:
						"PaymentScreen_PaymentCompleted threw: Object reference not set to an instance of an object",
					transaction_code: "TXN-20260421143022-a1b2c3",
					occurred_at: "2026-04-21T14:30:22Z",
					received_at: "2026-04-21T14:30:51Z",
					transaction_total_price: 5.0,
					refund: {
						refunded_at: "2026-04-21T15:04:12Z",
						refunded_by_user_id: "user_01KK",
						refund_amount: 5.0,
						refund_method: "cash_till" as const,
					},
				},
			],
			count: 1,
			limit: 50,
			offset: 0,
		};
		mockApiClient.mockResolvedValue(mockResponse);

		const result = await getBoothCriticalEvents("booth-123");

		expect(result.events[0].tag).toBe("STRANDED_PAID_SESSION");
		expect(result.events[0].transaction_total_price).toBe(5.0);
		expect(result.events[0].refund?.refund_method).toBe("cash_till");
	});

	it("throws when boothId is empty", async () => {
		await expect(getBoothCriticalEvents("")).rejects.toThrow(
			"Booth ID is required",
		);
	});

	it("propagates API errors", async () => {
		mockApiClient.mockRejectedValue(new Error("Booth not found"));

		await expect(getBoothCriticalEvents("booth-123")).rejects.toThrow(
			"Booth not found",
		);
	});
});

describe("refundBoothTransaction", () => {
	beforeEach(() => jest.clearAllMocks());

	const mockResponse = {
		transaction_code: "TXN-ABC",
		refunded_at: "2026-04-21T15:04:12Z",
		refunded_by_user_id: "user_01KK",
		refund_amount: 5.0,
		refund_method: "cash_till",
		refund_note: "Customer receipt #1234",
	};

	it("calls POST /api/v1/booths/{booth_id}/transactions/{code}/refund with body", async () => {
		mockApiClient.mockResolvedValue(mockResponse);

		const result = await refundBoothTransaction("booth-123", "TXN-ABC", {
			amount: 5.0,
			method: "cash_till",
			note: "Customer receipt #1234",
		});

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-123/transactions/TXN-ABC/refund",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					amount: 5.0,
					method: "cash_till",
					note: "Customer receipt #1234",
				}),
			}),
		);
		expect(result).toEqual(mockResponse);
	});

	it("omits note when not provided", async () => {
		mockApiClient.mockResolvedValue(mockResponse);

		await refundBoothTransaction("booth-123", "TXN-ABC", {
			amount: 5.0,
			method: "card_void",
		});

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-123/transactions/TXN-ABC/refund",
			expect.objectContaining({
				body: JSON.stringify({ amount: 5.0, method: "card_void" }),
			}),
		);
	});

	it("omits note when caller passes an empty string", async () => {
		// Defense-in-depth: backend may reject empty string with a min-length
		// validation; only send the field when there's actual content.
		mockApiClient.mockResolvedValue(mockResponse);

		await refundBoothTransaction("booth-123", "TXN-ABC", {
			amount: 5.0,
			method: "cash_till",
			note: "",
		});

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-123/transactions/TXN-ABC/refund",
			expect.objectContaining({
				body: JSON.stringify({ amount: 5.0, method: "cash_till" }),
			}),
		);
	});

	it("omits whitespace-only note and trims surrounding whitespace", async () => {
		mockApiClient.mockResolvedValue(mockResponse);

		await refundBoothTransaction("booth-123", "TXN-ABC", {
			amount: 5.0,
			method: "cash_till",
			note: "   ",
		});

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-123/transactions/TXN-ABC/refund",
			expect.objectContaining({
				body: JSON.stringify({ amount: 5.0, method: "cash_till" }),
			}),
		);

		mockApiClient.mockClear();

		await refundBoothTransaction("booth-123", "TXN-ABC", {
			amount: 5.0,
			method: "cash_till",
			note: "  receipt #9  ",
		});

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-123/transactions/TXN-ABC/refund",
			expect.objectContaining({
				body: JSON.stringify({
					amount: 5.0,
					method: "cash_till",
					note: "receipt #9",
				}),
			}),
		);
	});

	it("url-encodes the transaction code for path safety", async () => {
		mockApiClient.mockResolvedValue(mockResponse);

		await refundBoothTransaction("booth-123", "TXN-20260421/a1", {
			amount: 5.0,
			method: "cash_till",
		});

		expect(mockApiClient).toHaveBeenCalledWith(
			"/api/v1/booths/booth-123/transactions/TXN-20260421%2Fa1/refund",
			expect.anything(),
		);
	});

	it("throws when boothId is empty", async () => {
		await expect(
			refundBoothTransaction("", "TXN-ABC", {
				amount: 5,
				method: "cash_till",
			}),
		).rejects.toThrow("Booth ID is required");
	});

	it("throws when transactionCode is empty", async () => {
		await expect(
			refundBoothTransaction("booth-123", "", {
				amount: 5,
				method: "cash_till",
			}),
		).rejects.toThrow("Transaction code is required");
	});

	it("propagates API errors (e.g. 409 already refunded)", async () => {
		mockApiClient.mockRejectedValue(new Error("Transaction already refunded"));

		await expect(
			refundBoothTransaction("booth-123", "TXN-ABC", {
				amount: 5,
				method: "cash_till",
			}),
		).rejects.toThrow("Transaction already refunded");
	});
});
