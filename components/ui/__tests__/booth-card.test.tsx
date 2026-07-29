/**
 * BoothCard Tests — attention badge
 *
 * The badge surfaces the booth's critical-event count (unrefunded stranded
 * sessions + unseen operational incidents) on the booth list and opens the
 * booth's critical-events screen.
 */
import { render, screen, userEvent } from "@testing-library/react-native";
import React from "react";

import type { Booth } from "@/types/photobooth";
import { BoothCard } from "../booth-card";

const booth: Booth = {
	id: "booth-1",
	name: "Downtown Mall Booth",
	location: "123 Main St",
	status: "online",
	operationMode: "coin",
	todayRevenue: 42,
	todayTransactions: 7,
};

describe("BoothCard attention badge", () => {
	it("renders the count when attention is needed", () => {
		render(
			<BoothCard booth={booth} attentionCount={3} onAttentionPress={jest.fn()} />,
		);

		expect(screen.getByText("3")).toBeTruthy();
		expect(
			screen.getByLabelText("3 critical events need attention"),
		).toBeTruthy();
	});

	it("uses singular phrasing for one event", () => {
		render(
			<BoothCard booth={booth} attentionCount={1} onAttentionPress={jest.fn()} />,
		);

		expect(
			screen.getByLabelText("1 critical event needs attention"),
		).toBeTruthy();
	});

	it("renders a lower-bound '+' badge when the feed was truncated", () => {
		render(
			<BoothCard
				booth={booth}
				attentionCount={12}
				attentionOverflow
				onAttentionPress={jest.fn()}
			/>,
		);

		expect(screen.getByText("12+")).toBeTruthy();
		expect(
			screen.getByLabelText("At least 12 critical events need attention"),
		).toBeTruthy();
	});

	it("renders no badge when the count is zero", () => {
		render(
			<BoothCard booth={booth} attentionCount={0} onAttentionPress={jest.fn()} />,
		);

		expect(screen.queryByText("0")).toBeNull();
	});

	it("renders no badge when the count is not provided", () => {
		render(<BoothCard booth={booth} />);

		expect(screen.queryByLabelText(/need attention/)).toBeNull();
	});

	it("fires onAttentionPress when the badge is pressed", async () => {
		// userEvent is the RNTL-documented realistic press simulation. It
		// targets only the badge's own handler — RN's nested Touchables
		// isolate the inner press natively, so no card-onPress assertion.
		const onAttentionPress = jest.fn();
		const user = userEvent.setup();
		render(
			<BoothCard
				booth={booth}
				onPress={jest.fn()}
				attentionCount={2}
				onAttentionPress={onAttentionPress}
			/>,
		);

		await user.press(screen.getByLabelText("2 critical events need attention"));

		expect(onAttentionPress).toHaveBeenCalledTimes(1);
	});
});
