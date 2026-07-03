/**
 * BrandHeader tests
 *
 * The shared brand lockup (mark image + BoothIQ wordmark) used on the
 * auth/onboarding screens. The mark is decorative, so only the wordmark
 * should be exposed to screen readers.
 */
import React from "react";
import { Image } from "react-native";
import { render } from "@testing-library/react-native";

import { BrandHeader } from "@/components/brand-header";

describe("BrandHeader", () => {
	it("renders the BoothIQ wordmark", () => {
		const { getByText } = render(<BrandHeader />);
		expect(getByText("Booth", { exact: false })).toBeTruthy();
		expect(getByText("IQ")).toBeTruthy();
	});

	it("hides the decorative mark from screen readers", () => {
		const { UNSAFE_getByType } = render(<BrandHeader />);
		const mark = UNSAFE_getByType(Image);
		expect(mark.props.accessible).toBe(false);
		expect(mark.props.accessibilityElementsHidden).toBe(true);
		expect(mark.props.importantForAccessibility).toBe("no");
	});
});
