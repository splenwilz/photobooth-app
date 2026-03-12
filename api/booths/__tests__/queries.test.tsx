/**
 * Booth Queries Tests
 *
 * Tests for useDownloadBoothLogs React Query mutation hook.
 */
import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDownloadBoothLogs } from "../queries";
import { downloadBoothLogs } from "../services";

jest.mock("../services", () => ({
	downloadBoothLogs: jest.fn(),
}));

const mockDownloadBoothLogs = downloadBoothLogs as jest.MockedFunction<
	typeof downloadBoothLogs
>;

function createWrapper() {
	const qc = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
}

describe("useDownloadBoothLogs", () => {
	beforeEach(() => jest.clearAllMocks());

	it("calls downloadBoothLogs with boothId and log options", async () => {
		const mockResponse = {
			download_url: "https://s3.amazonaws.com/test",
			file_size: 245760,
			booth_id: "booth-123",
			message: "Log files ready",
		};
		mockDownloadBoothLogs.mockResolvedValue(mockResponse);

		const { result } = renderHook(() => useDownloadBoothLogs(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			boothId: "booth-123",
			log_types: ["application", "errors"],
			hours: 24,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockDownloadBoothLogs).toHaveBeenCalledWith("booth-123", {
			log_types: ["application", "errors"],
			hours: 24,
		});
		expect(result.current.data).toEqual(mockResponse);
	});

	it("exposes error state on failure", async () => {
		mockDownloadBoothLogs.mockRejectedValue(new Error("Booth is offline"));

		const { result } = renderHook(() => useDownloadBoothLogs(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({ boothId: "booth-123" });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Booth is offline");
	});
});
