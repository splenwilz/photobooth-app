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
 * Matching is on the LEADING path segment only — a URL that merely contains
 * "payment-success" in a query param or deeper segment is not a checkout
 * return and passes through unchanged.
 *
 * @see https://docs.expo.dev/router/advanced/native-intent/
 */
import { CHECKOUT_RETURN_PATHS } from "@/constants/config";

const CHECKOUT_RETURN_TABS: Record<string, string> = {
	[CHECKOUT_RETURN_PATHS.PAYMENT_SUCCESS]: "/(tabs)/booths",
	[CHECKOUT_RETURN_PATHS.PAYMENT_CANCEL]: "/(tabs)/booths",
	[CHECKOUT_RETURN_PATHS.TEMPLATE_PURCHASE_SUCCESS]: "/(tabs)/store",
	[CHECKOUT_RETURN_PATHS.TEMPLATE_PURCHASE_CANCEL]: "/(tabs)/store",
};

export function redirectSystemPath({
	path,
}: {
	path: string;
	initial: boolean;
}): string {
	try {
		const withoutScheme = path.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
		const leadingSegment = withoutScheme
			.replace(/^\/+/, "")
			.split(/[/?#]/, 1)[0];
		// Own-property guard: a plain index would walk the prototype chain, so
		// an external link like boothiq://constructor would "match" and return
		// a function instead of a route.
		return Object.hasOwn(CHECKOUT_RETURN_TABS, leadingSegment)
			? CHECKOUT_RETURN_TABS[leadingSegment]
			: path;
	} catch {
		return "/";
	}
}
