/**
 * PushPrimingModal tests
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { PushPrimingModal } from "../push-priming-modal";
import { acquireExpoPushToken, markPushPrimingSeen } from "@/utils/push-notifications";
import { registerDevice } from "@/api/push/services";

jest.mock("@/utils/push-notifications", () => ({
	acquireExpoPushToken: jest.fn(),
	markPushPrimingSeen: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/api/push/services", () => ({ registerDevice: jest.fn() }));

const mockAcquire = acquireExpoPushToken as jest.Mock;
const mockRegister = registerDevice as jest.Mock;
const mockMarkSeen = markPushPrimingSeen as jest.Mock;

function renderModal(onClose = jest.fn()) {
	const qc = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	});
	const utils = render(
		<QueryClientProvider client={qc}>
			<PushPrimingModal visible onClose={onClose} />
		</QueryClientProvider>,
	);
	return { ...utils, onClose };
}

describe("PushPrimingModal", () => {
	beforeEach(() => jest.clearAllMocks());

	it("'Enable alerts' requests full permission and registers on grant", async () => {
		mockAcquire.mockResolvedValue({
			status: "granted",
			token: "ExponentPushToken[x]",
			deviceId: "d1",
			platform: "ios",
		});
		const { getByLabelText, onClose } = renderModal();

		fireEvent.press(getByLabelText("Enable alerts"));

		await waitFor(() => expect(onClose).toHaveBeenCalled());
		expect(mockAcquire).toHaveBeenCalledWith({
			requestIfUndetermined: true,
			provisional: false,
		});
		expect(mockRegister).toHaveBeenCalledWith({
			expo_push_token: "ExponentPushToken[x]",
			device_id: "d1",
			platform: "ios",
		});
		expect(mockMarkSeen).toHaveBeenCalled();
	});

	it("'Not now' takes the provisional path and does not register when denied", async () => {
		mockAcquire.mockResolvedValue({ status: "denied" });
		const { getByLabelText, onClose } = renderModal();

		fireEvent.press(getByLabelText("Not now"));

		await waitFor(() => expect(onClose).toHaveBeenCalled());
		expect(mockAcquire).toHaveBeenCalledWith({
			requestIfUndetermined: true,
			provisional: true,
		});
		expect(mockRegister).not.toHaveBeenCalled();
		expect(mockMarkSeen).toHaveBeenCalled(); // still marked so it won't reappear
	});
});
