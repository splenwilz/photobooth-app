/**
 * Rewrites system-delivered deep links that have no matching route.
 *
 * Expo Router routes every incoming URL; the external-checkout return links
 * (boothiq://payment-success etc.) are handled by use-deep-links.ts but have
 * no route file, so without this rewrite a cold-start return briefly renders
 * the "Unmatched Route" screen before the hook's navigation wins the race.
 * The hook still receives the ORIGINAL URL via Linking and performs the
 * cache invalidation + alerts; this only decides which screen the router
 * mounts underneath.
 *
 * @see https://docs.expo.dev/router/advanced/native-intent/
 */
export function redirectSystemPath({
	path,
}: {
	path: string;
	initial: boolean;
}): string {
	try {
		if (path.includes("payment-success") || path.includes("payment-cancel")) {
			return "/(tabs)/booths";
		}
		if (path.includes("template-purchase-")) {
			return "/(tabs)/store";
		}
		return path;
	} catch {
		return "/";
	}
}
