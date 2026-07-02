/**
 * ConnectionDetailsModal tests
 *
 * Apple-compliance / usefulness contract: booth connection details (registration
 * code, API key, "How to Connect" steps) are only actionable once a booth has an
 * ACTIVE subscription. When the booth has no active subscription the modal must
 * show a neutral "no active subscription" state (no CTA, no web pointer) and hide
 * the connection credentials — they can't be used to activate the booth anyway.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- require() is required inside jest.mock factories (hoisted above imports) */
import React from "react";
import { render } from "@testing-library/react-native";

import { ConnectionDetailsModal } from "../ConnectionDetailsModal";

jest.mock("react-native-safe-area-context", () => {
	const React = require("react");
	const { View } = require("react-native");
	return {
		SafeAreaView: ({ children, style }: { children: React.ReactNode; style?: unknown }) =>
			React.createElement(View, { style }, children),
		SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
			React.createElement(View, null, children),
		useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	};
});

const mockUseBoothCredentials = jest.fn();
const mockUseGenerateBoothCode = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
const mockUseBoothSubscription = jest.fn();

jest.mock("@/api/booths", () => ({
	useBoothCredentials: (id: string | null) => mockUseBoothCredentials(id),
	useGenerateBoothCode: () => mockUseGenerateBoothCode(),
}));

jest.mock("@/api/payments", () => ({
	useBoothSubscription: (id: string | null) => mockUseBoothSubscription(id),
}));

const CREDENTIALS = {
	data: {
		registration_code: "123456",
		code_expires_at: null,
		api_key: "sk_test_abcdefghijklmnopqrstuvwxyz",
	},
	isLoading: false,
	error: null,
	refetch: jest.fn(),
};

describe("ConnectionDetailsModal — subscription gating", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Credentials resolve regardless; the modal must gate on subscription, not on
		// credential presence.
		mockUseBoothCredentials.mockReturnValue(CREDENTIALS);
	});

	it("hides connection details and shows a neutral state when no active subscription", () => {
		mockUseBoothSubscription.mockReturnValue({
			data: { is_active: false, status: null },
			isLoading: false,
		});

		const { queryByText } = render(
			<ConnectionDetailsModal
				visible
				boothId="booth-1"
				boothName="Main Booth"
				onClose={() => {}}
			/>,
		);

		// Neutral, CTA-free state
		expect(queryByText("One more step to go live")).toBeTruthy();
		// Connection credentials / steps are hidden
		expect(queryByText("Registration Code")).toBeNull();
		expect(queryByText("Generate New Code")).toBeNull();
		expect(queryByText("How to Connect")).toBeNull();
		// Never a purchase CTA
		expect(queryByText(/subscribe/i)).toBeNull();
	});

	it("shows connection details when the booth has an active subscription", () => {
		mockUseBoothSubscription.mockReturnValue({
			data: { is_active: true, status: "active" },
			isLoading: false,
		});

		const { queryByText } = render(
			<ConnectionDetailsModal
				visible
				boothId="booth-1"
				boothName="Main Booth"
				onClose={() => {}}
			/>,
		);

		expect(queryByText("Registration Code")).toBeTruthy();
		expect(queryByText("How to Connect")).toBeTruthy();
		expect(queryByText("One more step to go live")).toBeNull();
	});
});
