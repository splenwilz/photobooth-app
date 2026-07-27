/**
 * Storefront gate for external (Stripe web) purchases.
 *
 * Compliance contract (App Store Guideline 3.1.1(a)): purchase CTAs may only
 * be enabled on the United States App Store storefront, and the gate must
 * fail CLOSED — any error, unknown storefront, or disabled flag hides them.
 */
import { renderHook, waitFor } from "@testing-library/react-native";
import { getStorefront } from "expo-iap";
import { useExternalPurchases } from "../use-external-purchases";
import {
  __resetStorefrontCacheForTests,
  getStorefrontCountry,
} from "../use-storefront";

const mockGetStorefront = getStorefront as jest.Mock;

describe("useExternalPurchases", () => {
  const originalFlag = process.env.EXPO_PUBLIC_EXTERNAL_PURCHASES_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetStorefrontCacheForTests();
    process.env.EXPO_PUBLIC_EXTERNAL_PURCHASES_ENABLED = "true";
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_EXTERNAL_PURCHASES_ENABLED = originalFlag;
  });

  it("enables purchases on the US storefront when the flag is on", async () => {
    mockGetStorefront.mockResolvedValue("USA");
    const { result } = renderHook(() => useExternalPurchases());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(true);
  });

  it("disables purchases on non-US storefronts", async () => {
    mockGetStorefront.mockResolvedValue("DEU");
    const { result } = renderHook(() => useExternalPurchases());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(false);
  });

  it("fails closed when the storefront lookup throws", async () => {
    mockGetStorefront.mockRejectedValue(new Error("Service error"));
    const { result } = renderHook(() => useExternalPurchases());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(false);
  });

  it("fails closed when the storefront is empty/unknown", async () => {
    mockGetStorefront.mockResolvedValue("");
    const { result } = renderHook(() => useExternalPurchases());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(false);
  });

  it("stays disabled on the US storefront when the kill-switch flag is off", async () => {
    process.env.EXPO_PUBLIC_EXTERNAL_PURCHASES_ENABLED = "false";
    mockGetStorefront.mockResolvedValue("USA");
    const { result } = renderHook(() => useExternalPurchases());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(false);
  });

  it("is disabled (not loading forever) while remaining gated during lookup", async () => {
    let resolve: (v: string) => void;
    mockGetStorefront.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useExternalPurchases());

    // Gate must be closed while the storefront is still unknown.
    expect(result.current.enabled).toBe(false);
    expect(result.current.isLoading).toBe(true);

    resolve!("USA");
    await waitFor(() => expect(result.current.enabled).toBe(true));
  });

  describe("getStorefrontCountry", () => {
    it("resolves null on Android without touching the native module", async () => {
      const { Platform } = require("react-native");
      const originalOS = Platform.OS;
      Platform.OS = "android";
      try {
        await expect(getStorefrontCountry()).resolves.toBeNull();
        expect(mockGetStorefront).not.toHaveBeenCalled();
      } finally {
        Platform.OS = originalOS;
      }
    });

    it("caches a successful lookup (one native call for many callers)", async () => {
      mockGetStorefront.mockResolvedValue("USA");
      await expect(getStorefrontCountry()).resolves.toBe("USA");
      await expect(getStorefrontCountry()).resolves.toBe("USA");
      expect(mockGetStorefront).toHaveBeenCalledTimes(1);
    });

    it("does not cache failures — a later call may retry and succeed", async () => {
      mockGetStorefront
        .mockRejectedValueOnce(new Error("transient"))
        .mockResolvedValueOnce("USA");
      await expect(getStorefrontCountry()).resolves.toBeNull();
      await expect(getStorefrontCountry()).resolves.toBe("USA");
    });
  });
});
