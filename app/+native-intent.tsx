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
 * return and passes through unchanged. For web URLs (verified Universal/App
 * Links, e.g. https://www.boothiq.com/redirect?...) the leading segment is the
 * first PATH segment after the host, not the host itself.
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

/**
 * Which screen to mount for the website's /redirect email dispatcher, by its
 * `target` param. Mirrors the routing in use-deep-links.ts, which performs
 * the precise navigation (incl. the transfer review screen) from the
 * original URL — mounting the transfers LIST here also keeps the accept
 * token out of navigation state as a search param.
 */
const REDIRECT_TARGET_SCREENS: Record<string, string> = {
	transfers: "/transfers",
	alerts: "/(tabs)/alerts",
	billing: "/(tabs)/settings",
	booths: "/(tabs)/booths",
	pricing: "/(tabs)/booths",
};

export function redirectSystemPath({
	path,
	initial,
}: {
	path: string;
	initial: boolean;
}): string {
	try {
		const isWebUrl = /^https?:\/\//i.test(path);
		const withoutScheme = path.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
		// Custom-scheme links put the "path" in the host position
		// (boothiq://transfers); web URLs have a real host to skip first.
		const afterHost = isWebUrl
			? withoutScheme.slice(withoutScheme.split(/[/?#]/, 1)[0].length)
			: withoutScheme;
		const leadingSegment = afterHost.replace(/^\/+/, "").split(/[/?#]/, 1)[0];

		// Own-property guard: a plain index would walk the prototype chain, so
		// an external link like boothiq://constructor would "match" and return
		// a function instead of a route.
		if (Object.hasOwn(CHECKOUT_RETURN_TABS, leadingSegment)) {
			return CHECKOUT_RETURN_TABS[leadingSegment];
		}
		// Transfer offer links carry the accept token as a query param. Mount
		// the bare list route so the token never enters navigation state as a
		// search param — use-deep-links still receives the ORIGINAL URL via
		// Linking and routes to the review screen with the validated token.
		//
		// WARM links (initial: false) return "" instead of a route: expo-router
		// ALSO navigates on whatever this function returns for warm URL events
		// (link/linking.js), which would race the hook's precise navigation and
		// stack the bare list on top of the review screen. A falsy return
		// suppresses the router's own navigation and leaves the hook as the
		// single navigator; on cold start the mounted route is needed to avoid
		// a flash of "Unmatched Route".
		if (leadingSegment === "transfers") {
			return initial ? "/transfers" : "";
		}
		// The website's email dispatcher delivered as a verified app link.
		if (leadingSegment === "redirect") {
			if (!initial) return "";
			const target = /[?&]target=([^&#]*)/.exec(path)?.[1] ?? "";
			return Object.hasOwn(REDIRECT_TARGET_SCREENS, target)
				? REDIRECT_TARGET_SCREENS[target]
				: "/(tabs)/booths";
		}
		return path;
	} catch {
		return "/";
	}
}
