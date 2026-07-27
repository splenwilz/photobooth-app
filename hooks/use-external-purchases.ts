/**
 * Single gate for every external-purchase affordance in the app.
 *
 * App Store Guideline 3.1.1(a): buttons/links to non-IAP purchasing are
 * permitted ONLY on the United States storefront; everywhere else the store
 * must stay browse-only with no calls to action. All purchase CTAs must
 * check `useExternalPurchases().enabled` — never the storefront directly —
 * so the policy (and the kill switch) lives in exactly one place.
 *
 * Fail-closed: unknown storefront, lookup error, or a disabled flag all
 * yield `enabled: false`.
 */

import { isExternalPurchasesFlagEnabled } from "@/constants/config";
import { useStorefront } from "@/hooks/use-storefront";

/** ISO 3166-1 alpha-3, as returned by StoreKit's Storefront.current. */
const US_STOREFRONT = "USA";

export function useExternalPurchases(): {
	enabled: boolean;
	isLoading: boolean;
} {
	const { countryCode, isLoading } = useStorefront();

	return {
		enabled: isExternalPurchasesFlagEnabled() && countryCode === US_STOREFRONT,
		isLoading,
	};
}
