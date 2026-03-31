/**
 * BoothPickerModal Tests
 *
 * Tests for the global booth picker modal component.
 * Follows TDD - these tests were written before the implementation.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BoothPickerModal } from "../booth-picker-modal";

// Mock booth overview hook
const mockBoothOverviewData = {
	summary: {
		total_booths: 3,
		online_count: 2,
		offline_count: 1,
		total_credits: 100,
		total_transactions_today: 50,
		total_revenue_today: 250,
		booths_with_credits: 2,
		booths_active_today: 2,
	},
	booths: [
		{
			booth_id: "booth-1",
			booth_name: "Downtown Booth",
			booth_address: "123 Main St",
			booth_status: "online" as const,
			has_error: false,
			error_details: null,
			credits: { balance: 50, has_credits: true },
			operation: { mode: "coin", mode_display: "Coin" },
			transactions: {
				today_count: 20,
				last_transaction_at: null,
				is_active_today: true,
			},
			revenue: { today: 100 },
			last_updated: "2026-03-31T10:00:00Z",
			subscription: null,
		},
		{
			booth_id: "booth-2",
			booth_name: "Mall Booth",
			booth_address: "456 Oak Ave",
			booth_status: "offline" as const,
			has_error: false,
			error_details: null,
			credits: { balance: 30, has_credits: true },
			operation: { mode: "freeplay", mode_display: "Freeplay" },
			transactions: {
				today_count: 10,
				last_transaction_at: null,
				is_active_today: false,
			},
			revenue: { today: 50 },
			last_updated: "2026-03-31T09:00:00Z",
			subscription: null,
		},
		{
			booth_id: "booth-3",
			booth_name: "Airport Booth",
			booth_address: "789 Terminal Blvd",
			booth_status: "online" as const,
			has_error: false,
			error_details: null,
			credits: { balance: 20, has_credits: true },
			operation: { mode: "coin", mode_display: "Coin" },
			transactions: {
				today_count: 20,
				last_transaction_at: null,
				is_active_today: true,
			},
			revenue: { today: 100 },
			last_updated: "2026-03-31T10:00:00Z",
			subscription: null,
		},
	],
};

jest.mock("@/api/booths/queries", () => ({
	useBoothOverview: () => ({
		data: mockBoothOverviewData,
		isLoading: false,
		error: null,
	}),
}));

// Mock booth store
const mockSetSelectedBoothId = jest.fn();
let mockSelectedBoothId = "all";

jest.mock("@/stores/booth-store", () => ({
	ALL_BOOTHS_ID: "all",
	useBoothStore: () => ({
		selectedBoothId: mockSelectedBoothId,
		setSelectedBoothId: mockSetSelectedBoothId,
	}),
}));

// Mock safe area context
jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

function renderWithProviders(ui: React.ReactElement) {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={qc}>{ui}</QueryClientProvider>,
	);
}

describe("BoothPickerModal", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSelectedBoothId = "all";
	});

	it("renders 'All Booths' option and booth list when visible", () => {
		const { getByText } = renderWithProviders(
			<BoothPickerModal visible onClose={jest.fn()} />,
		);

		expect(getByText("All Booths")).toBeTruthy();
		expect(getByText("Downtown Booth")).toBeTruthy();
		expect(getByText("Mall Booth")).toBeTruthy();
		expect(getByText("Airport Booth")).toBeTruthy();
	});

	it("shows online/offline counts for 'All Booths' row", () => {
		const { getByText } = renderWithProviders(
			<BoothPickerModal visible onClose={jest.fn()} />,
		);

		expect(getByText("2 online · 1 offline")).toBeTruthy();
	});

	it("shows booth addresses", () => {
		const { getByText } = renderWithProviders(
			<BoothPickerModal visible onClose={jest.fn()} />,
		);

		expect(getByText("123 Main St")).toBeTruthy();
		expect(getByText("456 Oak Ave")).toBeTruthy();
	});

	it("shows checkmark on currently selected booth (All Booths)", () => {
		mockSelectedBoothId = "all";
		const { getByTestId } = renderWithProviders(
			<BoothPickerModal visible onClose={jest.fn()} />,
		);

		expect(getByTestId("checkmark-all")).toBeTruthy();
	});

	it("shows checkmark on a specific selected booth", () => {
		mockSelectedBoothId = "booth-2";
		const { getByTestId, queryByTestId } = renderWithProviders(
			<BoothPickerModal visible onClose={jest.fn()} />,
		);

		expect(getByTestId("checkmark-booth-2")).toBeTruthy();
		expect(queryByTestId("checkmark-all")).toBeNull();
		expect(queryByTestId("checkmark-booth-1")).toBeNull();
	});

	it("calls setSelectedBoothId with 'all' when All Booths is tapped", () => {
		mockSelectedBoothId = "booth-1";
		const onClose = jest.fn();
		const { getByTestId } = renderWithProviders(
			<BoothPickerModal visible onClose={onClose} />,
		);

		fireEvent.press(getByTestId("booth-option-all"));
		expect(mockSetSelectedBoothId).toHaveBeenCalledWith("all");
		expect(onClose).toHaveBeenCalled();
	});

	it("calls setSelectedBoothId with booth ID when a booth is tapped", () => {
		const onClose = jest.fn();
		const { getByTestId } = renderWithProviders(
			<BoothPickerModal visible onClose={onClose} />,
		);

		fireEvent.press(getByTestId("booth-option-booth-1"));
		expect(mockSetSelectedBoothId).toHaveBeenCalledWith("booth-1");
		expect(onClose).toHaveBeenCalled();
	});

	it("calls onClose when close button is pressed", () => {
		const onClose = jest.fn();
		const { getByTestId } = renderWithProviders(
			<BoothPickerModal visible onClose={onClose} />,
		);

		fireEvent.press(getByTestId("close-button"));
		expect(onClose).toHaveBeenCalled();
	});

	it("filters booths by search query", () => {
		const { getByTestId, getByText, queryByText } = renderWithProviders(
			<BoothPickerModal visible onClose={jest.fn()} />,
		);

		fireEvent.changeText(getByTestId("search-input"), "downtown");
		expect(getByText("Downtown Booth")).toBeTruthy();
		expect(queryByText("Mall Booth")).toBeNull();
		expect(queryByText("Airport Booth")).toBeNull();
	});

	it("filters booths by address in search", () => {
		const { getByTestId, getByText, queryByText } = renderWithProviders(
			<BoothPickerModal visible onClose={jest.fn()} />,
		);

		fireEvent.changeText(getByTestId("search-input"), "Oak");
		expect(getByText("Mall Booth")).toBeTruthy();
		expect(queryByText("Downtown Booth")).toBeNull();
	});

	it("renders header with 'Switch Booth' title", () => {
		const { getByText } = renderWithProviders(
			<BoothPickerModal visible onClose={jest.fn()} />,
		);

		expect(getByText("Switch Booth")).toBeTruthy();
	});
});
