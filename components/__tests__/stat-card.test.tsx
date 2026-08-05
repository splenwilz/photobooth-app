/**
 * StatCard tests
 *
 * Large currency values (e.g. "$134,538.00" for a year of revenue) must
 * shrink to fit on one line instead of wrapping mid-number.
 */
import React from "react";
import { render } from "@testing-library/react-native";

import { StatCard } from "@/components/ui/stat-card";

describe("StatCard", () => {
	it("renders the label and value", () => {
		const { getByText } = render(
			<StatCard label="This Year" value="$134,538.00" />,
		);
		expect(getByText("This Year")).toBeTruthy();
		expect(getByText("$134,538.00")).toBeTruthy();
	});

	it("keeps long values on a single auto-shrinking line", () => {
		const { getByText } = render(
			<StatCard label="This Year" value="$134,538.00" />,
		);
		const value = getByText("$134,538.00");
		expect(value.props.numberOfLines).toBe(1);
		expect(value.props.adjustsFontSizeToFit).toBe(true);
		// Floor the shrink: below this, truncation beats unreadable text.
		expect(value.props.minimumFontScale).toBe(0.5);
	});
});
