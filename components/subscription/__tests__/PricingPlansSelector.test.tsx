/**
 * PricingPlansSelector — plan selection UX.
 *
 * With a single plan there is nothing to choose: it must be preselected so
 * "Subscribe Now" works immediately. With several plans the user still
 * chooses explicitly before the CTA activates.
 */
import React from "react";
import { Alert } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render } from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";
import { usePricingPlans } from "@/api/pricing";
import { useCreateBoothCheckout } from "@/api/payments";
import { ALL_BOOTHS_ID, useBoothStore } from "@/stores/booth-store";
import { PricingPlansSelector } from "../PricingPlansSelector";

jest.mock("@/api/pricing", () => ({ usePricingPlans: jest.fn() }));
// requireActual so the real invalidateBoothBillingQueries runs — the point of
// these assertions is which cache keys actually get invalidated.
jest.mock("@/api/payments", () => ({
  ...jest.requireActual("@/api/payments"),
  useCreateBoothCheckout: jest.fn(),
}));
jest.mock("expo-web-browser", () => ({ openAuthSessionAsync: jest.fn() }));

const mockPlans = usePricingPlans as jest.Mock;
const mockCheckout = useCreateBoothCheckout as jest.Mock;

function plan(id: number, name: string) {
  return {
    id,
    name,
    description: `${name} plan`,
    price_cents: 2900,
    price_display: "$29/mo",
    currency: "usd",
    billing_interval: "month",
    features: ["Feature A"],
    stripe_price_id: `price_${id}`,
    has_annual_option: false,
    annual_discount_percent: 0,
    annual_price_cents: 0,
    annual_price_display: "",
    annual_savings_display: "",
    stripe_annual_price_id: "",
  };
}

function renderSelector(props: { onCheckoutComplete?: () => void } = {}) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const invalidateSpy = jest.spyOn(client, "invalidateQueries");
  const utils = render(
    <QueryClientProvider client={client}>
      <PricingPlansSelector boothId="booth-1" {...props} />
    </QueryClientProvider>,
  );
  return { ...utils, invalidateSpy };
}

const mutate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckout.mockReturnValue({ mutate, isPending: false });
});

