import { ApiError } from "../client";

/**
 * Operator timezone for server-side period aggregation.
 *
 * "Today / This Week / This Month / This Year" are sums the server computes,
 * and a sum has to be sliced on someone's midnight. Storage and individual
 * timestamps stay UTC; aggregates are requested in the operator's calendar by
 * passing the device's IANA zone as a `tz` query parameter (the server stores
 * nothing — it is a per-request instruction).
 *
 * The zone is read ONCE and cached module-level:
 * - query keys and requests always agree (no render-time vs fetch-time skew),
 * - no Intl.DateTimeFormat construction on every key computation,
 * - `refreshOperatorTz()` (called on app foreground by useTimezoneRefetch)
 *   is the single place a zone change enters the system.
 *
 * Source order matters: Hermes caches the Intl zone at engine startup and
 * does not see OS zone changes until app restart (facebook/react-native
 * #17958), so the native calendar read from expo-localization is preferred;
 * Intl is the fallback (e.g. dev clients built before the native module was
 * added, web).
 *
 * @see https://docs.expo.dev/versions/latest/sdk/localization/
 */

let cachedTz: string | null = null;

function readNativeZone(): string | null {
	try {
		// Lazy require: survives environments where the native module is not
		// linked (older dev-client builds) by falling through to Intl.
		const Localization = require("expo-localization");
		return Localization.getCalendars?.()?.[0]?.timeZone ?? null;
	} catch {
		return null;
	}
}

function readIntlZone(): string | null {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
	} catch {
		return null;
	}
}

function computeOperatorTz(): string {
	const tz = readNativeZone() ?? readIntlZone();
	// Never let a device quirk turn into a 400 (server caps tz at 64 chars).
	return tz && tz.length <= 64 ? tz : "UTC";
}

/** The operator's IANA zone (cached; see refreshOperatorTz). */
export function operatorTz(): string {
	if (cachedTz === null) cachedTz = computeOperatorTz();
	return cachedTz;
}

/**
 * Re-read the device zone (call on app foreground — travelers cross zones
 * with the app backgrounded). Returns the fresh value.
 */
export function refreshOperatorTz(): string {
	cachedTz = computeOperatorTz();
	return cachedTz;
}

/**
 * Run a request with the operator zone; if the API rejects the zone name
 * (stale tzdata on a weird device → 400 "Unknown IANA timezone"), retry once
 * with UTC rather than failing the screen. Note the retry's payload is
 * cached under the zone-keyed query entry — acceptable because the fallback
 * is deterministic per zone, so the cache stays self-consistent.
 */
export async function withTzFallback<T>(
	request: (tz: string) => Promise<T>,
): Promise<T> {
	const tz = operatorTz();
	try {
		return await request(tz);
	} catch (error) {
		if (
			tz !== "UTC" &&
			error instanceof ApiError &&
			(error.status === 400 || error.status === 422) &&
			/timezone/i.test(error.message)
		) {
			return request("UTC");
		}
		throw error;
	}
}
