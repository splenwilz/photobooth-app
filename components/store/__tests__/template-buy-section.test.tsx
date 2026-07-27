/**
 * TemplateBuySection — the only purchase affordance in the store.
 *
 * Compliance contract: the Buy CTA renders ONLY when the external-purchase
 * gate is open (US storefront + flag). Everywhere else paid templates show a
 * neutral informational line with no link, URL, or call to action
 * (Guideline 3.1.1(a)).
 */
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useExternalPurchases } from "@/hooks/use-external-purchases";
import { useTemplatePurchase } from "@/hooks/use-template-purchase";
import { useBoothOverview } from "@/api/booths/queries";
import { usePurchasedTemplates } from "@/api/templates/queries";
import { ALL_BOOTHS_ID, useBoothStore } from "@/stores/booth-store";
import { TemplateBuySection } from "../template-buy-section";
import type { Template } from "@/api/templates/types";

jest.mock("@/hooks/use-external-purchases", () => ({
  useExternalPurchases: jest.fn(),
}));
jest.mock("@/hooks/use-template-purchase", () => ({
  useTemplatePurchase: jest.fn(),
}));
jest.mock("@/api/booths/queries", () => ({
  useBoothOverview: jest.fn(),
}));
jest.mock("@/api/templates/queries", () => ({
  usePurchasedTemplates: jest.fn(),
}));

const mockGate = useExternalPurchases as jest.Mock;
const mockPurchaseHook = useTemplatePurchase as jest.Mock;
const mockBoothOverview = useBoothOverview as jest.Mock;
const mockPurchased = usePurchasedTemplates as jest.Mock;

const paidTemplate = {
  id: "tpl-1",
  name: "Vintage Frames",
  price: "4.99",
  original_price: null,
} as unknown as Template;

const freeTemplate = {
  ...paidTemplate,
  id: "tpl-free",
  price: "0.00",
} as unknown as Template;

const oneBooth = { booths: [{ booth_id: "booth-1", booth_name: "Mall Booth" }] };
const twoBooths = {
  booths: [
    { booth_id: "booth-1", booth_name: "Mall Booth" },
    { booth_id: "booth-2", booth_name: "Arcade Booth" },
  ],
};

const mockPurchase = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockGate.mockReturnValue({ enabled: true, isLoading: false });
  mockPurchaseHook.mockReturnValue({
    purchase: mockPurchase,
    isPurchasing: false,
  });
  mockBoothOverview.mockReturnValue({ data: oneBooth });
  mockPurchased.mockReturnValue({ data: { purchases: [] } });
  useBoothStore.setState({ selectedBoothId: ALL_BOOTHS_ID });
});

describe("TemplateBuySection", () => {
  it("renders a Buy CTA on the US storefront and purchases for the only booth", async () => {
    mockPurchase.mockResolvedValue("success");
    const { getByText } = render(<TemplateBuySection template={paidTemplate} />);

    const buyButton = getByText("Buy for $4.99");
    fireEvent.press(buyButton);

    await waitFor(() =>
      expect(mockPurchase).toHaveBeenCalledWith({
        templateId: "tpl-1",
        boothId: "booth-1",
      }),
    );
  });

  it("shows only a neutral line — no CTA, no URL — off the US storefront", () => {
    mockGate.mockReturnValue({ enabled: false, isLoading: false });
    const { queryByText, getByText, toJSON } = render(
      <TemplateBuySection template={paidTemplate} />,
    );

    getByText("Purchases are not available in the app.");
    expect(queryByText(/buy/i)).toBeNull();
    // The neutral copy must not smuggle in a link or address.
    expect(JSON.stringify(toJSON())).not.toMatch(/https?:\/\/|www\.|\.com/);
  });

  it("renders nothing while the storefront gate is still resolving", () => {
    mockGate.mockReturnValue({ enabled: false, isLoading: true });
    const { toJSON } = render(<TemplateBuySection template={paidTemplate} />);
    expect(toJSON()).toBeNull();
  });

  it("renders nothing for free templates", () => {
    const { toJSON } = render(<TemplateBuySection template={freeTemplate} />);
    expect(toJSON()).toBeNull();
  });

  it("shows a purchased state instead of a Buy CTA when the booth owns it", () => {
    mockPurchased.mockReturnValue({
      data: { purchases: [{ template_id: "tpl-1" }] },
    });
    const { queryByText, getByText } = render(
      <TemplateBuySection template={paidTemplate} />,
    );

    getByText(/purchased/i);
    expect(queryByText("Buy for $4.99")).toBeNull();
  });

  it("shows the owned state even off the US storefront (display, not affordance)", () => {
    mockGate.mockReturnValue({ enabled: false, isLoading: false });
    mockPurchased.mockReturnValue({
      data: { purchases: [{ template_id: "tpl-1" }] },
    });
    const { getByText, queryByText } = render(
      <TemplateBuySection template={paidTemplate} />,
    );

    getByText(/purchased/i);
    expect(queryByText("Purchases are not available in the app.")).toBeNull();
  });

  it("lets off-US multi-booth owners resolve a booth and see the owned state", () => {
    mockGate.mockReturnValue({ enabled: false, isLoading: false });
    mockBoothOverview.mockReturnValue({ data: twoBooths });
    // Param-aware mock: like the real hook, no booth_id resolves no data.
    mockPurchased.mockImplementation(({ booth_id }: { booth_id?: string }) =>
      booth_id
        ? { data: { purchases: [{ template_id: "tpl-1" }] } }
        : { data: undefined },
    );
    const { getByText, queryByText } = render(
      <TemplateBuySection template={paidTemplate} />,
    );

    // Picker present with neutral label — no purchase phrasing off-US.
    getByText("Booth:");
    expect(queryByText("Buy for booth:")).toBeNull();
    getByText("Purchases are not available in the app.");

    fireEvent.press(getByText("Mall Booth"));
    getByText(/purchased/i);
  });

  it("dead-ends into a create-booth message when the user has no booths", () => {
    mockBoothOverview.mockReturnValue({ data: { booths: [] } });
    const { getByText, queryByText } = render(
      <TemplateBuySection template={paidTemplate} />,
    );

    getByText("Create a booth to buy templates.");
    expect(queryByText("Buy for $4.99")).toBeNull();
  });

  it("keeps the booth picker visible in the purchased state (buy for another booth)", () => {
    mockBoothOverview.mockReturnValue({ data: twoBooths });
    mockPurchased.mockReturnValue({
      data: { purchases: [{ template_id: "tpl-1" }] },
    });
    const { getByText } = render(<TemplateBuySection template={paidTemplate} />);

    getByText(/purchased/i);
    // Both booths still offered so the user can switch and buy for the other.
    getByText("Mall Booth");
    getByText("Arcade Booth");
  });

  it("requires picking a booth when the user has several", () => {
    mockBoothOverview.mockReturnValue({ data: twoBooths });
    const { getByText } = render(<TemplateBuySection template={paidTemplate} />);

    // Both booths offered; CTA does not fire until one is chosen.
    getByText("Mall Booth");
    getByText("Arcade Booth");
    fireEvent.press(getByText("Buy for $4.99"));
    expect(mockPurchase).not.toHaveBeenCalled();

    fireEvent.press(getByText("Arcade Booth"));
    fireEvent.press(getByText("Buy for $4.99"));
    expect(mockPurchase).toHaveBeenCalledWith({
      templateId: "tpl-1",
      boothId: "booth-2",
    });
  });
});
