/**
 * Transfer services tests — URL shape, HTTP method, and body per endpoint.
 * The accept token must only ever travel in the POST body, never the URL.
 */
import { apiClient } from "../../client";
import {
	acceptTransfer,
	cancelBoothTransfer,
	createBoothTransfer,
	declineTransfer,
	getLatestBoothTransfer,
	getTransfer,
	listMyTransfers,
	resendBoothTransfer,
} from "../services";

jest.mock("../../client", () => ({
	apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe("transfer services", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockApiClient.mockResolvedValue({ id: "t1", status: "pending" });
	});

	function lastCall(): { url: string; options?: RequestInit } {
		const [url, options] = mockApiClient.mock.calls.at(-1)!;
		return { url: url as string, options: options as RequestInit | undefined };
	}

	it("POSTs the offer to the per-booth transfer URL with the buyer email", async () => {
		await createBoothTransfer("b1", { buyer_email: "buyer@example.com" });
		const { url, options } = lastCall();
		expect(url).toBe("/api/v1/booths/b1/transfer");
		expect(options?.method).toBe("POST");
		expect(JSON.parse(options?.body as string)).toEqual({
			buyer_email: "buyer@example.com",
		});
	});

	it("GETs the latest booth transfer with an encoded booth id", async () => {
		await getLatestBoothTransfer("b 1");
		expect(lastCall().url).toBe("/api/v1/booths/b%201/transfer");
	});

	it("DELETEs to withdraw the pending offer", async () => {
		await cancelBoothTransfer("b1");
		const { url, options } = lastCall();
		expect(url).toBe("/api/v1/booths/b1/transfer");
		expect(options?.method).toBe("DELETE");
	});

	it("POSTs resend without a body", async () => {
		await resendBoothTransfer("b1");
		const { url, options } = lastCall();
		expect(url).toBe("/api/v1/booths/b1/transfer/resend");
		expect(options?.method).toBe("POST");
		expect(options?.body).toBeUndefined();
	});

	it("GETs the buyer's transfer list", async () => {
		mockApiClient.mockResolvedValue([]);
		await listMyTransfers();
		expect(lastCall().url).toBe("/api/v1/transfers");
	});

	it("GETs a transfer detail with an encoded id", async () => {
		await getTransfer("t 1");
		expect(lastCall().url).toBe("/api/v1/transfers/t%201");
	});

	it("POSTs accept with the token in the body only", async () => {
		await acceptTransfer("t1", { token: "secret-token" });
		const { url, options } = lastCall();
		expect(url).toBe("/api/v1/transfers/t1/accept");
		expect(url).not.toContain("secret-token");
		expect(JSON.parse(options?.body as string)).toEqual({
			token: "secret-token",
		});
	});

	it("POSTs decline without a body", async () => {
		await declineTransfer("t1");
		const { url, options } = lastCall();
		expect(url).toBe("/api/v1/transfers/t1/decline");
		expect(options?.method).toBe("POST");
		expect(options?.body).toBeUndefined();
	});

	it("propagates API errors", async () => {
		mockApiClient.mockRejectedValue(new Error("boom"));
		await expect(listMyTransfers()).rejects.toThrow("boom");
	});
});
