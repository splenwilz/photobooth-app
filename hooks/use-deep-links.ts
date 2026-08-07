/**
 * Deep Link Handler Hook
 *
 * Handles deep link callbacks from Stripe checkout/customer portal and
 * email notification redirects.
 *
 * The payment-* / template-purchase-* URLs are the COLD-START fallback for
 * the US-storefront external checkout flow: normally the in-app auth-session
 * browser intercepts the redirect (use-template-purchase.ts,
 * PricingPlansSelector), but if the user killed the app mid-checkout the OS
 * delivers the link here instead. Both paths perform the same idempotent
 * cache invalidation.
 *
 * Supported URLs:
 * - boothiq://settings - Return from customer portal / license_* push taps
 * - boothiq://booths - Navigate to booths (optional booth_id param)
 * - boothiq://alerts - Navigate to alerts
 * - boothiq://billing - Navigate to billing settings
 * - boothiq://transfers - Incoming booth-transfer offers (optional
 *   transfer_id + token params open the review screen; the token is the
 *   accept credential and only ever travels in the accept POST body)
 * - https://www.boothiq.com/redirect?target=... - the website's email deep-link
 *   dispatcher, delivered to the app via verified Universal/App Links; its
 *   target param routes like the matching boothiq:// links above
 * - boothiq://payment-success?booth_id= - Subscription checkout completed
 * - boothiq://payment-cancel - Subscription checkout abandoned
 * - boothiq://template-purchase-success - Template checkout completed
 * - boothiq://template-purchase-cancel - Template checkout abandoned
 *
 * @see https://docs.expo.dev/guides/linking/
 */

import { useEffect, useCallback } from "react";
import * as Linking from "expo-linking";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert } from "react-native";
import { invalidateBoothBillingQueries } from "@/api/payments";
import { stashTransferToken } from "@/api/transfers/token-handoff";
import { queryKeys } from "@/api/utils/query-keys";
import { CHECKOUT_RETURN_PATHS, EXTERNAL_PURCHASES } from "@/constants/config";
import { useBoothStore } from "@/stores/booth-store";

/**
 * Refresh subscription/access data (used by the settings + billing routes).
 *
 * Delegates to the shared helper so every payments key stays in one place — the
 * per-booth state read was previously missed here, leaving a user who had just
 * paid looking at "No active subscription".
 */
function invalidatePaymentQueries(queryClient: QueryClient): void {
	invalidateBoothBillingQueries(queryClient);
}

/**
 * Booth and transfer ids are UUIDs; anything else in a link is not ours to
 * route. Link params are untrusted external input, and an unvalidated id
 * would flow into API URL paths and the persisted booth store.
 */
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Accept tokens are opaque; cap length defensively (matches the web dispatcher). */
const MAX_TRANSFER_TOKEN_LENGTH = 512;

/**
 * Hosts whose https links we treat as our own website dispatcher. Hardcoded
 * on purpose: deriving this from EXPO_PUBLIC_WEBSITE_URL would let a dev
 * .env value (ngrok) become the trust anchor in a production bundle via an
 * eas update. Android explicit intents bypass intent-filter verification
 * entirely, so any app can deliver an arbitrary https URL to us — the OS
 * check on `applinks`/`autoVerify` domains is NOT a guarantee about `url`.
 * In dev, the current WEBSITE_URL host is unioned in so tunnel links route.
 */
const APP_LINK_HOSTS = ["boothiq.com", "www.boothiq.com"];

function isAllowedLinkHost(hostname: string | null | undefined): boolean {
	if (!hostname) return false;
	const host = hostname.toLowerCase();
	if (APP_LINK_HOSTS.includes(host)) return true;
	if (__DEV__) {
		try {
			const devHost = new URL(
				EXTERNAL_PURCHASES.WEBSITE_URL,
			).hostname.toLowerCase();
			return host === devHost;
		} catch {
			return false;
		}
	}
	return false;
}

/**
 * Defensive first-value pick: expo-linking's types declare queryParams
 * values as `string | string[]`, so validation must run on a string, never
 * on an array's coerced form. (The current parser implementation keeps the
 * last duplicate as a plain string, so the array branch is types-driven
 * belt-and-braces.)
 */
