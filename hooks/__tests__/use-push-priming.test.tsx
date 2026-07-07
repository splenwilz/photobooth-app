/**
 * usePushPriming trigger tests
 */
import { renderHook, waitFor } from "@testing-library/react-native";
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
		// give the effect a tick
		await new Promise((r) => setTimeout(r, 0));
		expect(result.current.visible).toBe(false);
		expect(mockState).not.toHaveBeenCalled();
	});

	it("does not show when already granted", async () => {
		withBooths(1);
		mockState.mockResolvedValue("granted");
		const { result } = renderHook(() => usePushPriming());
		await new Promise((r) => setTimeout(r, 0));
		expect(result.current.visible).toBe(false);
	});

	it("does not show when priming was already seen", async () => {
		withBooths(2);
		mockSeen.mockResolvedValue(true);
		const { result } = renderHook(() => usePushPriming());
		await new Promise((r) => setTimeout(r, 0));
		expect(result.current.visible).toBe(false);
	});

	it("dismiss hides the modal", async () => {
		withBooths(1);
		const { result } = renderHook(() => usePushPriming());
		await waitFor(() => expect(result.current.visible).toBe(true));
		result.current.dismiss();
		await waitFor(() => expect(result.current.visible).toBe(false));
	});
});
