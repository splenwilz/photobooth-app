/**
 * BrandName tests
 *
 * The "BoothIQ" wordmark renders as live text so the brand treatment (a
 * teal "IQ") stays consistent everywhere the name appears.
 */
import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

import { BrandName } from "@/components/brand-name";
import { BRAND_COLOR } from "@/constants/theme";

describe("BrandName", () => {
	it("renders the full BoothIQ wordmark", () => {
		const { getByText } = render(<BrandName />);
		// Outer Text's content is the full wordmark ("Booth" + nested "IQ").
		expect(getByText("Booth", { exact: false })).toBeTruthy();
	});

	it("colors the IQ with the brand teal", () => {
		const { getByText } = render(<BrandName />);
		const iq = getByText("IQ"); // exact -> the nested IQ span only
		expect(StyleSheet.flatten(iq.props.style).color).toBe(BRAND_COLOR);
	});

	it("allows overriding the IQ color", () => {
		const { getByText } = render(<BrandName iqColor="#ff0000" />);
		expect(StyleSheet.flatten(getByText("IQ").props.style).color).toBe(
			"#ff0000",
		);
	});
});
