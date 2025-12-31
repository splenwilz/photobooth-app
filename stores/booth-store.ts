/**
 * Booth Store
 *
 * Global state management for selected booth using Zustand.
 * Persists selected booth ID to SecureStore for app restarts.
 *
 * Supports two modes:
 * - "all" - Aggregated view across all booths
 * - "{booth_id}" - Single booth detailed view
 *
 * @see https://docs.pmnd.rs/zustand/getting-started/introduction
 */

import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

// SecureStore key - exported for use in clear data functionality
export const STORAGE_KEY = "selected_booth_id";

/** Special value for "All Booths" mode */
export const ALL_BOOTHS_ID = "all";

interface BoothState {
	/** Currently selected booth ID, or "all" for aggregate mode */
	selectedBoothId: string | null;
	/** Whether the store has been hydrated from storage */
	isHydrated: boolean;
	/** Set the selected booth ID (or "all" for aggregate mode) */
	setSelectedBoothId: (boothId: string | null) => void;
	/** Hydrate state from SecureStore on app start */
	hydrate: () => Promise<void>;
	/** Check if currently in "All Booths" mode */
	isAllBoothsMode: () => boolean;
}

/**
 * Booth store for managing active booth selection
 *
 * Usage:
 * ```tsx
 * const { selectedBoothId, setSelectedBoothId, isAllBoothsMode } = useBoothStore();
 *
 * // Select all booths (aggregate mode)
 * setSelectedBoothId('all');
 *
 * // Select a specific booth
 * setSelectedBoothId('booth-123');
 *
 * // Check mode
 * if (isAllBoothsMode()) {
 *   // Show aggregated data
 * }
 * ```
 */
export const useBoothStore = create<BoothState>((set, get) => ({
	// Default to "all" mode - shows aggregated dashboard view
	// This ensures Dashboard starts in "All Booths" mode before hydration completes
	selectedBoothId: ALL_BOOTHS_ID,
	isHydrated: false,

	setSelectedBoothId: async (boothId: string | null) => {
		set({ selectedBoothId: boothId });

		// Persist to SecureStore
		try {
			if (boothId) {
				await SecureStore.setItemAsync(STORAGE_KEY, boothId);
			} else {
				await SecureStore.deleteItemAsync(STORAGE_KEY);
			}
		} catch (error) {
			console.warn("[BoothStore] Failed to persist booth ID:", error);
		}
	},

	hydrate: async () => {
		try {
			const storedId = await SecureStore.getItemAsync(STORAGE_KEY);
			set({
				// Default to "all" mode if nothing stored
				selectedBoothId: storedId ?? ALL_BOOTHS_ID,
				isHydrated: true,
			});
		} catch (error) {
			console.warn("[BoothStore] Failed to hydrate:", error);
			set({ 
				selectedBoothId: ALL_BOOTHS_ID,
				isHydrated: true,
			});
		}
	},

	isAllBoothsMode: () => {
		return get().selectedBoothId === ALL_BOOTHS_ID;
	},
}));
