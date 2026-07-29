/**
 * Attention Store
 *
 * Per-booth "seen" markers for the critical-event feed. The server keeps no
 * read-state for critical events, so without a client marker an operational
 * event (e.g. a printer failure) would badge forever. The marker is the
 * highest event id the operator has viewed on a booth's critical-events
 * screen; event ids are monotonically increasing, so operational events
 * above it are "unseen".
 *
 * Persisted with the zustand `persist` middleware over AsyncStorage — the
 * officially documented React Native backend for non-sensitive UI state.
 * (SecureStore is reserved for secrets; large values can be rejected by the
 * platform keychain.)
 *
 * @see https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
	createJSONStorage,
	persist,
	type StateStorage,
} from "zustand/middleware";

/**
 * expo-router's web static rendering (`expo export`) imports this module in
 * Node, where AsyncStorage's web backend dereferences `window.localStorage`
 * and crashes the export. Persistence is meaningless during static render —
 * fall back to a no-op storage there. On device and in the browser,
 * `window` exists and AsyncStorage is used normally.
 *
 * (Deliberate divergence from zustand's documented SSR remedy —
 * `skipHydration` + manual `rehydrate()` — which would push rehydration
 * wiring onto every consumer; a build-time-only Node evaluation never needs
 * persistence at all.)
 */
const noopStorage: StateStorage = {
	getItem: () => null,
	setItem: () => undefined,
	removeItem: () => undefined,
};

interface AttentionState {
	/** Highest critical-event id the operator has seen, per booth. */
	lastSeenEventIdByBooth: Record<string, number>;
	/**
	 * Whether persisted markers have been loaded. Async storage hydrates in
	 * a microtask after first render — treat operational events as seen
	 * until this flips so badges don't flash stale "unseen" counts.
	 */
	hasHydrated: boolean;
	/**
	 * Record that the operator has viewed a booth's feed up to `maxEventId`.
	 * Monotonic: a lower or equal id is a no-op, so a late refetch that
	 * momentarily returns fewer events can never resurrect old badges.
	 */
	markBoothEventsSeen: (boothId: string, maxEventId: number) => void;
	/**
	 * Drop markers for booths not in `liveBoothIds` — deleted booths would
	 * otherwise accumulate in AsyncStorage forever. Call with the full booth
	 * list from the overview response (the authoritative fleet roster).
	 */
	pruneBoothMarkers: (liveBoothIds: string[]) => void;
	setHasHydrated: (hydrated: boolean) => void;
}

export const useAttentionStore = create<AttentionState>()(
	persist(
		(set, get) => ({
			lastSeenEventIdByBooth: {},
			hasHydrated: false,

			markBoothEventsSeen: (boothId, maxEventId) => {
				if (!boothId || maxEventId <= 0) return;
				const current = get().lastSeenEventIdByBooth[boothId] ?? 0;
				if (maxEventId <= current) return;
				set((state) => ({
					lastSeenEventIdByBooth: {
						...state.lastSeenEventIdByBooth,
						[boothId]: maxEventId,
					},
				}));
			},

			pruneBoothMarkers: (liveBoothIds) => {
				const current = get().lastSeenEventIdByBooth;
				const live = new Set(liveBoothIds);
				if (Object.keys(current).every((boothId) => live.has(boothId))) {
					return; // nothing orphaned — avoid a pointless persist write
				}
				set({
					lastSeenEventIdByBooth: Object.fromEntries(
						Object.entries(current).filter(([boothId]) => live.has(boothId)),
					),
				});
			},

			setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
		}),
		{
			name: "attention-seen-v1",
			storage: createJSONStorage(() =>
				typeof window === "undefined" ? noopStorage : AsyncStorage,
			),
			partialize: (state) => ({
				lastSeenEventIdByBooth: state.lastSeenEventIdByBooth,
			}),
			// Per-booth Math.max instead of the default shallow replace: a
			// marker written before async hydration lands (or by a racing
			// second surface) can never be lowered by stored state — the
			// monotonic invariant holds unconditionally.
			merge: (persisted, current) => {
				const persistedMap =
					(persisted as Partial<AttentionState> | undefined)
						?.lastSeenEventIdByBooth ?? {};
				const merged = { ...current.lastSeenEventIdByBooth };
				for (const [boothId, eventId] of Object.entries(persistedMap)) {
					merged[boothId] = Math.max(merged[boothId] ?? 0, eventId);
				}
				return { ...current, lastSeenEventIdByBooth: merged };
			},
			// Runs on hydration success AND failure (error arg ignored):
			// failing open means a storage read error re-badges already-seen
			// incidents — noisy but safe — rather than hiding badges forever.
			onRehydrateStorage: (state) => () => state.setHasHydrated(true),
		},
	),
);
