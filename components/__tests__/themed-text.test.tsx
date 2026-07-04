/**
 * ThemedText font-family resolution
 *
 * ThemedText applies the Geist family by default, but must NOT clobber a
 * caller-provided fontFamily — license keys / registration / connection codes
 * pass a monospace family through `style` and would otherwise render in Geist.
 */
import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

import { ThemedText } from "@/components/themed-text";
import { GeistFonts } from "@/constants/theme";

describe("ThemedText fontFamily", () => {
	it("applies the Geist family by default", () => {
		const { getByText } = render(<ThemedText>Hi</ThemedText>);
		const flat = StyleSheet.flatten(getByText("Hi").props.style);
		expect(flat.fontFamily).toBe(GeistFonts.regular);
	});

	it("preserves a caller-provided fontFamily and weight (monospace codes)", () => {
		const { getByText } = render(
			<ThemedText style={{ fontFamily: "monospace", fontWeight: "700" }}>
				ABC-123
			</ThemedText>,
		);
		const flat = StyleSheet.flatten(getByText("ABC-123").props.style);
		expect(flat.fontFamily).toBe("monospace");
		expect(flat.fontWeight).toBe("700");
	});
});
