/**
 * BusinessSettingsModal Tests
 *
 * Tests for display_name, use_display_name_on_booths, and logo management.
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BusinessSettingsModal } from "../BusinessSettingsModal";
import * as boothQueries from "@/api/booths/queries";
import * as userQueries from "@/api/users/queries";

// Mock safe area context
jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock expo-image-picker
const mockLaunchImageLibraryAsync = jest.fn();
jest.mock("expo-image-picker", () => ({
	requestMediaLibraryPermissionsAsync: jest
		.fn()
		.mockResolvedValue({ granted: true }),
	launchImageLibraryAsync: (...args: unknown[]) =>
		mockLaunchImageLibraryAsync(...args),
}));

// Mock client for SecureStore operations
jest.mock("@/api/client", () => ({
	saveUser: jest.fn().mockResolvedValue(undefined),
	getStoredUser: jest.fn().mockResolvedValue({
		id: "user_01ABC",
		email: "test@example.com",
		first_name: "Test",
		last_name: "User",
		business_name: "Old Business",
		logo_url: null,
		use_display_name_on_booths: false,
		object: "user",
		email_verified: true,
		profile_picture_url: "",
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-01T00:00:00Z",
		is_onboarded: true,
	}),
}));

jest.spyOn(Alert, "alert").mockImplementation(() => {});

// Mock mutation helpers
const mockMutateAsyncBusinessName = jest.fn().mockResolvedValue({});
const mockMutateAsyncBoothSettings = jest.fn().mockResolvedValue({});
const mockMutateAsyncUploadAccountLogo = jest.fn().mockResolvedValue({
	logo_url: "https://s3.example.com/new-logo.png",
	s3_key: "logos/user_01ABC/logo.png",
});
const mockMutateAsyncDeleteAccountLogo = jest.fn().mockResolvedValue({
	message: "Account logo removed.",
});
const mockMutateAsyncUploadBoothLogo = jest.fn().mockResolvedValue({
	logo_url: "https://s3.example.com/booth-logo.png",
	s3_key: "logos/user_01ABC/booths/booth-123/logo.png",
});
const mockMutateAsyncDeleteBoothLogo = jest.fn().mockResolvedValue({
	message: "Custom logo removed.",
});

function setupDefaultMocks() {
	jest.spyOn(userQueries, "useUserProfile").mockReturnValue({
		data: {
			id: "user_01ABC",
			first_name: "Test",
			last_name: "User",
			email: "test@example.com",
			business_name: "Test Business",
			logo_url: null,
			use_display_name_on_booths: false,
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-01T00:00:00Z",
		},
		isLoading: false,
		isError: false,
		error: null,
	} as any);

	jest.spyOn(boothQueries, "useBoothBusinessSettings").mockReturnValue({
		data: {
			business_name: "Test Business",
			display_name: "Booth Display Name",
			logo_url: null,
			custom_logo_url: null,
			use_custom_logo: false,
			show_logo_on_prints: true,
			address: "123 Main St",
			show_business_name: true,
			show_logo: true,
			welcome_subtitle: null,
			show_welcome_subtitle: true,
			cloud_sync_enabled: true,
			use_display_name_on_booths: false,
		},
		isFetching: false,
		isLoading: false,
		isError: false,
		error: null,
	} as any);

	jest.spyOn(userQueries, "useUpdateBusinessName").mockReturnValue({
		mutateAsync: mockMutateAsyncBusinessName,
		isPending: false,
		isSuccess: false,
		isError: false,
		error: null,
	} as any);

	jest.spyOn(boothQueries, "useUpdateBoothSettings").mockReturnValue({
		mutateAsync: mockMutateAsyncBoothSettings,
		isPending: false,
		isSuccess: false,
		isError: false,
		error: null,
	} as any);

	jest.spyOn(userQueries, "useUploadAccountLogo").mockReturnValue({
		mutateAsync: mockMutateAsyncUploadAccountLogo,
		isPending: false,
	} as any);

	jest.spyOn(userQueries, "useDeleteAccountLogo").mockReturnValue({
		mutateAsync: mockMutateAsyncDeleteAccountLogo,
		isPending: false,
	} as any);

	jest.spyOn(boothQueries, "useUploadBoothLogo").mockReturnValue({
		mutateAsync: mockMutateAsyncUploadBoothLogo,
		isPending: false,
	} as any);

	jest.spyOn(boothQueries, "useDeleteBoothLogo").mockReturnValue({
		mutateAsync: mockMutateAsyncDeleteBoothLogo,
		isPending: false,
	} as any);
}

function renderWithProviders(ui: React.ReactElement) {
	const qc = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={qc}>{ui}</QueryClientProvider>,
	);
}

const defaultProps = {
	visible: true,
	boothId: "booth-123",
	userId: "user_01ABC",
	boothName: "My Booth",
	onClose: jest.fn(),
};

describe("BusinessSettingsModal", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		setupDefaultMocks();
	});

	// ── Display Name & Toggle Tests ─────────────────────────────────────

	it("renders display name field when boothId is present", () => {
		const { getByText, getByDisplayValue } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		expect(getByText("Display Name")).toBeTruthy();
		expect(getByDisplayValue("Booth Display Name")).toBeTruthy();
	});

	it("does not render display name field when boothId is null", () => {
		const { queryByText } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} boothId={null} />,
		);

		const displayNameLabels = queryByText("Display Name");
		expect(displayNameLabels).toBeNull();
	});

	it("renders use_display_name_on_booths toggle", () => {
		const { getByText } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		expect(getByText("Use Business Name on All Booths")).toBeTruthy();
	});

	it("display name field has maxLength 255", () => {
		const { getByDisplayValue } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		const displayNameInput = getByDisplayValue("Booth Display Name");
		expect(displayNameInput.props.maxLength).toBe(255);
	});

	it("shows save button when display name changes", () => {
		const { getByDisplayValue, getByText } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		const input = getByDisplayValue("Booth Display Name");
		fireEvent.changeText(input, "New Display Name");

		expect(getByText("Save Changes")).toBeTruthy();
	});

	it("saves use_display_name_on_booths immediately on toggle", async () => {
		const { getByTestId } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		const toggle = getByTestId("use-display-name-toggle");
		fireEvent(toggle, "valueChange", true);

		await waitFor(() => {
			expect(mockMutateAsyncBusinessName).toHaveBeenCalledWith({
				userId: "user_01ABC",
				use_display_name_on_booths: true,
			});
		});
	});

	it("sends display_name via booth mutation on save", async () => {
		const onClose = jest.fn();
		const { getByDisplayValue, getByText } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} onClose={onClose} />,
		);

		const input = getByDisplayValue("Booth Display Name");
		fireEvent.changeText(input, "Updated Display Name");

		fireEvent.press(getByText("Save Changes"));

		await waitFor(() => {
			expect(mockMutateAsyncBoothSettings).toHaveBeenCalledWith(
				expect.objectContaining({
					boothId: "booth-123",
					display_name: "Updated Display Name",
				}),
			);
		});
	});

	it("disables display name field when override toggle is on", () => {
		jest.spyOn(userQueries, "useUserProfile").mockReturnValue({
			data: {
				id: "user_01ABC",
				first_name: "Test",
				last_name: "User",
				email: "test@example.com",
				business_name: "Test Business",
				logo_url: null,
				use_display_name_on_booths: true,
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z",
			},
			isLoading: false,
			isError: false,
			error: null,
		} as any);

		jest.spyOn(boothQueries, "useBoothBusinessSettings").mockReturnValue({
			data: {
				business_name: "Test Business",
				display_name: "Booth Display Name",
				logo_url: null,
				custom_logo_url: null,
				use_custom_logo: false,
				show_logo_on_prints: true,
				address: "123 Main St",
				show_business_name: true,
				show_logo: true,
				welcome_subtitle: null,
				show_welcome_subtitle: true,
				cloud_sync_enabled: true,
				use_display_name_on_booths: true,
			},
			isFetching: false,
			isLoading: false,
			isError: false,
			error: null,
		} as any);

		const { getByDisplayValue } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		const displayNameInput = getByDisplayValue("Booth Display Name");
		expect(displayNameInput.props.editable).toBe(false);
	});

	it("shows contextual hint when override is on", () => {
		jest.spyOn(userQueries, "useUserProfile").mockReturnValue({
			data: {
				id: "user_01ABC",
				first_name: "Test",
				last_name: "User",
				email: "test@example.com",
				business_name: "Test Business",
				logo_url: null,
				use_display_name_on_booths: true,
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z",
			},
			isLoading: false,
			isError: false,
			error: null,
		} as any);

		jest.spyOn(boothQueries, "useBoothBusinessSettings").mockReturnValue({
			data: {
				business_name: "Test Business",
				display_name: "Booth Display Name",
				logo_url: null,
				custom_logo_url: null,
				use_custom_logo: false,
				show_logo_on_prints: true,
				address: "123 Main St",
				show_business_name: true,
				show_logo: true,
				welcome_subtitle: null,
				show_welcome_subtitle: true,
				cloud_sync_enabled: true,
				use_display_name_on_booths: true,
			},
			isFetching: false,
			isLoading: false,
			isError: false,
			error: null,
		} as any);

		const { getByText } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		expect(
			getByText("Overridden by business name (toggle above)"),
		).toBeTruthy();
	});

	// ── Logo Management Tests ───────────────────────────────────────────

	it("renders account logo section with upload button", () => {
		const { getByText, getByTestId } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		expect(getByText("Account Logo")).toBeTruthy();
		expect(getByTestId("upload-account-logo-button")).toBeTruthy();
	});

	it("shows account logo preview when logo_url exists", () => {
		jest.spyOn(userQueries, "useUserProfile").mockReturnValue({
			data: {
				id: "user_01ABC",
				first_name: "Test",
				last_name: "User",
				email: "test@example.com",
				business_name: "Test Business",
				logo_url: "https://s3.example.com/account-logo.png",
				use_display_name_on_booths: false,
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z",
			},
			isLoading: false,
			isError: false,
			error: null,
		} as any);

		const { getByTestId } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		const logoPreview = getByTestId("account-logo-preview");
		expect(logoPreview.props.source.uri).toBe(
			"https://s3.example.com/account-logo.png",
		);
	});

	it("shows delete button for account logo when logo exists", () => {
		jest.spyOn(userQueries, "useUserProfile").mockReturnValue({
			data: {
				id: "user_01ABC",
				first_name: "Test",
				last_name: "User",
				email: "test@example.com",
				business_name: "Test Business",
				logo_url: "https://s3.example.com/account-logo.png",
				use_display_name_on_booths: false,
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z",
			},
			isLoading: false,
			isError: false,
			error: null,
		} as any);

		const { getByTestId } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		expect(getByTestId("delete-account-logo-button")).toBeTruthy();
	});

	it("calls uploadAccountLogo mutation when image is picked", async () => {
		mockLaunchImageLibraryAsync.mockResolvedValue({
			canceled: false,
			assets: [
				{
					uri: "file:///tmp/logo.png",
					fileName: "logo.png",
					mimeType: "image/png",
				},
			],
		});

		const { getByTestId } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		fireEvent.press(getByTestId("upload-account-logo-button"));

		await waitFor(() => {
			expect(mockMutateAsyncUploadAccountLogo).toHaveBeenCalledWith({
				userId: "user_01ABC",
				fileUri: "file:///tmp/logo.png",
				mimeType: "image/png",
				filename: "logo.png",
			});
		});
	});

	it("calls deleteAccountLogo mutation when delete is confirmed", async () => {
		jest.spyOn(userQueries, "useUserProfile").mockReturnValue({
			data: {
				id: "user_01ABC",
				first_name: "Test",
				last_name: "User",
				email: "test@example.com",
				business_name: "Test Business",
				logo_url: "https://s3.example.com/account-logo.png",
				use_display_name_on_booths: false,
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z",
			},
			isLoading: false,
			isError: false,
			error: null,
		} as any);

		const { getByTestId } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		fireEvent.press(getByTestId("delete-account-logo-button"));

		// Alert.alert is called with confirm/cancel buttons — simulate confirm
		const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
		const confirmButton = alertCall[2].find(
			(btn: { text: string }) => btn.text === "Delete",
		);
		confirmButton.onPress();

		await waitFor(() => {
			expect(mockMutateAsyncDeleteAccountLogo).toHaveBeenCalledWith({
				userId: "user_01ABC",
			});
		});
	});

	// ── Booth Logo Tests ────────────────────────────────────────────────

	it("renders booth logo section when boothId is present", () => {
		const { getByText, getByTestId } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		expect(getByText("Booth Logo")).toBeTruthy();
		expect(getByTestId("upload-booth-logo-button")).toBeTruthy();
	});

	it("does not render booth logo section when boothId is null", () => {
		const { queryByText } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} boothId={null} />,
		);

		expect(queryByText("Booth Logo")).toBeNull();
	});

	it("shows booth logo preview when custom_logo_url exists", () => {
		jest.spyOn(boothQueries, "useBoothBusinessSettings").mockReturnValue({
			data: {
				business_name: "Test Business",
				display_name: "Booth Display Name",
				logo_url: "https://s3.example.com/effective-logo.png",
				custom_logo_url: "https://s3.example.com/custom-booth-logo.png",
				use_custom_logo: true,
				show_logo_on_prints: true,
				address: "123 Main St",
				show_business_name: true,
				show_logo: true,
				welcome_subtitle: null,
				show_welcome_subtitle: true,
				cloud_sync_enabled: true,
				use_display_name_on_booths: false,
			},
			isFetching: false,
			isLoading: false,
			isError: false,
			error: null,
		} as any);

		const { getByTestId } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		const logoPreview = getByTestId("booth-logo-preview");
		expect(logoPreview.props.source.uri).toBe(
			"https://s3.example.com/custom-booth-logo.png",
		);
	});

	it("calls uploadBoothLogo mutation when booth image is picked", async () => {
		mockLaunchImageLibraryAsync.mockResolvedValue({
			canceled: false,
			assets: [
				{
					uri: "file:///tmp/booth-logo.jpg",
					fileName: "booth-logo.jpg",
					mimeType: "image/jpeg",
				},
			],
		});

		const { getByTestId } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		fireEvent.press(getByTestId("upload-booth-logo-button"));

		await waitFor(() => {
			expect(mockMutateAsyncUploadBoothLogo).toHaveBeenCalledWith({
				boothId: "booth-123",
				fileUri: "file:///tmp/booth-logo.jpg",
				mimeType: "image/jpeg",
				filename: "booth-logo.jpg",
			});
		});
	});

	it("calls deleteBoothLogo mutation when booth logo delete is confirmed", async () => {
		jest.spyOn(boothQueries, "useBoothBusinessSettings").mockReturnValue({
			data: {
				business_name: "Test Business",
				display_name: "Booth Display Name",
				logo_url: null,
				custom_logo_url: "https://s3.example.com/custom-booth-logo.png",
				use_custom_logo: true,
				show_logo_on_prints: true,
				address: "123 Main St",
				show_business_name: true,
				show_logo: true,
				welcome_subtitle: null,
				show_welcome_subtitle: true,
				cloud_sync_enabled: true,
				use_display_name_on_booths: false,
			},
			isFetching: false,
			isLoading: false,
			isError: false,
			error: null,
		} as any);

		const { getByTestId } = renderWithProviders(
			<BusinessSettingsModal {...defaultProps} />,
		);

		fireEvent.press(getByTestId("delete-booth-logo-button"));

		const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
		const confirmButton = alertCall[2].find(
			(btn: { text: string }) => btn.text === "Delete",
		);
		confirmButton.onPress();

		await waitFor(() => {
			expect(mockMutateAsyncDeleteBoothLogo).toHaveBeenCalledWith({
				boothId: "booth-123",
			});
		});
	});

});
