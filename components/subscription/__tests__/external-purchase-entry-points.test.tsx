/**
 * Subscription external-purchase entry points.
 *
 * Compliance contract (Guideline 3.1.1(a)). The guideline prohibits calls to
 * action that direct customers to *purchasing mechanisms* other than IAP, and
 * exempts the US storefront. That draws the line these tests police:
 *
 * - GATED — the Subscribe CTA and "Update payment card" open Stripe on the web.
 * - NOT GATED — Cancel and Resume call our own API and open nothing. They must
 *   render off the US storefront, because otherwise an owner outside the US has
 *   no way to manage a booth's subscription at all.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { EXTERNAL_PURCHASES } from "@/constants/config";
import { useExternalPurchases } from "@/hooks/use-external-purchases";
import {
  useBoothPortalSession,
  useBoothSubscriptionState,
  useCancelBoothSubscription,
  useResumeBoothSubscription,
  useSubscriptionAccess,
  useSubscriptionDetails,
} from "@/api/payments";
import { SubscriptionStatusCard } from "../SubscriptionStatusCard";
import { SubscriptionDetailsModal } from "../SubscriptionDetailsModal";

jest.mock("@/hooks/use-external-purchases", () => ({
  useExternalPurchases: jest.fn(),
}));
jest.mock("@/api/payments", () => ({
  // requireActual first: the modal also imports invalidateBoothBillingQueries,
  // which would be undefined under a bare factory and throw the moment a test
  // exercises a path that refreshes caches.
  ...jest.requireActual("@/api/payments"),
  useBoothSubscriptionState: jest.fn(),
  useSubscriptionAccess: jest.fn(),
  useSubscriptionDetails: jest.fn(),
  useBoothPortalSession: jest.fn(),
  useCancelBoothSubscription: jest.fn(),
  useResumeBoothSubscription: jest.fn(),
}));

const mockGate = useExternalPurchases as jest.Mock;
const mockBoothState = useBoothSubscriptionState as jest.Mock;
const mockAccess = useSubscriptionAccess as jest.Mock;
const mockDetails = useSubscriptionDetails as jest.Mock;
const mockPortal = useBoothPortalSession as jest.Mock;
const mockCancel = useCancelBoothSubscription as jest.Mock;
const mockResume = useResumeBoothSubscription as jest.Mock;

const noSubscription = {
  data: {
    booth_id: "booth-1",
    booth_name: "Mall Booth",
    state: "none",
    subscription_id: null,
    status: null,
    is_active: false,
    current_period_end: null,
    cancel_at_period_end: false,
    price_id: null,
    activation_required: false,
  },
  isLoading: false,
};

const activeSubscription = {
  data: {
    ...noSubscription.data,
    state: "active",
    subscription_id: "sub_1",
    status: "active",
    is_active: true,
    current_period_end: "2026-08-01T00:00:00Z",
  },
  isLoading: false,
  error: null,
};

const cancellingSubscription = {
  data: { ...activeSubscription.data, cancel_at_period_end: true },
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
  mockBoothState.mockReturnValue(noSubscription);
  mockAccess.mockReturnValue({ data: undefined, isLoading: false });
  mockDetails.mockReturnValue({ data: undefined, isLoading: false, error: null });
  mockPortal.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockCancel.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockResume.mockReturnValue({ mutate: jest.fn(), isPending: false });
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
    mockBoothState.mockReturnValue(activeSubscription);
    const { queryByText } = renderWithClient(
      <SubscriptionStatusCard boothId="booth-1" />,
    );
    expect(queryByText("Subscribe")).toBeNull();
  });
});

describe("card update — gated (opens Stripe on the web)", () => {
  it("shows the button on the US storefront and mints a session for this booth", () => {
    mockBoothState.mockReturnValue(activeSubscription);
    const mutate = jest.fn();
    mockPortal.mockReturnValue({ mutate, isPending: false });

    const { getByText } = renderWithClient(
      <SubscriptionDetailsModal visible onClose={jest.fn()} boothId="booth-1" />,
    );

    fireEvent.press(getByText("Update payment card"));

    // flow_data scopes the session to one action on this booth's subscription;
    // return_url must be https because Stripe rejects custom schemes and the
    // backend validates it against a host allowlist.
    expect(mutate).toHaveBeenCalledWith(
      {
        booth_id: "booth-1",
        flow: "payment_method_update",
        return_url: expect.stringMatching(/^https:\/\//),
      },
      expect.any(Object),
    );
  });

  it("returns to a real website page on the configured host", () => {
    // /dashboard/booths exists on the website. The host must stay
    // environment-driven — the same host that serves /checkout/success, which
    // has to be a tunnel in development because Stripe cannot reach localhost.
    // Whether that host is accepted is the backend allowlist's business
    // (PORTAL_RETURN_URL_ALLOWED_HOSTS), not something to hardcode around.
    mockBoothState.mockReturnValue(activeSubscription);
    const mutate = jest.fn();
    mockPortal.mockReturnValue({ mutate, isPending: false });

    const { getByText } = renderWithClient(
      <SubscriptionDetailsModal visible onClose={jest.fn()} boothId="booth-1" />,
    );

    fireEvent.press(getByText("Update payment card"));

    const { return_url: returnUrl } = mutate.mock.calls[0][0];
    expect(returnUrl).toBe(
      `${EXTERNAL_PURCHASES.WEBSITE_URL}/dashboard/booths`,
    );
    expect(returnUrl).toMatch(/^https:\/\//);
  });

  it("hides the button off the US storefront", () => {
    mockGate.mockReturnValue({ enabled: false, isLoading: false });
    mockBoothState.mockReturnValue(activeSubscription);

    const { queryByText } = renderWithClient(
      <SubscriptionDetailsModal visible onClose={jest.fn()} boothId="booth-1" />,
    );
    expect(queryByText("Update payment card")).toBeNull();
  });

  it("hides the button when the booth has no subscription to update", () => {
    mockBoothState.mockReturnValue(noSubscription);

    const { queryByText } = renderWithClient(
      <SubscriptionDetailsModal visible onClose={jest.fn()} boothId="booth-1" />,
    );
    expect(queryByText("Update payment card")).toBeNull();
  });
});

describe("cancelled booths keep a way forward", () => {
  const cancelled = {
    data: {
      ...activeSubscription.data,
      state: "canceled",
      status: "canceled",
      is_active: false,
      cancel_at_period_end: false,
    },
    isLoading: false,
    error: null,
  };

  it("offers Subscribe on the card for a cancelled booth", () => {
    // Restricting Subscribe to state "none" left cancelled booths with no
    // action at all. They have no live subscription, so this duplicates nothing.
    mockBoothState.mockReturnValue(cancelled);

    const { getByText } = renderWithClient(
      <SubscriptionStatusCard boothId="booth-1" />,
    );

    fireEvent.press(getByText("Subscribe"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/subscribe",
      params: { boothId: "booth-1" },
    });
  });

  it("still refuses Subscribe for past_due, which would double-bill", () => {
    mockBoothState.mockReturnValue({
      ...cancelled,
      data: { ...cancelled.data, state: "past_due", status: "past_due" },
    });

    const { queryByText } = renderWithClient(
      <SubscriptionStatusCard boothId="booth-1" />,
    );
    expect(queryByText("Subscribe")).toBeNull();
  });

  it("offers Subscribe in the sheet too, where no other action applies", () => {
    mockBoothState.mockReturnValue(cancelled);

    const { getByText, queryByText } = renderWithClient(
      <SubscriptionDetailsModal visible onClose={jest.fn()} boothId="booth-1" />,
    );

    expect(getByText("Subscribe")).toBeTruthy();
    expect(queryByText("Cancel subscription")).toBeNull();
    expect(queryByText("Resume subscription")).toBeNull();
    expect(queryByText("Update payment card")).toBeNull();
  });
});

describe("cancel and resume — NOT gated (no purchase surface)", () => {
  it("offers Cancel off the US storefront", () => {
    mockGate.mockReturnValue({ enabled: false, isLoading: false });
    mockBoothState.mockReturnValue(activeSubscription);

    const { getByText } = renderWithClient(
      <SubscriptionDetailsModal visible onClose={jest.fn()} boothId="booth-1" />,
    );
    expect(getByText("Cancel subscription")).toBeTruthy();
  });

  it("offers Resume off the US storefront once a cancellation is scheduled", () => {
    mockGate.mockReturnValue({ enabled: false, isLoading: false });
    mockBoothState.mockReturnValue(cancellingSubscription);

    const { getByText, queryByText } = renderWithClient(
      <SubscriptionDetailsModal visible onClose={jest.fn()} boothId="booth-1" />,
    );
    expect(getByText("Resume subscription")).toBeTruthy();
    // Never both: they are mutually exclusive states.
    expect(queryByText("Cancel subscription")).toBeNull();
  });
});