describe("PricingPlansSelector", () => {
  it("preselects the only plan so Subscribe works without tapping the card", () => {
    mockPlans.mockReturnValue({
      data: { plans: [plan(1, "BoothIQ Pro")], trial_period_days: 0 },
      isLoading: false,
      error: null,
    });

    const { getByText } = renderSelector();
    fireEvent.press(getByText("Subscribe Now"));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ booth_id: "booth-1", price_id: "price_1" }),
      expect.any(Object),
    );
  });

  describe("checkout browser return flow", () => {
    const mockOpenAuth = WebBrowser.openAuthSessionAsync as jest.Mock;

    beforeEach(() => {
      useBoothStore.setState({ selectedBoothId: ALL_BOOTHS_ID });
    });

    it("confirmed success: invalidates, selects the booth, and hands off to the host", async () => {
      mockPlans.mockReturnValue({
        data: { plans: [plan(1, "BoothIQ Pro")], trial_period_days: 0 },
        isLoading: false,
        error: null,
      });
      let mutateOptions: { onSuccess: (d: unknown) => Promise<void> } | null =
        null;
      mutate.mockImplementation((_vars, opts) => {
        mutateOptions = opts;
      });
      mockOpenAuth.mockResolvedValue({
        type: "success",
        url: "boothiq://payment-success?session_id=cs_1",
      });
      const onCheckoutComplete = jest.fn();
      const { getByText, invalidateSpy } = renderSelector({
        onCheckoutComplete,
      });

      fireEvent.press(getByText("Subscribe Now"));
      await act(async () => {
        await mutateOptions!.onSuccess({
          success: true,
          checkout_url: "https://checkout.stripe.com/c/pay/cs_1",
          session_id: "cs_1",
        });
      });

      expect(mockOpenAuth).toHaveBeenCalledWith(
        "https://checkout.stripe.com/c/pay/cs_1",
        "boothiq://payment-success",
        { preferEphemeralSession: true },
      );
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["payments", "access"],
      });
      // The always-200 state read is what the Settings card and details sheet
      // render. Missing it here left users who had just paid looking at
      // "No active subscription" until the 5-minute staleTime expired.
      // Invalidated by prefix, which partial-matches booth-1.
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["payments", "boothSubscriptionState"],
      });
      expect(useBoothStore.getState().selectedBoothId).toBe("booth-1");
      expect(onCheckoutComplete).toHaveBeenCalled();
    });

    it("dismissed browser: still invalidates but does NOT hand off", async () => {
      mockPlans.mockReturnValue({
        data: { plans: [plan(1, "BoothIQ Pro")], trial_period_days: 0 },
        isLoading: false,
        error: null,
      });
      let mutateOptions: { onSuccess: (d: unknown) => Promise<void> } | null =
        null;
      mutate.mockImplementation((_vars, opts) => {
        mutateOptions = opts;
      });
      mockOpenAuth.mockResolvedValue({ type: "cancel" });
      const onCheckoutComplete = jest.fn();
      const { getByText, invalidateSpy } = renderSelector({
        onCheckoutComplete,
      });

      fireEvent.press(getByText("Subscribe Now"));
      await act(async () => {
        await mutateOptions!.onSuccess({
          success: true,
          checkout_url: "https://checkout.stripe.com/c/pay/cs_1",
          session_id: "cs_1",
        });
      });

      // Only the server knows whether the user paid — refresh regardless.
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["payments", "access"],
      });
      expect(onCheckoutComplete).not.toHaveBeenCalled();
      expect(useBoothStore.getState().selectedBoothId).toBe(ALL_BOOTHS_ID);
    });

    it("browser rejection: invalidations still run and nothing is handed off", async () => {
      mockPlans.mockReturnValue({
        data: { plans: [plan(1, "BoothIQ Pro")], trial_period_days: 0 },
        isLoading: false,
        error: null,
      });
      let mutateOptions: { onSuccess: (d: unknown) => Promise<void> } | null =
        null;
      mutate.mockImplementation((_vars, opts) => {
        mutateOptions = opts;
      });
      mockOpenAuth.mockRejectedValue(new Error("another session in progress"));
      const onCheckoutComplete = jest.fn();
      const { getByText, invalidateSpy } = renderSelector({
        onCheckoutComplete,
      });

      fireEvent.press(getByText("Subscribe Now"));
      // Must not surface as an unhandled rejection.
      await act(async () => {
        await mutateOptions!.onSuccess({
          success: true,
          checkout_url: "https://checkout.stripe.com/c/pay/cs_1",
          session_id: "cs_1",
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["payments", "access"],
      });
      expect(onCheckoutComplete).not.toHaveBeenCalled();
    });

    it("checkout-creation failure surfaces the error alert", () => {
      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation(() => {});
      mockPlans.mockReturnValue({
        data: { plans: [plan(1, "BoothIQ Pro")], trial_period_days: 0 },
        isLoading: false,
        error: null,
      });
      let mutateOptions: { onError: (e: Error) => void } | null = null;
      mutate.mockImplementation((_vars, opts) => {
        mutateOptions = opts;
      });
      const { getByText } = renderSelector();

      fireEvent.press(getByText("Subscribe Now"));
      mutateOptions!.onError(new Error("Payment service unavailable"));

      expect(alertSpy).toHaveBeenCalledWith(
        "Error",
        "Payment service unavailable",
      );
      alertSpy.mockRestore();
    });
  });

  it("still requires an explicit choice when there are multiple plans", () => {
    mockPlans.mockReturnValue({
      data: {
        plans: [plan(1, "Starter"), plan(2, "Pro")],
        trial_period_days: 0,
      },
      isLoading: false,
      error: null,
    });

    const { getByText } = renderSelector();
    fireEvent.press(getByText("Subscribe Now"));
    expect(mutate).not.toHaveBeenCalled();

    fireEvent.press(getByText("Pro"));
    fireEvent.press(getByText("Subscribe Now"));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ price_id: "price_2" }),
      expect.any(Object),
    );
  });
});
