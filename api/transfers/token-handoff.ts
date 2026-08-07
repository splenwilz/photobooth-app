/**
 * Transfer accept-token handoff.
 *
 * The accept token is a bearer credential. It must never ride in a route
 * href: expo-router stores the original path INCLUDING the query string on
 * `route.path` in navigation state (fork/getStateFromPath.js), where
 * `setParams` cannot clear it and navigation-instrumented telemetry could
 * capture it. The deep-link handler stashes the token here and navigates
 * with the transfer id only; the review screen subscribes for it.
 *
 * This is a subscribable store, not a bare map, because navigation focus is
 * NOT a usable signal for "a link just landed": `router.navigate` to an
 * already-focused route replaces it in place with the same key
 * (expo-router StackClient), and React Navigation only emits `focus` when
 * the focused key changes — so a re-tapped or resent link would never reach
 * a mounted screen. Subscribers are notified on every stash instead.
 *
 * Process-memory only — nothing here touches disk, and the map dies with
 * the JS context. Tokens are kept (not consumed) on read so backing out of
 * the review screen and returning still allows accepting; a resend simply
 * overwrites with the fresh token.
 */

/**
 * Bounded so a spam of crafted links can't grow the map without limit.
 * Realistically only a handful of offers are ever in flight; the oldest
 * entry is evicted first.
 */
const MAX_STASHED_TOKENS = 8;

const tokensByTransferId = new Map<string, string>();
const listeners = new Set<() => void>();

function notify(): void {
	for (const listener of listeners) listener();
}

export function stashTransferToken(transferId: string, token: string): void {
	// Re-insert so the key moves to the end of the Map's insertion order,
	// making the eviction below least-recently-stashed.
	tokensByTransferId.delete(transferId);
	tokensByTransferId.set(transferId, token);
	while (tokensByTransferId.size > MAX_STASHED_TOKENS) {
		const oldest = tokensByTransferId.keys().next().value;
		if (oldest === undefined) break;
		tokensByTransferId.delete(oldest);
	}
	notify();
}

export function getTransferToken(transferId: string): string | null {
	return tokensByTransferId.get(transferId) ?? null;
}

/**
 * Subscribe to stash changes. Pair with `getTransferToken` in
 * `useSyncExternalStore` so a link landing on an already-focused screen
 * still enables Accept.
 */
export function subscribeTransferTokens(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * Drop everything. Called from every session-teardown path — these are
 * account-scoped bearer credentials, and the JS context survives an in-app
 * session expiry, so without this a token outlives its account on a shared
 * device.
 */
export function clearTransferTokens(): void {
	tokensByTransferId.clear();
	notify();
}
