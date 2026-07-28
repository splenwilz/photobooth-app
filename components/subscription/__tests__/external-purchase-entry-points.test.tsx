/**
 * Subscription external-purchase entry points.
 *
 * Compliance contract (Guideline 3.1.1(a)): the Subscribe CTA and the
 * "Manage Subscription on Web" button render ONLY when the US-storefront
 * gate is open. Off the US storefront both surfaces stay read-only.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { useExternalPurchases } from "@/hooks/use-external-purchases";
import {
  useBoothSubscription,
  useCustomerPortal,
  useSubscriptionAccess,
  useSubscriptionDetails,
} from "@/api/payments";
import { SubscriptionStatusCard } from "../SubscriptionStatusCard";
import { SubscriptionDetailsModal } from "../SubscriptionDetailsModal";

jest.mock("@/hooks/use-external-purchases", () => ({
  useExternalPurchases: jest.fn(),
}));
jest.mock("@/api/payments", () => ({
  useBoothSubscription: jest.fn(),
  useSubscriptionAccess: jest.fn(),
  useSubscriptionDetails: jest.fn(),
  useCustomerPortal: jest.fn(),
}));

const mockGate = useExternalPurchases as jest.Mock;
const mockBoothSub = useBoothSubscription as jest.Mock;
const mockAccess = useSubscriptionAccess as jest.Mock;
const mockDetails = useSubscriptionDetails as jest.Mock;
const mockPortal = useCustomerPortal as jest.Mock;

const noSubscription = {
  data: {
    booth_id: "booth-1",
    booth_name: "Mall Booth",
    subscription_id: null,
    status: null,
    is_active: false,
    current_period_end: null,
    cancel_at_period_end: false,
    price_id: null,
  },
  isLoading: false,
};

const activeSubscription = {
  data: {
    ...noSubscription.data,
    subscription_id: "sub_1",
    status: "active",
    is_active: true,
    current_period_end: "2026-08-01T00:00:00Z",
  },
  isLoading: false,
  error: null,
};

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGate.mockReturnValue({ enabled: true, isLoading: false });
  mockBoothSub.mockReturnValue(noSubscription);
  mockAccess.mockReturnValue({ data: undefined, isLoading: false });
  mockDetails.mockReturnValue({ data: undefined, isLoading: false, error: null });
  mockPortal.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe("SubscriptionStatusCard Subscribe CTA", () => {
  it("shows Subscribe for an unsubscribed booth on the US storefront and routes to /subscribe", () => {
    const { getByText } = renderWithClient(
      <SubscriptionStatusCard boothId="booth-1" />,
    );

    fireEvent.press(getByText("Subscribe"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/subscribe",
      params: { boothId: "booth-1" },
    });
  });

  it("hides Subscribe off the US storefront", () => {
    mockGate.mockReturnValue({ enabled: false, isLoading: false });
    const { queryByText } = renderWithClient(
      <SubscriptionStatusCard boothId="booth-1" />,
    );
    expect(queryByText("Subscribe")).toBeNull();
  });

  it("hides Subscribe while the storefront gate is still resolving", () => {
    mockGate.mockReturnValue({ enabled: false, isLoading: true });
    const { queryByText } = renderWithClient(
      <SubscriptionStatusCard boothId="booth-1" />,
    );
    expect(queryByText("Subscribe")).toBeNull();
  });

  it("hides Subscribe when the booth already has an active subscription", () => {
    mockBoothSub.mockReturnValue(activeSubscription);
    const { queryByText } = renderWithClient(
      <SubscriptionStatusCard boothId="booth-1" />,
    );
    expect(queryByText("Subscribe")).toBeNull();
  });
});

describe("SubscriptionDetailsModal manage-on-web", () => {
  it("shows the manage button on the US storefront and creates a portal session", () => {
    mockBoothSub.mockReturnValue(activeSubscription);
    const mutate = jest.fn();
    mockPortal.mockReturnValue({ mutate, isPending: false });

    const { getByText } = renderWithClient(
      <SubscriptionDetailsModal visible onClose={jest.fn()} boothId="booth-1" />,
    );

    fireEvent.press(getByText("Manage Subscription on Web"));
    // Stripe requires an http(s) return_url — a custom scheme 400s the
    // portal session creation.
    expect(mutate).toHaveBeenCalledWith(
      { return_url: expect.stringMatching(/^https:\/\//) },
      expect.any(Object),
    );
  });

  it("hides the manage button off the US storefront", () => {
    mockGate.mockReturnValue({ enabled: false, isLoading: false });
    mockBoothSub.mockReturnValue(activeSubscription);

    const { queryByText } = renderWithClient(
      <SubscriptionDetailsModal visible onClose={jest.fn()} boothId="booth-1" />,
    );
    expect(queryByText("Manage Subscription on Web")).toBeNull();
  });
});
