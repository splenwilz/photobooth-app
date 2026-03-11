// Mock expo-secure-store (used by api/client.ts)
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

// Mock expo-linking
jest.mock("expo-linking", () => ({
  openURL: jest.fn(),
}));
