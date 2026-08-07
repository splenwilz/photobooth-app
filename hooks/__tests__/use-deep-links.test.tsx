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

// Use the REAL expo-linking `parse` (it is pure JS — no native module) so
// these tests exercise production parsing semantics. A hand-rolled mock
// previously modelled none of the real behaviour (percent-decode failures,
// ports, userinfo, `+` truncation) and so could not represent the bypasses
// this suite is meant to guard.
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
	// requireActual inside the factory — jest hoists this above module scope.
	parse: (url: string) => jest.requireActual("expo-linking").parse(url),
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
import { queryKeys } from "@/api/utils/query-keys";
import {
	clearTransferTokens,
	getTransferToken,
} from "@/api/transfers/token-handoff";

const mockReplace = router.replace as jest.Mock;
const mockNavigate = router.navigate as jest.Mock;

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
		clearTransferTokens();
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
			"boothiq://payment-success?booth_id=1d0c6f2e-1234-4abc-9def-0123456789ab",
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
			queryKey: queryKeys.booths.detailPrefix("1d0c6f2e-1234-4abc-9def-0123456789ab"),
		});
		expect(mockSetSelectedBoothId).toHaveBeenCalledWith("1d0c6f2e-1234-4abc-9def-0123456789ab");
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

	// transfers routes NAVIGATE (not replace/push): they live outside (tabs)
	// so replace would leave no back stack, and navigate unwinds to an
	// existing instance instead of stacking duplicates on repeated taps.
	it("transfers opens the offers list (navigate) and refreshes it", async () => {
		const { invalidateSpy } = await fireDeepLink("boothiq://transfers");
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: queryKeys.transfers.list(),
		});
		expect(mockNavigate).toHaveBeenCalledWith("/transfers");
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it("transfers with a transfer_id stashes the token (never a nav param) and opens the review screen", async () => {
		const id = "6f0c6f2e-1234-4abc-9def-0123456789ab";
		await fireDeepLink(
			`boothiq://transfers?transfer_id=${id}&token=secret-tok`,
		);
		// The token must not enter the href — expo-router persists the path
		// incl. query string on route.path in navigation state.
		expect(mockNavigate).toHaveBeenCalledWith({
			pathname: "/transfers/[transferId]",
			params: { transferId: id },
		});
		expect(getTransferToken(id)).toBe("secret-tok");
	});

	it("transfers with a non-UUID transfer_id falls back to the list (untrusted input)", async () => {
		await fireDeepLink(
			"boothiq://transfers?transfer_id=..%2F..%2Fetc&token=x",
		);
		expect(mockNavigate).toHaveBeenCalledWith("/transfers");
	});

	it("transfers with an oversized token drops the token but still opens the review screen", async () => {
		const id = "7a0c6f2e-1234-4abc-9def-0123456789ab";
		const bigToken = "x".repeat(600);
		await fireDeepLink(
			`boothiq://transfers?transfer_id=${id}&token=${bigToken}`,
		);
		expect(mockNavigate).toHaveBeenCalledWith({
			pathname: "/transfers/[transferId]",
			params: { transferId: id },
		});
		expect(getTransferToken(id)).toBeNull();
	});

	// Verified Universal/App Links deliver the website's /redirect dispatcher
	// URL straight to the app — its `target` must route like the matching
	// boothiq:// links.
	it("https /redirect with target=transfers stashes the token and routes the review screen", async () => {
		const id = "8b0c6f2e-1234-4abc-9def-0123456789ab";
		await fireDeepLink(
			`https://boothiq.com/redirect?target=transfers&transfer_id=${id}&token=tok`,
		);
		expect(mockNavigate).toHaveBeenCalledWith({
			pathname: "/transfers/[transferId]",
			params: { transferId: id },
		});
		expect(getTransferToken(id)).toBe("tok");
	});

	it("https /redirect tolerates a trailing slash", async () => {
		await fireDeepLink("https://www.boothiq.com/redirect/?target=alerts");
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/alerts");
	});

	it("https /redirect with target=booths selects a UUID booth and opens the Booths tab", async () => {
		const boothId = "9c0c6f2e-1234-4abc-9def-0123456789ab";
		await fireDeepLink(
			`https://boothiq.com/redirect?target=booths&booth_id=${boothId}`,
		);
		expect(mockSetSelectedBoothId).toHaveBeenCalledWith(boothId);
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/booths");
	});

	it("https /redirect with an unknown target lands on the Booths tab", async () => {
		await fireDeepLink("https://boothiq.com/redirect?target=mystery");
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/booths");
	});

	// Android explicit intents deliver arbitrary https URLs regardless of the
	// verified intent filter — only OUR hosts may route as the dispatcher.
	it("drops https links from foreign hosts entirely", async () => {
		const id = "6f0c6f2e-1234-4abc-9def-0123456789ab";
		const { invalidateSpy } = await fireDeepLink(
			`https://evil.com/redirect?target=transfers&transfer_id=${id}&token=stolen`,
		);
		expect(mockNavigate).not.toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(getTransferToken(id)).toBeNull();
	});

	it("drops boothiq://redirect — the dispatcher is only reachable over https", async () => {
		await fireDeepLink("boothiq://redirect?target=transfers");
		expect(mockNavigate).not.toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it("ignores a non-UUID booth_id from a link (would reach API paths and the persisted store)", async () => {
		await fireDeepLink("boothiq://booths?booth_id=..%2F..%2Fadmin");
		expect(mockSetSelectedBoothId).not.toHaveBeenCalled();
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/booths");
	});

	// expo-linking's parse collects queryParams BEFORE scheme/hostname inside
	// one try block, so a malformed escape throws mid-parse and yields
	// {scheme: null, hostname: null, path: <raw url>} with the attacker's
	// params already collected. Trusting the parsed scheme there would let a
	// foreign https URL skip the host allowlist via the custom-scheme lane.
	it("drops a foreign https link whose malformed query defeats the parser", async () => {
		const id = "6f0c6f2e-1234-4abc-9def-0123456789ab";
		const { invalidateSpy } = await fireDeepLink(
			`https://evil.com/?transfer_id=${id}&token=STOLEN&z=%&q=+transfers`,
		);
		expect(mockNavigate).not.toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(getTransferToken(id)).toBeNull();
	});

	// WHATWG URL strips leading C0-control/space characters and removes
	// embedded tab/CR/LF, so a raw string that does NOT match /^https?:/
	// can still parse as a perfectly good https URL. Web-ness must be
	// asserted from EITHER signal, or the raw check becomes a lane that
	// skips the host allowlist entirely.
	it.each([
		[" leading space", " https://evil.com/redirect"],
		["embedded newline in scheme", "ht\ntps://evil.com/redirect"],
		["embedded tab in scheme", "ht\ttps://evil.com/redirect"],
	])("drops a foreign https link disguised by %s", async (_label, prefix) => {
		const id = "6f0c6f2e-1234-4abc-9def-0123456789ab";
		const { invalidateSpy } = await fireDeepLink(
			`${prefix}?target=transfers&transfer_id=${id}&token=STOLEN`,
		);
		expect(mockNavigate).not.toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
		expect(invalidateSpy).not.toHaveBeenCalled();
		expect(getTransferToken(id)).toBeNull();
	});

	it("still routes an allowlisted https link with incidental leading whitespace", async () => {
		await fireDeepLink(" https://www.boothiq.com/redirect?target=alerts");
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/alerts");
	});

	it("drops a link whose path isn't a bare route segment", async () => {
		// The parse catch-path puts the whole raw URL in `path`; only single
		// segments may reach the switch.
		const { invalidateSpy } = await fireDeepLink("boothiq://a/b/transfers");
		expect(mockNavigate).not.toHaveBeenCalled();
		expect(invalidateSpy).not.toHaveBeenCalled();
	});

	it("allows an allowlisted host regardless of case", async () => {
		await fireDeepLink("HTTPS://WWW.BOOTHIQ.COM/redirect?target=alerts");
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/alerts");
	});
});
