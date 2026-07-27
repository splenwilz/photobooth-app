/**
 * /subscribe is deep-link reachable (Expo Router routes every URL), so the
 * screen itself is the last line of defense: with the storefront gate closed
 * it must render the neutral line and never mount the checkout UI.
 */
import React from "react";
import { render } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import { useExternalPurchases } from "@/hooks/use-external-purchases";
import SubscribeScreen from "../subscribe";

jest.mock("@/hooks/use-external-purchases", () => ({
  useExternalPurchases: jest.fn(),
}));
jest.mock("@/components/subscription", () => {
  // jest.mock factories cannot close over module-scope imports.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const ReactLib = require("react");
  const { Text } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    PricingPlansSelector: () =>
      ReactLib.createElement(Text, null, "PLAN_SELECTOR"),
  };
});

const mockGate = useExternalPurchases as jest.Mock;
const mockParams = useLocalSearchParams as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.mockReturnValue({ boothId: "booth-1" });
});

describe("app/subscribe — storefront gate", () => {
  it("renders the checkout UI only when the gate is open", () => {
    mockGate.mockReturnValue({ enabled: true, isLoading: false });
    const { getByText } = render(<SubscribeScreen />);
    getByText("PLAN_SELECTOR");
  });

  it("stays neutral when the gate is closed (deep-link reachable off-US)", () => {
    mockGate.mockReturnValue({ enabled: false, isLoading: false });
    const { getByText, queryByText, toJSON } = render(<SubscribeScreen />);

    getByText("Purchases are not available in the app.");
    expect(queryByText("PLAN_SELECTOR")).toBeNull();
    expect(JSON.stringify(toJSON())).not.toMatch(/https?:\/\/|www\./);
  });

  it("renders nothing actionable while the gate is resolving", () => {
    mockGate.mockReturnValue({ enabled: false, isLoading: true });
    const { queryByText } = render(<SubscribeScreen />);
    expect(queryByText("PLAN_SELECTOR")).toBeNull();
    expect(queryByText("Purchases are not available in the app.")).toBeNull();
  });

  it("handles a missing boothId without mounting checkout", () => {
    mockParams.mockReturnValue({});
    mockGate.mockReturnValue({ enabled: true, isLoading: false });
    const { getByText, queryByText } = render(<SubscribeScreen />);
    getByText("No booth selected.");
    expect(queryByText("PLAN_SELECTOR")).toBeNull();
  });
});