function firstParam(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

/**
 * Validate and apply a link-supplied booth id: select the booth and refresh
 * its detail. Non-UUID values are dropped — the id would otherwise reach
 * API URL paths and be persisted to the booth store.
 */
function selectBoothFromLink(
	boothId: string | undefined,
	queryClient: QueryClient,
): void {
	if (!boothId || !UUID_RE.test(boothId)) return;
	useBoothStore.getState().setSelectedBoothId(boothId);
	queryClient.invalidateQueries({
		queryKey: queryKeys.booths.detailPrefix(boothId),
	});
}

/**
 * Route a transfer link (buyer side). With a valid transfer_id the review
 * screen opens. All params are untrusted input from an external link: the
 * id must be a UUID and the token is length-capped (matching the web
 * dispatcher's validation).
 *
 * The token NEVER enters the href — expo-router keeps the original path
 * (query string included) on `route.path` in navigation state, where
 * setParams can't clear it. It goes through the in-memory handoff instead;
 * the review screen SUBSCRIBES to that store, because navigating to an
 * already-focused route emits no focus event.
 *
 * `navigate`, not `push`/`replace`: transfers screens live outside `(tabs)`
 * (replace would leave no back stack), and navigate unwinds to an existing
 * instance of the same transfer instead of stacking duplicates when the
 * same email link or push is tapped repeatedly.
 *
 * Shared by the `boothiq://transfers` deep link and the website's
 * `/redirect?target=transfers` universal link.
 */
function routeTransferLink(
	queryParams: Record<string, string | string[] | undefined> | null | undefined,
	queryClient: QueryClient,
): void {
	const transferId = firstParam(queryParams?.transfer_id);
	queryClient.invalidateQueries({
		queryKey: queryKeys.transfers.list(),
	});
	if (transferId && UUID_RE.test(transferId)) {
		const token = firstParam(queryParams?.token);
		if (token && token.length <= MAX_TRANSFER_TOKEN_LENGTH) {
			stashTransferToken(transferId, token);
		}
		router.navigate({
			pathname: "/transfers/[transferId]",
			params: { transferId },
		});
	} else {
		router.navigate("/transfers");
	}
}

/**
 * Route a single `boothiq://` deep link to the right screen and refresh any
 * data that screen depends on.
 *
 * Extracted so BOTH incoming universal links (`useDeepLinks`) and tapped push
 * notifications (`usePushNotifications`) route identically — the push payload's
 * `data.deep_link` is one of these same URLs.
 *
 * @param url - a `boothiq://...` URL, or an `https://.../redirect` universal link
 * @param queryClient - the active React Query client for cache invalidation
 */
export function routeDeepLink(url: string, queryClient: QueryClient): void {
	if (!url) return;

	try {
		const parsed = Linking.parse(url);
		const scheme = parsed.scheme?.toLowerCase();

		// Assert web-ness on the RAW string, not the parsed scheme.
		// `Linking.parse` populates queryParams BEFORE scheme/hostname inside
		// one try block (expo-linking createURL.js), so a malformed escape
		// anywhere in the query (`&z=%`) throws mid-parse and yields
		// {scheme: null, hostname: null, path: <the whole raw URL>} with the
		// attacker's params already collected. Trusting `parsed.scheme` there
		// would let an https://evil.com/... URL slip into the custom-scheme
		// lane and skip the host allowlist entirely.
		const looksWebLink = /^https?:/i.test(url);
		const isWebLink = scheme === "http" || scheme === "https";

		// A web link is only ours if it points at OUR website. Android
		// explicit intents deliver arbitrary https URLs to the app regardless
		// of the verified intent filter, so https://evil.com/redirect?...
		// would otherwise route as if it came from boothiq.com.
		if (looksWebLink && !(isWebLink && isAllowedLinkHost(parsed.hostname))) {
			return;
		}

		// `||` (not `??`) so an empty-string path (trailing-slash URL) falls
		// back to the hostname instead of dropping the link. Trailing slashes
		// are stripped so /redirect/ routes like /redirect.
		const path = (parsed.path || parsed.hostname || "").replace(/\/+$/, "");

		// Every route we handle is a single bare segment. Anything else is a
		// parse artifact (the raw URL on the catch path, a `+`-truncated
		// remainder, a nested path) and must not reach the switch.
		if (!/^[a-z][a-z0-9-]*$/i.test(path)) return;

		if (__DEV__) {
			// Path only, never the full URL: checkout returns carry Stripe
			// session ids and transfer links carry the accept token (a bearer
			// credential) — neither belongs in logcat/Console even in dev.
			console.log("[DeepLink] Parsed path:", path);
		}

		// The /redirect dispatcher is by definition a web URL; a custom-scheme
		// boothiq://redirect has no legitimate sender and is dropped so the
		// host allowlist above can't be sidestepped via the scheme.
		if (path === "redirect" && !isWebLink) return;

		switch (path) {
			case "settings":
				// Two callers land here: returning from the Stripe customer portal,
				// and `license_*` push taps (contract routes those to boothiq://settings).
				// Refresh subscription data AND navigate, so the push tap opens Settings.
				invalidatePaymentQueries(queryClient);
				router.replace("/(tabs)/settings");
				break;

			// Email notification / push deep links
			case "booths":
				selectBoothFromLink(
					firstParam(parsed.queryParams?.booth_id),
					queryClient,
				);
				router.replace("/(tabs)/booths");
				break;

			case "alerts":
				router.replace("/(tabs)/alerts");
				break;

			// Booth-transfer offers (buyer side)
			case "transfers":
				routeTransferLink(parsed.queryParams, queryClient);
				break;

			// The website's email deep-link dispatcher, delivered directly to
			// the app via verified Universal/App Links
			// (https://www.boothiq.com/redirect?target=...). Map `target` the same
			// way the web dispatcher does; unknown targets land on Booths.
			case "redirect": {
				const target = firstParam(parsed.queryParams?.target);
				switch (target) {
					case "transfers":
						routeTransferLink(parsed.queryParams, queryClient);
						break;
					case "alerts":
						router.replace("/(tabs)/alerts");
						break;
					case "billing":
						invalidatePaymentQueries(queryClient);
						router.replace("/(tabs)/settings");
						break;
					default:
						// booths / pricing / anything unrecognized
						selectBoothFromLink(
							firstParam(parsed.queryParams?.booth_id),
							queryClient,
						);
						router.replace("/(tabs)/booths");
						break;
				}
				break;
			}

			case "billing":
				invalidatePaymentQueries(queryClient);
				router.replace("/(tabs)/settings");
				break;

			// External checkout returns (US storefront) — cold-start fallback for
			// the auth-session interception in the purchase hooks.
			case CHECKOUT_RETURN_PATHS.PAYMENT_SUCCESS: {
				invalidateBoothBillingQueries(queryClient);
				selectBoothFromLink(
					firstParam(parsed.queryParams?.booth_id),
					queryClient,
				);
				router.replace("/(tabs)/booths");
				// Deep links are spoofable by any app — assert only what we know:
				// the server-side refresh will surface the real state.
				Alert.alert(
					"Checkout Complete",
					"We're updating your subscription status.",
				);
				break;
			}

			case CHECKOUT_RETURN_PATHS.PAYMENT_CANCEL:
				Alert.alert("Checkout Canceled", "Your subscription was not started.");
				break;

			case CHECKOUT_RETURN_PATHS.TEMPLATE_PURCHASE_SUCCESS:
				queryClient.invalidateQueries({
					queryKey: queryKeys.templates.purchasedAll(),
				});
				router.replace("/(tabs)/store");
				Alert.alert("Checkout Complete", "We're updating your purchases.");
				break;

			case CHECKOUT_RETURN_PATHS.TEMPLATE_PURCHASE_CANCEL:
				Alert.alert("Checkout Canceled", "Your template was not purchased.");
				break;

			default:
				// Unknown path - ignore
				break;
		}
	} catch (error) {
		console.error("[DeepLink] Error parsing URL:", error);
	}
}

/**
 * Hook to handle all app deep links
 *
 * Listens for deep link events and routes to the appropriate screen.
 *
 * @example
 * // In _layout.tsx
 * export default function RootLayout() {
 *   useDeepLinks();
 *   // ...
 * }
 */
export function useDeepLinks() {
	const queryClient = useQueryClient();

	const handleDeepLink = useCallback(
		({ url }: { url: string }) => routeDeepLink(url, queryClient),
		[queryClient],
	);

	useEffect(() => {
		// Listen for incoming links while app is open
		const subscription = Linking.addEventListener("url", handleDeepLink);

		// Handle initial URL if app was opened via deep link
		Linking.getInitialURL()
			.then((url) => {
				if (url) {
					handleDeepLink({ url });
				}
			})
			.catch((error) => {
				console.error("[DeepLink] Error getting initial URL:", error);
			});

		return () => {
			subscription.remove();
		};
	}, [handleDeepLink]);
}
