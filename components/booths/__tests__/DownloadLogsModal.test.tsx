/**
 * DownloadLogsModal Tests
 *
 * Tests for the Download Logs modal component.
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DownloadLogsModal } from "../DownloadLogsModal";
import { downloadBoothLogs } from "@/api/booths/services";

jest.mock("@/api/booths/services", () => ({
	downloadBoothLogs: jest.fn(),
}));

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.spyOn(Alert, "alert");

const mockDownloadBoothLogs = downloadBoothLogs as jest.MockedFunction<
	typeof downloadBoothLogs
>;

function renderWithProviders(ui: React.ReactElement) {
	const qc = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={qc}>{ui}</QueryClientProvider>,
	);
}

describe("DownloadLogsModal", () => {
	beforeEach(() => jest.clearAllMocks());

	it("renders modal with title and log type options when visible", () => {
		const { getAllByText, getByText } = renderWithProviders(
			<DownloadLogsModal
				visible
				boothId="booth-123"
				boothName="Test Booth"
				onClose={jest.fn()}
			/>,
		);

		// "Download Logs" appears as both title and button text
		expect(getAllByText("Download Logs").length).toBeGreaterThanOrEqual(1);
		expect(getByText("Application")).toBeTruthy();
		expect(getByText("Errors")).toBeTruthy();
		expect(getByText("Hardware")).toBeTruthy();
	});

	it("has application and errors selected by default", () => {
		const { getByTestId } = renderWithProviders(
			<DownloadLogsModal
				visible
				boothId="booth-123"
				boothName="Test Booth"
				onClose={jest.fn()}
			/>,
		);

		expect(getByTestId("chip-application")).toBeTruthy();
		expect(getByTestId("chip-errors")).toBeTruthy();
	});

	it("toggles log type selection on chip press and includes it in submit", async () => {
		mockDownloadBoothLogs.mockResolvedValue({
			download_url: "https://s3.example.com/logs.zip",
			file_size: 1024,
			booth_id: "booth-123",
			message: "Log files ready",
		});

		const { getByTestId } = renderWithProviders(
			<DownloadLogsModal
				visible
				boothId="booth-123"
				boothName="Test Booth"
				onClose={jest.fn()}
			/>,
		);

		fireEvent.press(getByTestId("chip-hardware"));
		fireEvent.press(getByTestId("submit-button"));

		await waitFor(() => {
			expect(mockDownloadBoothLogs).toHaveBeenCalledWith("booth-123", {
				log_types: ["application", "errors", "hardware"],
				hours: 24,
			});
		});
	});

	it("calls downloadBoothLogs on submit and shows success alert", async () => {
		mockDownloadBoothLogs.mockResolvedValue({
			download_url: "https://s3.example.com/logs.zip",
			file_size: 245760,
			booth_id: "booth-123",
			message: "Log files ready",
		});

		const onClose = jest.fn();
		const { getByTestId } = renderWithProviders(
			<DownloadLogsModal
				visible
				boothId="booth-123"
				boothName="Test Booth"
				onClose={onClose}
			/>,
		);

		fireEvent.press(getByTestId("submit-button"));

		await waitFor(() => {
			expect(mockDownloadBoothLogs).toHaveBeenCalledWith("booth-123", {
				log_types: ["application", "errors"],
				hours: 24,
			});
		});

		await waitFor(() => {
			expect(Alert.alert).toHaveBeenCalledWith(
				"Logs Ready",
				expect.stringContaining("240"),
				expect.any(Array),
			);
		});
	});

	it("shows error alert on failure", async () => {
		mockDownloadBoothLogs.mockRejectedValue(new Error("Booth is offline"));

		const { getByTestId } = renderWithProviders(
			<DownloadLogsModal
				visible
				boothId="booth-123"
				boothName="Test Booth"
				onClose={jest.fn()}
			/>,
		);

		fireEvent.press(getByTestId("submit-button"));

		await waitFor(() => {
			expect(Alert.alert).toHaveBeenCalledWith(
				"Download Failed",
				"Booth is offline",
				expect.any(Array),
			);
		});
	});

	it("calls onClose when backdrop is pressed", () => {
		const onClose = jest.fn();
		const { getByTestId } = renderWithProviders(
			<DownloadLogsModal
				visible
				boothId="booth-123"
				boothName="Test Booth"
				onClose={onClose}
			/>,
		);

		fireEvent.press(getByTestId("backdrop"));
		expect(onClose).toHaveBeenCalled();
	});

	it("disables submit when no log types are selected", () => {
		const { getByTestId } = renderWithProviders(
			<DownloadLogsModal
				visible
				boothId="booth-123"
				boothName="Test Booth"
				onClose={jest.fn()}
			/>,
		);

		// Deselect both defaults
		fireEvent.press(getByTestId("chip-application"));
		fireEvent.press(getByTestId("chip-errors"));

		const submitButton = getByTestId("submit-button");
		expect(
			submitButton.props.accessibilityState?.disabled ??
				submitButton.props.disabled,
		).toBe(true);
	});
});
