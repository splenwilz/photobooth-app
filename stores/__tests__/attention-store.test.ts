/**
 * Attention Store Tests
 *
 * Per-booth "seen" markers for the critical-event feed. The marker is the
 * highest event id the operator has viewed; operational events above it
 * count as unseen.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAttentionStore } from "../attention-store";

const initialState = useAttentionStore.getState();

beforeEach(() => {
	useAttentionStore.setState(initialState, true);
	jest.clearAllMocks();
});

describe("useAttentionStore", () => {
	it("starts with no seen markers", () => {
		expect(useAttentionStore.getState().lastSeenEventIdByBooth).toEqual({});
	});

	it("records the seen marker per booth", () => {
		useAttentionStore.getState().markBoothEventsSeen("booth-1", 42);

		expect(
			useAttentionStore.getState().lastSeenEventIdByBooth["booth-1"],
		).toBe(42);
	});

	it("keeps markers isolated between booths", () => {
		const { markBoothEventsSeen } = useAttentionStore.getState();
		markBoothEventsSeen("booth-1", 42);
		markBoothEventsSeen("booth-2", 7);

		expect(useAttentionStore.getState().lastSeenEventIdByBooth).toEqual({
			"booth-1": 42,
			"booth-2": 7,
		});
	});

	it("never lowers a marker (late-delivered refetch with fewer events)", () => {
		const { markBoothEventsSeen } = useAttentionStore.getState();
		markBoothEventsSeen("booth-1", 42);
		markBoothEventsSeen("booth-1", 30);

		expect(
			useAttentionStore.getState().lastSeenEventIdByBooth["booth-1"],
		).toBe(42);
	});

	it("ignores non-positive event ids", () => {
		useAttentionStore.getState().markBoothEventsSeen("booth-1", 0);

		expect(useAttentionStore.getState().lastSeenEventIdByBooth).toEqual({});
	});

	it("persists markers to AsyncStorage", async () => {
		useAttentionStore.getState().markBoothEventsSeen("booth-1", 42);

		// persist writes in a microtask for async storages
		await Promise.resolve();

		expect(AsyncStorage.setItem).toHaveBeenCalledWith(
			"attention-seen-v1",
			expect.stringContaining('"booth-1":42'),
		);
	});

	it("does not write when the marker did not change", async () => {
		const { markBoothEventsSeen } = useAttentionStore.getState();
		markBoothEventsSeen("booth-1", 42);
		await Promise.resolve();
		jest.clearAllMocks();

		markBoothEventsSeen("booth-1", 42);
		await Promise.resolve();

		expect(AsyncStorage.setItem).not.toHaveBeenCalled();
	});

	it("prunes markers for booths that no longer exist", () => {
		const { markBoothEventsSeen, pruneBoothMarkers } =
			useAttentionStore.getState();
		markBoothEventsSeen("booth-1", 42);
		markBoothEventsSeen("booth-deleted", 7);

		pruneBoothMarkers(["booth-1", "booth-new"]);

		expect(useAttentionStore.getState().lastSeenEventIdByBooth).toEqual({
			"booth-1": 42,
		});
	});

	it("prune is a no-op when nothing is orphaned (no spurious persist write)", async () => {
		const { markBoothEventsSeen, pruneBoothMarkers } =
			useAttentionStore.getState();
		markBoothEventsSeen("booth-1", 42);
		await Promise.resolve();
		jest.clearAllMocks();

		pruneBoothMarkers(["booth-1"]);
		await Promise.resolve();

		expect(AsyncStorage.setItem).not.toHaveBeenCalled();
	});

	it("flips hasHydrated when hydration completes (onRehydrateStorage wiring)", async () => {
		useAttentionStore.setState({ hasHydrated: false });

		await useAttentionStore.persist.rehydrate();

		expect(useAttentionStore.getState().hasHydrated).toBe(true);
	});

	it("merges hydration with per-booth Math.max so markers never regress", async () => {
		// Simulate: a marker was written in-memory BEFORE hydration landed,
		// while storage holds an older value for that booth and a marker for
		// a booth this session hasn't touched. (Seed storage after the write
		// so the write's own persist flush doesn't overwrite the seed.)
		useAttentionStore.getState().markBoothEventsSeen("booth-1", 42);
		await Promise.resolve();
		await AsyncStorage.setItem(
			"attention-seen-v1",
			JSON.stringify({
				state: {
					lastSeenEventIdByBooth: { "booth-1": 10, "booth-2": 99 },
				},
				version: 0,
			}),
		);

		await useAttentionStore.persist.rehydrate();

		expect(useAttentionStore.getState().lastSeenEventIdByBooth).toEqual({
			"booth-1": 42,
			"booth-2": 99,
		});
	});
});
