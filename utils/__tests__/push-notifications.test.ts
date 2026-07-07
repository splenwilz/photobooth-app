/**
 * Push notification utility tests (pure logic).
 */
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import {
	acquireExpoPushToken,
	getOrCreateDeviceId,
	getPushPermissionState,
	hasSeenPushPriming,
	markPushPrimingSeen,
} from "../push-notifications";

const IOS = Notifications.IosAuthorizationStatus;

const mockGetItem = SecureStore.getItemAsync as jest.Mock;
const mockSetItem = SecureStore.setItemAsync as jest.Mock;
const mockGetPerms = Notifications.getPermissionsAsync as jest.Mock;
const mockReqPerms = Notifications.requestPermissionsAsync as jest.Mock;

// expo-device.isDevice is a getter reading this global (see jest.setup.js).
function setIsDevice(value: boolean) {
	(global as { __EXPO_IS_DEVICE__?: boolean }).__EXPO_IS_DEVICE__ = value;
}

describe("getOrCreateDeviceId", () => {
	beforeEach(() => jest.clearAllMocks());

	it("returns the stored id when one exists", async () => {
		mockGetItem.mockResolvedValue("existing-id");
		const id = await getOrCreateDeviceId();
		expect(id).toBe("existing-id");
		expect(mockSetItem).not.toHaveBeenCalled();
	});

	it("generates and persists a UUID on first call", async () => {
		mockGetItem.mockResolvedValue(null);
		const id = await getOrCreateDeviceId();
		expect(id).toBe("test-device-uuid");
		expect(mockSetItem).toHaveBeenCalledWith("push_device_id", "test-device-uuid");
	});
});

describe("acquireExpoPushToken", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		setIsDevice(true);
		mockGetItem.mockResolvedValue("existing-id");
	});
	afterAll(() => {
		setIsDevice(true);
	});

	it("returns 'unsupported' on a simulator/emulator", async () => {
		setIsDevice(false);
		const result = await acquireExpoPushToken();
		expect(result.status).toBe("unsupported");
		expect(mockGetPerms).not.toHaveBeenCalled();
	});

	it("returns 'denied' without prompting when not granted and requestIfUndetermined=false", async () => {
		mockGetPerms.mockResolvedValue({ status: "undetermined" });
		const result = await acquireExpoPushToken({ requestIfUndetermined: false });
		expect(result.status).toBe("denied");
		expect(mockReqPerms).not.toHaveBeenCalled();
	});

	it("prompts and returns 'denied' when the user declines", async () => {
		mockGetPerms.mockResolvedValue({ status: "undetermined" });
		mockReqPerms.mockResolvedValue({ status: "denied" });
		const result = await acquireExpoPushToken({ requestIfUndetermined: true });
		expect(result.status).toBe("denied");
		expect(mockReqPerms).toHaveBeenCalled();
	});

	it("returns a granted token bundle when permission is granted", async () => {
		mockGetPerms.mockResolvedValue({ status: "granted" });
		const result = await acquireExpoPushToken();
		expect(result).toEqual({
			status: "granted",
			token: "ExponentPushToken[test]",
			deviceId: "existing-id",
			platform: expect.stringMatching(/^(ios|android)$/),
		});
	});

	it("treats iOS PROVISIONAL as granted (reads ios.status, not top-level)", async () => {
		// Top-level status is not 'granted', but ios.status says provisional.
		mockGetPerms.mockResolvedValue({
			status: "denied",
			ios: { status: IOS.PROVISIONAL },
		});
		const result = await acquireExpoPushToken();
		expect(result.status).toBe("granted");
	});

	it("requests QUIET provisional auth on the provisional path (iOS)", async () => {
		mockGetPerms.mockResolvedValue({ ios: { status: IOS.NOT_DETERMINED } });
		mockReqPerms.mockResolvedValue({ ios: { status: IOS.PROVISIONAL } });

		const result = await acquireExpoPushToken({
			requestIfUndetermined: true,
			provisional: true,
		});

		expect(mockReqPerms).toHaveBeenCalledWith({
			ios: { allowProvisional: true },
		});
		expect(result.status).toBe("granted");
	});
});

describe("getPushPermissionState", () => {
	beforeEach(() => jest.clearAllMocks());

	it.each([
		[IOS.AUTHORIZED, "granted"],
		[IOS.PROVISIONAL, "granted"],
		[IOS.EPHEMERAL, "granted"],
		[IOS.NOT_DETERMINED, "undetermined"],
		[IOS.DENIED, "denied"],
	])("maps ios.status %p → %s", async (iosStatus, expected) => {
		mockGetPerms.mockResolvedValue({ ios: { status: iosStatus } });
		expect(await getPushPermissionState()).toBe(expected);
	});
});

describe("push priming flag", () => {
	beforeEach(() => jest.clearAllMocks());

	it("hasSeenPushPriming is true only when the flag is '1'", async () => {
		mockGetItem.mockResolvedValue("1");
		expect(await hasSeenPushPriming()).toBe(true);
		mockGetItem.mockResolvedValue(null);
		expect(await hasSeenPushPriming()).toBe(false);
	});

	it("markPushPrimingSeen persists the flag", async () => {
		await markPushPrimingSeen();
		expect(mockSetItem).toHaveBeenCalledWith("push_priming_shown", "1");
	});
});
