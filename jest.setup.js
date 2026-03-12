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

// Mock expo-linking
jest.mock("expo-linking", () => ({
  openURL: jest.fn(),
}));
