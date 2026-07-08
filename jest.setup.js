// Mock expo-secure-store (used by api/client.ts)
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-router with stable references
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  router: { replace: mockReplace, push: mockPush },
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

// Mock expo-linking — parse just enough of `scheme://host?a=b` for routing.
jest.mock("expo-linking", () => ({
  openURL: jest.fn(),
  openSettings: jest.fn().mockResolvedValue(undefined),
  parse: jest.fn((url) => {
    const match = /^[a-z0-9]+:\/\/([^?]*)(?:\?(.*))?$/i.exec(url);
    const hostname = match ? match[1] : url;
    const query = match && match[2] ? match[2] : "";
    const queryParams = {};
    for (const pair of query.split("&").filter(Boolean)) {
      const [k, v] = pair.split("=");
      queryParams[k] = decodeURIComponent(v || "");
    }
    return { path: null, hostname, queryParams };
  }),
}));

// --- Push notification native modules ---

// expo-notifications: default-happy mocks; individual tests override as needed.
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getExpoPushTokenAsync: jest
    .fn()
    .mockResolvedValue({ data: "ExponentPushToken[test]" }),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  clearLastNotificationResponseAsync: jest.fn(),
  useLastNotificationResponse: jest.fn(() => null),
  AndroidImportance: { HIGH: 4, MAX: 5, DEFAULT: 3 },
  DEFAULT_ACTION_IDENTIFIER: "expo.modules.notifications.actions.DEFAULT",
  // Matches expo-notifications IosAuthorizationStatus enum ordering.
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
}));

// expo-device: physical device by default; tests flip global.__EXPO_IS_DEVICE__.
// A getter (not a static value) so the utils module — which copies the module
// namespace via Babel interop — still reads the current value at call time.
jest.mock("expo-device", () => ({
  __esModule: true,
  get isDevice() {
    return global.__EXPO_IS_DEVICE__ !== false;
  },
}));

// expo-crypto: deterministic UUID for tests.
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "test-device-uuid"),
}));

// expo-constants: provide an EAS projectId so token acquisition can proceed.
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: "test-project-id" } } } },
}));
