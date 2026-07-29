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

beforeEach(async () => {
	useAttentionStore.setState(initialState, true);
	// clearAllMocks resets call records but NOT the mock's in-memory storage —
	// clear it so state seeded by one test (e.g. the merge test) can't leak.
	await AsyncStorage.clear();
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

	it("prunes every marker when the roster is empty (last booth deleted)", () => {
		const { markBoothEventsSeen, pruneBoothMarkers } =
			useAttentionStore.getState();
		markBoothEventsSeen("booth-1", 42);
		markBoothEventsSeen("booth-2", 7);

		pruneBoothMarkers([]);

		expect(useAttentionStore.getState().lastSeenEventIdByBooth).toEqual({});
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

	it("survives import without window (expo-router web static render)", async () => {
		// `expo export` executes app modules in Node, where AsyncStorage's web
		// backend dereferences window.localStorage — the store must fall back
		// to no-op storage instead of crashing the export (regression: EAS
		// Update job failed with "ReferenceError: window is not defined").
		const originalWindow = globalThis.window;
		// @ts-expect-error — simulate the Node static-rendering environment
		delete globalThis.window;
		try {
			let isolatedStore: typeof useAttentionStore | undefined;
			jest.isolateModules(() => {
				// require (not import) is load-bearing: isolateModules only
				// isolates modules resolved inside this callback.
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				isolatedStore =
					require("../attention-store").useAttentionStore;
			});
			// Wait on the CONDITION, not a fixed microtask count — hydration is
			// synchronous with noop storage today, but a fixed tick count made
			// this test flaky when hydration ran async.
			const deadline = Date.now() + 1000;
			while (
				!isolatedStore!.getState().hasHydrated &&
				Date.now() < deadline
			) {
				await new Promise((resolve) => setTimeout(resolve, 0));
			}

			expect(isolatedStore!.getState().hasHydrated).toBe(true);
			expect(AsyncStorage.getItem).not.toHaveBeenCalled();
			expect(AsyncStorage.setItem).not.toHaveBeenCalled();
		} finally {
			globalThis.window = originalWindow;
		}
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
