/**
 * App Store storefront lookup.
 *
 * The compliance boundary for external purchase links is the storefront the
 * user's Apple Account is signed into — NOT device locale, region format, or
 * IP address (Guideline 3.1.1(a) applies per storefront). StoreKit's
 * `Storefront.current` is the authoritative signal; expo-iap exposes it as
 * `getStorefront()`, returning an ISO 3166-1 alpha-3 code (e.g. "USA").
 *
 * Successful lookups are cached for the app session (the storefront only
 * changes if the user switches Apple Account store region). Failures are NOT
 * cached so a transient error at cold start can recover on a later mount —
 * callers treat `null` as "unknown storefront" and must fail closed.
 */

import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { getStorefront } from "expo-iap";

let cachedCountryCode: string | null = null;
let inflight: Promise<string | null> | null = null;

/** Test-only: clear the session cache between cases. */
export function __resetStorefrontCacheForTests(): void {
	cachedCountryCode = null;
	inflight = null;
}

/**
 * Resolve the storefront country code (alpha-3, uppercase), or `null` when
 * it cannot be determined (unsupported platform, native error, empty result).
 * Concurrent callers share one native call; successes are cached.
 */
export function getStorefrontCountry(): Promise<string | null> {
	// External purchases are an Apple-storefront feature (Guideline 3.1.1(a)).
	// On Android, getStorefront() needs a Play Billing connection and returns
	// alpha-2 codes — deliberately unsupported here: resolve null (gate stays
	// closed) without touching the native module.
	if (Platform.OS !== "ios") return Promise.resolve(null);

	if (cachedCountryCode) return Promise.resolve(cachedCountryCode);

	if (!inflight) {
		inflight = getStorefront()
			.then((code) => {
				const normalized =
					typeof code === "string" ? code.trim().toUpperCase() : "";
				cachedCountryCode = normalized.length > 0 ? normalized : null;
				if (__DEV__) {
					console.log(
						`[Storefront] App Store storefront: ${cachedCountryCode ?? "unknown"} — external purchases ${cachedCountryCode === "USA" ? "ALLOWED" : "hidden (non-US)"}`,
					);
				}
				return cachedCountryCode;
			})
			.catch((error) => {
				console.warn("[Storefront] Lookup failed:", error);
				return null;
			})
			.finally(() => {
				inflight = null;
			});
	}

	return inflight;
}

/**
 * React view of the storefront. `countryCode` is `null` until resolved (and
 * stays `null` on failure); `isLoading` distinguishes "unknown yet" from
 * "unknown, lookup finished".
 */
export function useStorefront(): {
	countryCode: string | null;
	isLoading: boolean;
} {
	const [state, setState] = useState<{
		countryCode: string | null;
		isLoading: boolean;
	}>(() => ({
		countryCode: cachedCountryCode,
		isLoading: cachedCountryCode === null,
	}));

	useEffect(() => {
		if (state.countryCode !== null) return;

		let mounted = true;
		getStorefrontCountry().then((countryCode) => {
			if (mounted) setState({ countryCode, isLoading: false });
		});
		return () => {
			mounted = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount
	}, []);

	return state;
}
