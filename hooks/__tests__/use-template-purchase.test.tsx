/**
 * Template purchase round-trip (US storefront external checkout).
 *
 * Create session → open Stripe checkout in the auth-session browser →
 * interpret the intercepted boothiq:// redirect → invalidate purchased
 * caches ONLY on confirmed success.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";

jest.mock("@/api/client", () => ({ apiClient: jest.fn() }));
jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
}));

import { apiClient } from "@/api/client";
import { useTemplatePurchase } from "../use-template-purchase";

const mockApiClient = apiClient as jest.Mock;
const mockOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

const SESSION = {
  success: true,
  checkout_url: "https://checkout.stripe.com/c/pay/cs_1",
  session_id: "cs_1",
  error_message: null,
};

function makeWrapper() {
  // gcTime: 0 so no GC timers keep the Jest process alive after the run.
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const invalidateSpy = jest.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateSpy };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useTemplatePurchase", () => {
  it("opens checkout and invalidates purchased templates on confirmed success", async () => {
    mockApiClient.mockResolvedValue(SESSION);
    mockOpenAuthSession.mockResolvedValue({
      type: "success",
      url: "boothiq://template-purchase-success?session_id=cs_1",
    });
    const { wrapper, invalidateSpy } = makeWrapper();
    const { result } = renderHook(() => useTemplatePurchase(), { wrapper });

    const outcome = await result.current.purchase({
      templateId: "tpl-1",
      boothId: "booth-1",
    });

    expect(outcome).toBe("success");
    expect(mockOpenAuthSession).toHaveBeenCalledWith(
      SESSION.checkout_url,
      "boothiq://template-purchase-success",
      { preferEphemeralSession: true },
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["templates", "purchased"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["templates", "detail", "tpl-1"],
    });
  });

  it("sends booth-scoped line items and redirect URLs to the backend", async () => {
    mockApiClient.mockResolvedValue(SESSION);
    mockOpenAuthSession.mockResolvedValue({ type: "cancel" });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useTemplatePurchase(), { wrapper });

    await result.current.purchase({ templateId: "tpl-1", boothId: "booth-1" });

    const body = JSON.parse(mockApiClient.mock.calls[0][1].body);
    expect(body.booth_id).toBe("booth-1");
    expect(body.items).toEqual([{ template_id: "tpl-1", quantity: 1 }]);
    expect(body.success_url).toContain("{CHECKOUT_SESSION_ID}");
    expect(body.success_url).toMatch(/^https:\/\//);
    expect(body.cancel_url).toMatch(/^https:\/\//);
  });

  it("treats a dismissed browser as cancelled but still refreshes caches", async () => {
    // The user may have PAID and closed the sheet before the redirect fired —
    // only the server knows, so every browser return refreshes.
    mockApiClient.mockResolvedValue(SESSION);
    mockOpenAuthSession.mockResolvedValue({ type: "cancel" });
    const { wrapper, invalidateSpy } = makeWrapper();
    const { result } = renderHook(() => useTemplatePurchase(), { wrapper });

    const outcome = await result.current.purchase({
      templateId: "tpl-1",
      boothId: "booth-1",
    });

    expect(outcome).toBe("cancelled");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["templates", "purchased"],
    });
  });

  it("treats an intercepted cancel redirect as cancelled (still refreshing)", async () => {
    mockApiClient.mockResolvedValue(SESSION);
    mockOpenAuthSession.mockResolvedValue({
      type: "success",
      url: "boothiq://template-purchase-cancel",
    });
    const { wrapper, invalidateSpy } = makeWrapper();
    const { result } = renderHook(() => useTemplatePurchase(), { wrapper });

    const outcome = await result.current.purchase({
      templateId: "tpl-1",
      boothId: "booth-1",
    });

    expect(outcome).toBe("cancelled");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["templates", "purchased"],
    });
  });

  it("ignores a second purchase call while one is in flight (double-tap guard)", async () => {
    mockApiClient.mockResolvedValue(SESSION);
    let resolveBrowser: (v: unknown) => void;
    mockOpenAuthSession.mockReturnValue(
      new Promise((r) => (resolveBrowser = r)),
    );
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useTemplatePurchase(), { wrapper });

    const first = result.current.purchase({
      templateId: "tpl-1",
      boothId: "booth-1",
    });
    const second = result.current.purchase({
      templateId: "tpl-1",
      boothId: "booth-1",
    });

    await expect(second).resolves.toBe("cancelled");
    // Only ONE checkout session was created and one browser opened.
    await waitFor(() => expect(mockOpenAuthSession).toHaveBeenCalledTimes(1));
    expect(mockApiClient).toHaveBeenCalledTimes(1);

    resolveBrowser!({ type: "cancel" });
    await first;
  });

  it("throws when the backend refuses to create a session", async () => {
    mockApiClient.mockResolvedValue({
      success: false,
      checkout_url: "",
      session_id: "",
      error_message: "Template already purchased for this booth",
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useTemplatePurchase(), { wrapper });

    await expect(
      result.current.purchase({ templateId: "tpl-1", boothId: "booth-1" }),
    ).rejects.toThrow("Template already purchased for this booth");
    expect(mockOpenAuthSession).not.toHaveBeenCalled();
  });

  it("exposes isPurchasing during the round-trip and clears it after", async () => {
    mockApiClient.mockResolvedValue(SESSION);
    let resolveBrowser: (v: unknown) => void;
    mockOpenAuthSession.mockReturnValue(
      new Promise((r) => (resolveBrowser = r)),
    );
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useTemplatePurchase(), { wrapper });

    const pending = result.current.purchase({
      templateId: "tpl-1",
      boothId: "booth-1",
    });
    await waitFor(() => expect(result.current.isPurchasing).toBe(true));

    resolveBrowser!({ type: "cancel" });
    await pending;
    await waitFor(() => expect(result.current.isPurchasing).toBe(false));
  });
});
