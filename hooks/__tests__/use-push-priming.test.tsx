/**
 * usePushPriming trigger tests
 */
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useBoothOverview } from "@/api/booths/queries";
import {
	getPushPermissionState,
	hasSeenPushPriming,
} from "@/utils/push-notifications";
import { usePushPriming } from "../use-push-priming";

jest.mock("@/api/booths/queries", () => ({ useBoothOverview: jest.fn() }));
jest.mock("@/utils/push-notifications", () => ({
	getPushPermissionState: jest.fn(),
	hasSeenPushPriming: jest.fn(),
}));

const mockOverview = useBoothOverview as jest.Mock;
const mockState = getPushPermissionState as jest.Mock;
const mockSeen = hasSeenPushPriming as jest.Mock;

function withBooths(total: number) {
	mockOverview.mockReturnValue({ data: { summary: { total_booths: total } } });
}

describe("usePushPriming", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockState.mockResolvedValue("undetermined");
		mockSeen.mockResolvedValue(false);
	});

	it("shows when the user has a booth, permission undetermined, not seen", async () => {
		withBooths(1);
		const { result } = renderHook(() => usePushPriming());
		await waitFor(() => expect(result.current.visible).toBe(true));
	});

	it("does not show when the user has no booths", async () => {
		withBooths(0);
		const { result } = renderHook(() => usePushPriming());
		// The no-booths branch returns synchronously before any await, so the
		// permission check never runs — assert directly, no timer needed.
		expect(result.current.visible).toBe(false);
		expect(mockState).not.toHaveBeenCalled();
	});

	it("does not show when already granted", async () => {
		withBooths(1);
		mockState.mockResolvedValue("granted");
		const { result } = renderHook(() => usePushPriming());
		// Wait for the async eligibility check to run AND its promise chain to
		// settle, so a buggy setVisible(true) would be observable before we assert.
		await waitFor(() => expect(mockState).toHaveBeenCalled());
		await act(async () => {});
		expect(result.current.visible).toBe(false);
	});

	it("does not show when priming was already seen", async () => {
		withBooths(2);
		mockSeen.mockResolvedValue(true);
		const { result } = renderHook(() => usePushPriming());
		await waitFor(() => expect(mockSeen).toHaveBeenCalled());
		await act(async () => {});
		expect(result.current.visible).toBe(false);
	});

	it("does not show (and swallows) when the eligibility check rejects", async () => {
		const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
		withBooths(1);
		mockState.mockRejectedValue(new Error("permissions read failed"));
		const { result } = renderHook(() => usePushPriming());
		// The warn only fires from the catch handler — proves the rejection was
		// caught (not merely unobserved), which asserting visible===false cannot.
		await waitFor(() => expect(warnSpy).toHaveBeenCalled());
		expect(result.current.visible).toBe(false);
		warnSpy.mockRestore();
	});

	it("dismiss hides the modal", async () => {
		withBooths(1);
		const { result } = renderHook(() => usePushPriming());
		await waitFor(() => expect(result.current.visible).toBe(true));
		result.current.dismiss();
		await waitFor(() => expect(result.current.visible).toBe(false));
	});
});
