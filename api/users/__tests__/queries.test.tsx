/**
 * User Queries Tests
 *
 * Tests for useUpdateBusinessName React Query mutation hook
 * with use_display_name_on_booths support.
 */
import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateBusinessName } from "../queries";
import { updateBusinessName } from "../services";

jest.mock("../services", () => ({
	getUserProfile: jest.fn(),
	updateBusinessName: jest.fn(),
	uploadAccountLogo: jest.fn(),
	deleteAccountLogo: jest.fn(),
}));

const mockUpdateBusinessName = updateBusinessName as jest.MockedFunction<
	typeof updateBusinessName
>;

function createWrapper() {
	const qc = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
}

describe("useUpdateBusinessName", () => {
	beforeEach(() => jest.clearAllMocks());

	it("calls updateBusinessName with business_name only", async () => {
		const mockResponse = {
			id: "user_01ABC",
			first_name: "Michael",
			last_name: "Johnson",
			email: "michael@snapshot.com",
			business_name: "Snapshot Studios",
			logo_url: null,
			use_display_name_on_booths: false,
			created_at: "2024-08-15T10:30:00Z",
			updated_at: "2024-08-20T14:00:00Z",
		};
		mockUpdateBusinessName.mockResolvedValue(mockResponse);

		const { result } = renderHook(() => useUpdateBusinessName(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			userId: "user_01ABC",
			business_name: "Snapshot Studios",
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockUpdateBusinessName).toHaveBeenCalledWith("user_01ABC", {
			business_name: "Snapshot Studios",
		});
		expect(result.current.data).toEqual(mockResponse);
	});

	it("calls updateBusinessName with use_display_name_on_booths", async () => {
		const mockResponse = {
			id: "user_01ABC",
			first_name: "Michael",
			last_name: "Johnson",
			email: "michael@snapshot.com",
			business_name: "Snapshot Studios",
			logo_url: null,
			use_display_name_on_booths: true,
			created_at: "2024-08-15T10:30:00Z",
			updated_at: "2024-08-20T14:00:00Z",
		};
		mockUpdateBusinessName.mockResolvedValue(mockResponse);

		const { result } = renderHook(() => useUpdateBusinessName(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			userId: "user_01ABC",
			use_display_name_on_booths: true,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockUpdateBusinessName).toHaveBeenCalledWith("user_01ABC", {
			use_display_name_on_booths: true,
		});
	});

	it("calls updateBusinessName with both fields", async () => {
		const mockResponse = {
			id: "user_01ABC",
			first_name: "Michael",
			last_name: "Johnson",
			email: "michael@snapshot.com",
			business_name: "New Name",
			logo_url: null,
			use_display_name_on_booths: true,
			created_at: "2024-08-15T10:30:00Z",
			updated_at: "2024-08-20T14:00:00Z",
		};
		mockUpdateBusinessName.mockResolvedValue(mockResponse);

		const { result } = renderHook(() => useUpdateBusinessName(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			userId: "user_01ABC",
			business_name: "New Name",
			use_display_name_on_booths: true,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockUpdateBusinessName).toHaveBeenCalledWith("user_01ABC", {
			business_name: "New Name",
			use_display_name_on_booths: true,
		});
	});

	it("exposes error state on failure", async () => {
		mockUpdateBusinessName.mockRejectedValue(new Error("Forbidden"));

		const { result } = renderHook(() => useUpdateBusinessName(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			userId: "user_01ABC",
			business_name: "Test",
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Forbidden");
	});
});
