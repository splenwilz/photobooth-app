/**
 * useRegisterPushDevice tests — opportunistic silent registration.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import { useRegisterPushDevice } from "../use-register-push-device";
import { acquireExpoPushToken } from "@/utils/push-notifications";
import { registerDevice } from "@/api/push/services";

jest.mock("@/utils/push-notifications", () => ({
	acquireExpoPushToken: jest.fn(),
}));
jest.mock("@/api/push/services", () => ({ registerDevice: jest.fn() }));

const mockAcquire = acquireExpoPushToken as jest.Mock;
const mockRegister = registerDevice as jest.Mock;

function createWrapper() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	function Wrapper({ children }: { children: React.ReactNode }) {
		return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
	}
	Wrapper.displayName = "QueryClientWrapper";
	return Wrapper;
}

describe("useRegisterPushDevice", () => {
	beforeEach(() => jest.clearAllMocks());

	it("registers silently when permission is already granted (never prompts)", async () => {
		mockAcquire.mockResolvedValue({
			status: "granted",
			token: "ExponentPushToken[abc]",
			deviceId: "dev-1",
			platform: "ios",
		});

		renderHook(() => useRegisterPushDevice(), { wrapper: createWrapper() });

		await waitFor(() =>
			expect(mockRegister).toHaveBeenCalledWith({
				expo_push_token: "ExponentPushToken[abc]",
				device_id: "dev-1",
				platform: "ios",
			}),
		);
		expect(mockAcquire).toHaveBeenCalledWith({ requestIfUndetermined: false });
	});

	it("does not register when permission is not granted", async () => {
		mockAcquire.mockResolvedValue({ status: "denied" });
		renderHook(() => useRegisterPushDevice(), { wrapper: createWrapper() });
		await new Promise((r) => setTimeout(r, 0));
		expect(mockRegister).not.toHaveBeenCalled();
	});
});
