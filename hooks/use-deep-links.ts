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
import { queryKeys } from "@/api/utils/query-keys";
import { useBoothStore } from "@/stores/booth-store";

/** Refresh subscription/access data (used by the settings + billing routes). */
function invalidatePaymentQueries(queryClient: QueryClient): void {
	queryClient.invalidateQueries({ queryKey: queryKeys.payments.access() });
	queryClient.invalidateQueries({ queryKey: queryKeys.payments.subscription() });
}

/**
 * Route a single `boothiq://` deep link to the right screen and refresh any
 * data that screen depends on.
 *
 * Extracted so BOTH incoming universal links (`useDeepLinks`) and tapped push
 * notifications (`usePushNotifications`) route identically — the push payload's
 * `data.deep_link` is one of these same URLs.
 *
 * @param url - a `boothiq://...` URL
 * @param queryClient - the active React Query client for cache invalidation
 */
export function routeDeepLink(url: string, queryClient: QueryClient): void {
	if (!url) return;

	try {
		const parsed = Linking.parse(url);
		// `||` (not `??`) so an empty-string path (trailing-slash URL) falls back
		// to the hostname instead of dropping the link.
		const path = parsed.path || parsed.hostname;

		if (__DEV__) {
			// Checkout return URLs carry Stripe session ids — never log in prod.
			console.log("[DeepLink] Received:", url);
			console.log("[DeepLink] Parsed path:", path);
		}

		switch (path) {
			case "settings":
				// Two callers land here: returning from the Stripe customer portal,
				// and `license_*` push taps (contract routes those to boothiq://settings).
				// Refresh subscription data AND navigate, so the push tap opens Settings.
				invalidatePaymentQueries(queryClient);
				router.replace("/(tabs)/settings");
				break;

			// Email notification / push deep links
			case "booths": {
				const targetBoothId = parsed.queryParams?.booth_id as
					| string
					| undefined;
				if (targetBoothId) {
					useBoothStore.getState().setSelectedBoothId(targetBoothId);
					queryClient.invalidateQueries({
						queryKey: queryKeys.booths.detail(targetBoothId),
					});
				}
				router.replace("/(tabs)/booths");
				break;
			}

			case "alerts":
				router.replace("/(tabs)/alerts");
				break;

			case "billing":
				invalidatePaymentQueries(queryClient);
				router.replace("/(tabs)/settings");
				break;

			// External checkout returns (US storefront) — cold-start fallback for
			// the auth-session interception in the purchase hooks.
			case "payment-success": {
				const boothId = parsed.queryParams?.booth_id as string | undefined;
				invalidatePaymentQueries(queryClient);
				queryClient.invalidateQueries({
					queryKey: queryKeys.payments.boothSubscriptions(),
				});
				if (boothId) {
					queryClient.invalidateQueries({
						queryKey: queryKeys.payments.boothSubscription(boothId),
					});
					queryClient.invalidateQueries({
						queryKey: queryKeys.booths.detail(boothId),
					});
					useBoothStore.getState().setSelectedBoothId(boothId);
				}
				router.replace("/(tabs)/booths");
				// Deep links are spoofable by any app — assert only what we know:
				// the server-side refresh will surface the real state.
				Alert.alert(
					"Checkout Complete",
					"We're updating your subscription status.",
				);
				break;
			}

			case "payment-cancel":
				Alert.alert("Checkout Canceled", "Your subscription was not started.");
				break;

			case "template-purchase-success":
				queryClient.invalidateQueries({
					queryKey: queryKeys.templates.purchasedAll(),
				});
				router.replace("/(tabs)/store");
				Alert.alert("Checkout Complete", "We're updating your purchases.");
				break;

			case "template-purchase-cancel":
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
