/**
 * useDeepLinks tests
 *
 * Purchase round-trip deep links (`payment-success`, `payment-cancel`,
 * `template-purchase-success`, `template-purchase-cancel`) are the
 * cold-start fallback for the US-storefront external checkout flow — they
 * refresh the affected caches and land the user on the right screen.
 * `pricing` stays a no-op (not restored). Account-management paths
 * (`settings`, `billing`, `booths`, `alerts`) keep working.
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

	it("payment-success refreshes subscription state, selects the booth, and opens Booths", async () => {
		const { invalidateSpy } = await fireDeepLink(
			"boothiq://payment-success?booth_id=abc",
		);
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["payments", "access"],
		});
		// The always-200 state read backs the Settings card and details sheet —
		// a cold-start return from checkout must refresh it, or the booth the
		// user just paid for still reads as unsubscribed. Invalidated by prefix,
		// which partial-matches this booth and every other one.
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["payments", "boothSubscriptionState"],
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["booths", "detail", "abc"],
		});
		expect(mockSetSelectedBoothId).toHaveBeenCalledWith("abc");
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/booths");
		expect(alertSpy).toHaveBeenCalled();
	});

	it("refreshes per-booth state on the portal return, which carries no booth id", async () => {
		// boothiq://settings is the Stripe customer-portal return path. It has no
		// booth_id, and an earlier version early-returned before touching the
		// per-booth key — so after cancelling on the web, Settings kept showing
		// the old subscription for the full staleTime. Invalidate the prefix.
		const { invalidateSpy } = await fireDeepLink("boothiq://settings");

		// A prefix, which partial-matches every ['payments','boothSubscriptionState',<id>]
		// entry. Disabled instances parked on the "" sentinel are skipToken queries
		// (enabled: false), so React Query filters them out of the refetch itself.
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["payments", "boothSubscriptionState"],
		});
	});

	it("payment-success without booth_id still refreshes and navigates (no booth selection)", async () => {
		const { invalidateSpy } = await fireDeepLink("boothiq://payment-success");
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["payments", "access"],
		});
		expect(mockSetSelectedBoothId).not.toHaveBeenCalled();
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/booths");
	});

	it("payment-cancel informs the user but mutates nothing", async () => {
		const { invalidateSpy } = await fireDeepLink("boothiq://payment-cancel");
		expect(alertSpy).toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(mockSetSelectedBoothId).not.toHaveBeenCalled();
	});

	it("pricing stays a no-op (not restored)", async () => {
		const { invalidateSpy } = await fireDeepLink("boothiq://pricing");
		expect(mockReplace).not.toHaveBeenCalled();
		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(mockSetSelectedBoothId).not.toHaveBeenCalled();
	});

	it("template-purchase-success refreshes purchased templates and opens the store", async () => {
		const { invalidateSpy } = await fireDeepLink(
			"boothiq://template-purchase-success",
		);
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["templates", "purchased"],
		});
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/store");
		expect(alertSpy).toHaveBeenCalled();
	});

	it("template-purchase-cancel informs the user but mutates nothing", async () => {
		const { invalidateSpy } = await fireDeepLink(
			"boothiq://template-purchase-cancel",
		);
		expect(alertSpy).toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
		expect(invalidateSpy).not.toHaveBeenCalled();
	});

	it("settings triggers query invalidation AND navigates (license_* push taps)", async () => {
		const { qc } = mountHarness();
		await waitFor(() => expect(capturedHandler).not.toBeNull());
		const spy = jest.spyOn(qc, "invalidateQueries");
		capturedHandler!({ url: "boothiq://settings" });
		expect(spy).toHaveBeenCalled();
		// license_* pushes deep-link here — the tap must open the Settings tab.
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/settings");
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
