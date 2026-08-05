/**
 * Timezone-change refetch.
 *
 * Period aggregates are cached per operator timezone (see
 * api/utils/query-keys.ts). A traveler can cross zones with the app killed or
 * backgrounded, so on every return to the foreground the hook re-reads the
 * device zone and, if it changed, invalidates the tz-keyed analytics/booths
 * queries so screens re-slice on the new local calendar.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import { refreshOperatorTz } from "@/api/utils/timezone";
import { useTimezoneRefetch } from "@/hooks/use-timezone-refetch";

// No native calendar source in this suite — the zone flows through the Intl
// mocks below (mirrors a dev client without the expo-localization module).
jest.mock("expo-localization", () => ({ getCalendars: jest.fn(() => []) }));

function makeWrapper(client: QueryClient) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
	};
}

const realDateTimeFormat = Intl.DateTimeFormat;

function mockZone(timeZone: string) {
	Intl.DateTimeFormat = jest.fn().mockReturnValue({
		resolvedOptions: () => ({ timeZone }),
	}) as unknown as typeof Intl.DateTimeFormat;
}

afterEach(() => {
	Intl.DateTimeFormat = realDateTimeFormat;
	jest.restoreAllMocks();
});

describe("useTimezoneRefetch", () => {
	function setup() {
		refreshOperatorTz(); // sync the module-level cache to the current mock
		let handler: ((s: string) => void) | undefined;
		const remove = jest.fn();
		jest
			.spyOn(AppState, "addEventListener")
			.mockImplementation((_event, cb) => {
				handler = cb as (s: string) => void;
				return { remove } as never;
			});
		const client = new QueryClient();
		const invalidate = jest.spyOn(client, "invalidateQueries");
		renderHook(() => useTimezoneRefetch(), { wrapper: makeWrapper(client) });
		return { fire: (s: string) => handler?.(s), invalidate, remove };
	}

	it("invalidates analytics and booths queries when the zone changed while backgrounded", () => {
		mockZone("Africa/Lagos");
		const { fire, invalidate } = setup();

		mockZone("America/Los_Angeles");
		fire("active");

		expect(invalidate).toHaveBeenCalledWith({ queryKey: ["analytics"] });
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ["booths"] });
	});

	it("does nothing when the zone is unchanged", () => {
		mockZone("Africa/Lagos");
		const { fire, invalidate } = setup();

		fire("active");

		expect(invalidate).not.toHaveBeenCalled();
	});

	it("ignores non-active transitions", () => {
		mockZone("Africa/Lagos");
		const { fire, invalidate } = setup();

		mockZone("America/Los_Angeles");
		fire("background");

		expect(invalidate).not.toHaveBeenCalled();
	});

	it("only invalidates once per zone change", () => {
		mockZone("Africa/Lagos");
		const { fire, invalidate } = setup();

		mockZone("America/Los_Angeles");
		fire("active");
		fire("active");

		expect(invalidate).toHaveBeenCalledTimes(2); // analytics + booths, once
	});
});
