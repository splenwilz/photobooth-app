/**
 * Deep Link Handler Hook
 *
 * Handles deep link callbacks from Stripe checkout, customer portal,
 * and email notification redirects.
 *
 * Supported URLs:
 * - boothiq://payment-success - Stripe checkout completed
 * - boothiq://payment-cancel - Stripe checkout cancelled
 * - boothiq://settings - Return from customer portal
 * - boothiq://template-purchase-success - Template checkout completed
 * - boothiq://template-purchase-cancel - Template checkout cancelled
 * - boothiq://booths - Navigate to booths (optional booth_id param)
 * - boothiq://alerts - Navigate to alerts
 * - boothiq://pricing - Navigate to pricing/subscription settings
 * - boothiq://billing - Navigate to billing settings
 *
 * @see https://docs.expo.dev/guides/linking/
 */

import { useEffect, useCallback } from "react";
import * as Linking from "expo-linking";
import { useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { router } from "expo-router";
import { queryKeys } from "@/api/utils/query-keys";
import { useCartStore } from "@/stores/cart-store";
import { useBoothStore } from "@/stores/booth-store";

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
		({ url }: { url: string }) => {
			if (!url) return;

			try {
				const parsed = Linking.parse(url);
				const path = parsed.path ?? parsed.hostname;

				console.log("[DeepLink] Received:", url);
				console.log("[DeepLink] Parsed path:", path);

				switch (path) {
					case "payment-success": {
						// Extract query params for more targeted invalidation
						const sessionId = parsed.queryParams?.session_id as string | undefined;
						const boothId = parsed.queryParams?.booth_id as string | undefined;

						// Invalidate subscription queries to refresh status
						queryClient.invalidateQueries({
							queryKey: queryKeys.payments.access(),
						});
						queryClient.invalidateQueries({
							queryKey: queryKeys.payments.subscription(),
						});

						// If booth-specific, also invalidate booth queries and select the booth
						if (boothId) {
							queryClient.invalidateQueries({
								queryKey: queryKeys.booths.detail(boothId),
							});
							queryClient.invalidateQueries({
								queryKey: queryKeys.payments.boothSubscription(boothId),
							});
							// Select the subscribed booth as active
							useBoothStore.getState().setSelectedBoothId(boothId);
						}

						// Navigate to booths tab
						router.replace("/(tabs)/booths");

						Alert.alert(
							"Payment Successful",
							"Your subscription has been activated!",
							[{ text: "OK" }],
						);
						break;
					}

					case "payment-cancel":
						Alert.alert(
							"Payment Cancelled",
							"Your payment was cancelled. You can try again anytime.",
							[{ text: "OK" }],
						);
						break;

					case "settings":
						// Return from customer portal - refresh subscription data
						queryClient.invalidateQueries({
							queryKey: queryKeys.payments.access(),
						});
						queryClient.invalidateQueries({
							queryKey: queryKeys.payments.subscription(),
						});
						break;

					case "template-purchase-success":
						// Invalidate purchased templates query
						queryClient.invalidateQueries({
							queryKey: ["templates", "purchased"],
						});
						// Clear cart after successful purchase
						useCartStore.getState().clearCart();

						// Navigate to store immediately so user doesn't see empty cart
						router.replace("/store");

						Alert.alert(
							"Purchase Successful",
							"Your templates are ready! Check your purchased templates.",
							[{ text: "OK" }],
						);
						break;

					case "template-purchase-cancel":
						Alert.alert(
							"Purchase Cancelled",
							"Your cart items are still saved. You can try again anytime.",
							[{ text: "OK" }],
						);
						break;

					// Email notification deep links
					case "booths": {
						const targetBoothId = parsed.queryParams?.booth_id as string | undefined;
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

					case "pricing":
						router.replace("/(tabs)/settings");
						break;

					case "billing":
						queryClient.invalidateQueries({
							queryKey: queryKeys.payments.subscription(),
						});
						queryClient.invalidateQueries({
							queryKey: queryKeys.payments.access(),
						});
						router.replace("/(tabs)/settings");
						break;

					default:
						// Unknown path - ignore
						break;
				}
			} catch (error) {
				console.error("[DeepLink] Error parsing URL:", error);
			}
		},
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
