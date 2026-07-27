/**
 * External (Stripe web) checkout API surface — US storefront feature.
 *
 * Services must hit the exact backend endpoints; mutation hooks deliberately
 * do NOT invalidate caches in onSuccess — invalidation happens at the
 * browser-return site once the purchase outcome is known.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";

jest.mock("@/api/client", () => ({
  apiClient: jest.fn(),
}));

import { apiClient } from "@/api/client";
import { getPricingPlans } from "@/api/pricing/services";
import { createTemplateCheckout } from "@/api/templates/services";
import {
  createBoothCheckout,
  getCustomerPortal,
} from "@/api/payments/services";
import { useTemplateCheckout } from "@/api/templates/queries";
import {
  useCreateBoothCheckout,
  useCustomerPortal,
} from "@/api/payments/queries";

const mockApiClient = apiClient as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  // gcTime: 0 so no GC timers keep the Jest process alive after the run.
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("services", () => {
  it("getPricingPlans GETs /api/v1/pricing/plans", async () => {
    const response = { plans: [], trial_period_days: 14 };
    mockApiClient.mockResolvedValue(response);

    await expect(getPricingPlans()).resolves.toEqual(response);
    expect(mockApiClient).toHaveBeenCalledWith("/api/v1/pricing/plans", {
      method: "GET",
    });
  });

  it("createTemplateCheckout POSTs the line items to the checkout endpoint", async () => {
    const request = {
      booth_id: "booth-1",
      items: [{ template_id: "tpl-uuid-7", quantity: 1 }],
      success_url: "https://boothiq.com/checkout/success",
      cancel_url: "https://boothiq.com/templates",
    };
    mockApiClient.mockResolvedValue({
      success: true,
      checkout_url: "https://checkout.stripe.com/c/pay/cs_test",
      session_id: "cs_test",
      error_message: null,
    });

    await createTemplateCheckout(request);
    expect(mockApiClient).toHaveBeenCalledWith(
      "/api/v1/payments/checkout/templates",
      { method: "POST", body: JSON.stringify(request) },
    );
  });

  it("createBoothCheckout POSTs to the per-booth subscription checkout endpoint", async () => {
    const request = {
      booth_id: "booth-1",
      price_id: "price_123",
      success_url: "https://boothiq.com/checkout/success",
      cancel_url: "https://boothiq.com/pricing",
    };
    mockApiClient.mockResolvedValue({
      success: true,
      checkout_url: "https://checkout.stripe.com/c/pay/cs_test",
      session_id: "cs_test",
    });

    await createBoothCheckout(request);
    expect(mockApiClient).toHaveBeenCalledWith(
      "/api/v1/booths/booth-1/subscription/checkout",
      { method: "POST", body: JSON.stringify(request) },
    );
  });

  it("getCustomerPortal POSTs the return URL to /api/v1/payments/portal", async () => {
    mockApiClient.mockResolvedValue({
      success: true,
      portal_url: "https://billing.stripe.com/p/session",
    });

    await getCustomerPortal({ return_url: "boothiq://settings" });
    expect(mockApiClient).toHaveBeenCalledWith("/api/v1/payments/portal", {
      method: "POST",
      body: JSON.stringify({ return_url: "boothiq://settings" }),
    });
  });
});

describe("mutation hooks", () => {
  it("useTemplateCheckout resolves with the checkout session", async () => {
    const response = {
      success: true,
      checkout_url: "https://checkout.stripe.com/c/pay/cs_1",
      session_id: "cs_1",
      error_message: null,
    };
    mockApiClient.mockResolvedValue(response);

    const { result } = renderHook(() => useTemplateCheckout(), { wrapper });
    result.current.mutate({
      booth_id: "booth-1",
      items: [{ template_id: "tpl-uuid-7", quantity: 1 }],
      success_url: "https://boothiq.com/s",
      cancel_url: "https://boothiq.com/c",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
  });

  it("useCreateBoothCheckout resolves with the checkout session", async () => {
    const response = {
      success: true,
      checkout_url: "https://checkout.stripe.com/c/pay/cs_2",
      session_id: "cs_2",
    };
    mockApiClient.mockResolvedValue(response);

    const { result } = renderHook(() => useCreateBoothCheckout(), { wrapper });
    result.current.mutate({
      booth_id: "booth-1",
      price_id: "price_123",
      success_url: "https://boothiq.com/s",
      cancel_url: "https://boothiq.com/c",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
  });

  it("useCustomerPortal resolves with the portal URL", async () => {
    const response = {
      success: true,
      portal_url: "https://billing.stripe.com/p/session",
    };
    mockApiClient.mockResolvedValue(response);

    const { result } = renderHook(() => useCustomerPortal(), { wrapper });
    result.current.mutate({ return_url: "boothiq://settings" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
  });

  it("surfaces service errors through mutation error state", async () => {
    mockApiClient.mockRejectedValue(new Error("Payment service unavailable"));

    const { result } = renderHook(() => useTemplateCheckout(), { wrapper });
    result.current.mutate({
      booth_id: "booth-1",
      items: [{ template_id: "tpl-uuid-7", quantity: 1 }],
      success_url: "https://boothiq.com/s",
      cancel_url: "https://boothiq.com/c",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe(
      "Payment service unavailable",
    );
  });
});
