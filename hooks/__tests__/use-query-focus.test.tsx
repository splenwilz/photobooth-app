/**
 * App-wide refetch triggers for React Query on React Native.
 *
 * `refetchOnWindowFocus` is set in api/query-client.ts but has no effect on
 * native until `focusManager` is driven by `AppState` — there is no window to
 * focus. Until this wiring existed, a booth cancelled at a kiosk could read as
 * "Active" in the app indefinitely, because nothing refetched when the app came
 * back to the foreground.
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/react-native
 */
import React from "react";
import {
	focusManager,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import { useQueryFocusManager } from "@/hooks/use-query-focus-manager";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";

let focusCallback: (() => void) | undefined;
jest.mock("@react-navigation/native", () => ({
	useFocusEffect: (cb: () => void) => {
		focusCallback = cb;
	},
}));

function makeWrapper(client: QueryClient) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
	};
}

/**
 * AppState.currentState is a plain property, not a getter, so jest.spyOn cannot
 * intercept it. Assign directly and restore after each test.
 */
const realCurrentState = AppState.currentState;
function setCurrentState(value: typeof AppState.currentState) {
	(AppState as { currentState: typeof AppState.currentState }).currentState =
		value;
}

beforeEach(() => {
	// restoreAllMocks, not clearAllMocks: clear resets calls but KEEPS
	// implementations, so an AppState.addEventListener stub from one describe
	// would leak into the next.
	jest.restoreAllMocks();
	setCurrentState(realCurrentState);
	focusCallback = undefined;
});

afterEach(() => setCurrentState(realCurrentState));

describe("useQueryFocusManager", () => {
	it("tells React Query the app is focused when AppState becomes active", () => {
		const setFocused = jest.spyOn(focusManager, "setFocused");
		let handler: ((s: string) => void) | undefined;
		const remove = jest.fn();
		jest
			.spyOn(AppState, "addEventListener")
			.mockImplementation((_event, cb) => {
				handler = cb as (s: string) => void;
				return { remove } as never;
			});

		renderHook(() => useQueryFocusManager());

		handler?.("active");
		expect(setFocused).toHaveBeenCalledWith(true);

		handler?.("background");
		expect(setFocused).toHaveBeenCalledWith(false);

		setFocused.mockRestore();
	});

	it("seeds from the current state, so a background launch is not 'focused'", () => {
		// focusManager defaults to focused. An app launched straight into the
		// background (a push handler) would otherwise be treated as foreground
		// until the first transition, refetching everything for a user who is
		// not looking at the screen.
		const setFocused = jest.spyOn(focusManager, "setFocused");
		jest
			.spyOn(AppState, "addEventListener")
			.mockImplementation(() => ({ remove: jest.fn() }) as never);
		setCurrentState("background");

		renderHook(() => useQueryFocusManager());

		expect(setFocused).toHaveBeenCalledWith(false);
	});

	it("does not fire a redundant focus event on a normal foreground launch", () => {
		// focusManager already defaults to focused, but setFocused(true) still
		// notifies subscribers the first time — which would refetch everything
		// mounted with refetchOnWindowFocus on every launch.
		const setFocused = jest.spyOn(focusManager, "setFocused");
		jest
			.spyOn(AppState, "addEventListener")
			.mockImplementation(() => ({ remove: jest.fn() }) as never);
		setCurrentState("active");

		renderHook(() => useQueryFocusManager());

		expect(setFocused).not.toHaveBeenCalled();
	});

	it("does not act on a null current state", () => {
		const setFocused = jest.spyOn(focusManager, "setFocused");
		jest
			.spyOn(AppState, "addEventListener")
			.mockImplementation(() => ({ remove: jest.fn() }) as never);
		setCurrentState(null as never);

		renderHook(() => useQueryFocusManager());

		expect(setFocused).not.toHaveBeenCalled();
	});

	it("removes the AppState subscription on unmount", () => {
		const remove = jest.fn();
		jest
			.spyOn(AppState, "addEventListener")
			.mockImplementation(() => ({ remove }) as never);

		const { unmount } = renderHook(() => useQueryFocusManager());
		unmount();

		expect(remove).toHaveBeenCalled();
	});
});

describe("useRefreshOnFocus", () => {
	it("does not refetch on the first focus, which is the mount fetch", () => {
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});
		const refetchQueries = jest
			.spyOn(client, "refetchQueries")
			.mockResolvedValue(undefined);

		renderHook(() => useRefreshOnFocus(["payments", "access"]), {
			wrapper: makeWrapper(client),
		});

		focusCallback?.();
		expect(refetchQueries).not.toHaveBeenCalled();
	});

	it("refetches only stale, active queries on a later focus", () => {
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});
		const refetchQueries = jest
			.spyOn(client, "refetchQueries")
			.mockResolvedValue(undefined);

		renderHook(() => useRefreshOnFocus(["payments", "access"]), {
			wrapper: makeWrapper(client),
		});

		focusCallback?.(); // mount
		focusCallback?.(); // returning to the screen

		expect(refetchQueries).toHaveBeenCalledWith({
			queryKey: ["payments", "access"],
			stale: true,
			type: "active",
		});
	});

	it("drops the stale filter when staleOnly is false", () => {
		// Data that changes outside the app must refresh even while React Query
		// still considers it fresh — otherwise a multi-minute staleTime means
		// returning to the screen refetches nothing.
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});
		const refetchQueries = jest
			.spyOn(client, "refetchQueries")
			.mockResolvedValue(undefined);

		renderHook(
			() =>
				useRefreshOnFocus(["payments", "boothSubscriptions"], {
					staleOnly: false,
				}),
			{ wrapper: makeWrapper(client) },
		);

		focusCallback?.();
		focusCallback?.();

		expect(refetchQueries).toHaveBeenCalledWith({
			queryKey: ["payments", "boothSubscriptions"],
			type: "active",
		});
		expect(refetchQueries.mock.calls[0][0]).not.toHaveProperty("stale");
	});

	it("passes the original key through, not a JSON round-trip", () => {
		// refetchQueries matches with partialMatchKey, which is typeof-strict:
		// JSON.stringify turns a top-level `undefined` into `null`, and
		// typeof null !== typeof undefined, so a round-tripped key silently
		// matches nothing.
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});
		const refetchQueries = jest
			.spyOn(client, "refetchQueries")
			.mockResolvedValue(undefined);

		renderHook(() => useRefreshOnFocus(["alerts", "list", undefined]), {
			wrapper: makeWrapper(client),
		});

		focusCallback?.();
		focusCallback?.();

		const { queryKey } = refetchQueries.mock.calls[0][0] as {
			queryKey: unknown[];
		};
		expect(queryKey[2]).toBeUndefined();
		expect(queryKey).not.toContain(null);
	});
});
