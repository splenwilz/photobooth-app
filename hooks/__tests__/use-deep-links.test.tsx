/**
 * useDeepLinks tests
 *
 * Apple-compliance contract: deep links that exist only to support an
 * in-app purchase round-trip (`payment-success`, `payment-cancel`,
 * `pricing`, `template-purchase-success`, `template-purchase-cancel`)
 * MUST be no-ops. Account-management paths (`settings`, `billing`,
 * `booths`, `alerts`) MUST still work.
 */
import React from "react";
import { Alert } from "react-native";
import { render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let capturedHandler: ((event: { url: string }) => void) | null = null;
const mockGetInitialURL = jest.fn().mockResolvedValue(null);
const mockRemove = jest.fn();

jest.mock("expo-linking", () => ({
	addEventListener: (
		_event: string,
		handler: (event: { url: string }) => void,
	) => {
		capturedHandler = handler;
		return { remove: mockRemove };
	},
	getInitialURL: () => mockGetInitialURL(),
	openURL: jest.fn(),
	parse: (url: string) => {
		// Parse "boothiq://path?key=value" into { path, queryParams }
		const stripped = url.replace(/^[^:]+:\/\//, "");
		const [pathPart, queryPart] = stripped.split("?");
		const queryParams: Record<string, string> = {};
		if (queryPart) {
			queryPart.split("&").forEach((kv) => {
				const [k, v] = kv.split("=");
				queryParams[k] = decodeURIComponent(v ?? "");
			});
		}
		return { path: pathPart, hostname: pathPart, queryParams };
	},
}));

const mockSetSelectedBoothId = jest.fn();
jest.mock("@/stores/booth-store", () => ({
	ALL_BOOTHS_ID: "all",
	useBoothStore: Object.assign(
		jest.fn(() => ({ setSelectedBoothId: mockSetSelectedBoothId })),
		{
			getState: () => ({ setSelectedBoothId: mockSetSelectedBoothId }),
		},
	),
}));

import { router } from "expo-router";
import { useDeepLinks } from "@/hooks/use-deep-links";

const mockReplace = router.replace as jest.Mock;

function Harness() {
	useDeepLinks();
	return null;
}

function mountHarness() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const r = render(
		<QueryClientProvider client={qc}>
			<Harness />
		</QueryClientProvider>,
	);
	return { ...r, qc };
}

describe("useDeepLinks — Apple-compliance contract", () => {
	let alertSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		capturedHandler = null;
		alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
	});

	afterEach(() => {
		alertSpy.mockRestore();
	});

	async function fireDeepLink(url: string) {
		const { qc } = mountHarness();
		const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
		await waitFor(() => expect(capturedHandler).not.toBeNull());
		capturedHandler!({ url });
		return { invalidateSpy };
	}

	it("payment-success is a no-op (no alert, no navigation, no cache/store mutation)", async () => {
		const { invalidateSpy } = await fireDeepLink(
			"boothiq://payment-success?booth_id=abc",
		);
		expect(alertSpy).not.toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(mockSetSelectedBoothId).not.toHaveBeenCalled();
	});

	it("payment-cancel is a no-op", async () => {
		const { invalidateSpy } = await fireDeepLink("boothiq://payment-cancel");
		expect(alertSpy).not.toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(mockSetSelectedBoothId).not.toHaveBeenCalled();
	});

	it("pricing is a no-op", async () => {
		const { invalidateSpy } = await fireDeepLink("boothiq://pricing");
		expect(mockReplace).not.toHaveBeenCalled();
		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(mockSetSelectedBoothId).not.toHaveBeenCalled();
	});

	it("template-purchase-success is a no-op", async () => {
		const { invalidateSpy } = await fireDeepLink(
			"boothiq://template-purchase-success",
		);
		expect(alertSpy).not.toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(mockSetSelectedBoothId).not.toHaveBeenCalled();
	});

	it("template-purchase-cancel is a no-op", async () => {
		const { invalidateSpy } = await fireDeepLink(
			"boothiq://template-purchase-cancel",
		);
		expect(alertSpy).not.toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(mockSetSelectedBoothId).not.toHaveBeenCalled();
	});

	it("settings still triggers query invalidation (regression guard)", async () => {
		const { qc } = mountHarness();
		await waitFor(() => expect(capturedHandler).not.toBeNull());
		const spy = jest.spyOn(qc, "invalidateQueries");
		capturedHandler!({ url: "boothiq://settings" });
		expect(spy).toHaveBeenCalled();
	});

	it("billing still triggers query invalidation and navigation (regression guard)", async () => {
		const { qc } = mountHarness();
		await waitFor(() => expect(capturedHandler).not.toBeNull());
		const spy = jest.spyOn(qc, "invalidateQueries");
		capturedHandler!({ url: "boothiq://billing" });
		expect(spy).toHaveBeenCalled();
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/settings");
	});

	it("booths still navigates (regression guard)", async () => {
		await fireDeepLink("boothiq://booths?booth_id=xyz");
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/booths");
	});

	it("alerts navigates to the alerts tab (regression guard)", async () => {
		await fireDeepLink("boothiq://alerts");
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/alerts");
	});
});
