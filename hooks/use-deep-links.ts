/**
 * Deep Link Handler Hook
 *
 * Handles deep link callbacks from the Stripe customer portal and
 * email notification redirects. The iOS app does NOT initiate purchases,
 * so payment-success / payment-cancel / template-purchase-* / pricing
 * deep links are intentionally absent.
 *
 * Supported URLs:
 * - boothiq://settings - Return from customer portal
 * - boothiq://booths - Navigate to booths (optional booth_id param)
 * - boothiq://alerts - Navigate to alerts
 * - boothiq://billing - Navigate to billing settings
 *
 * @see https://docs.expo.dev/guides/linking/
 */

import { useEffect, useCallback } from "react";
import * as Linking from "expo-linking";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { queryKeys } from "@/api/utils/query-keys";
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
					case "settings":
						// Return from customer portal - refresh subscription data
						queryClient.invalidateQueries({
							queryKey: queryKeys.payments.access(),
						});
						queryClient.invalidateQueries({
							queryKey: queryKeys.payments.subscription(),
						});
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
