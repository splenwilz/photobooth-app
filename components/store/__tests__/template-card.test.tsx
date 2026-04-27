/**
 * TemplateCard tests
 *
 * Validates display-only catalog rendering: prices/badges as informational
 * metadata, no purchase affordances, graceful handling of the lean
 * `TemplateListItem` shape returned by `GET /templates`.
 */
import { readFileSync } from "fs";
import { join } from "path";
import React from "react";
import { render } from "@testing-library/react-native";

import { TemplateCard } from "@/components/store/template-card";
import type { TemplateListItem } from "@/api/templates/types";

function makeTemplate(
	overrides: Partial<TemplateListItem> = {},
): TemplateListItem {
	const base: TemplateListItem = {
		id: 1,
		slug: "sample-template",
		name: "Sample Template",
		description: null,
		template_type: "strip",
		price: "0",
		original_price: null,
		tags: null,
		is_new: false,
		rating_average: "0",
		review_count: 0,
		download_count: 0,
		download_url: null,
		preview_url: "https://example.com/p.png",
		overlay_url: null,
		category_id: 1,
		layout_id: null,
	};
	return { ...base, ...overrides };
}

describe("TemplateCard — Apple-compliance contract", () => {
	it('does not render an "Add to Cart" affordance for any template', () => {
		const { queryByText, queryByLabelText } = render(
			<TemplateCard
				template={makeTemplate({ price: "4.99" })}
				onPress={() => {}}
			/>,
		);
		expect(queryByText(/add to cart/i)).toBeNull();
		expect(queryByText(/^buy/i)).toBeNull();
		expect(queryByLabelText(/add to cart/i)).toBeNull();
	});

	it('renders "Free" badge for free templates', () => {
		const { getByText } = render(
			<TemplateCard
				template={makeTemplate({ price: "0" })}
				onPress={() => {}}
			/>,
		);
		expect(getByText(/free/i)).toBeTruthy();
	});

	it("renders the price as informational metadata for paid templates", () => {
		const { getByText } = render(
			<TemplateCard
				template={makeTemplate({ price: "4.99" })}
				onPress={() => {}}
			/>,
		);
		expect(getByText("$4.99")).toBeTruthy();
	});

	it("does not import the deleted cart store", () => {
		const source = readFileSync(
			join(__dirname, "..", "template-card.tsx"),
			"utf8",
		);
		expect(source).not.toMatch(/stores\/cart-store/);
	});

	it("does not access fields absent from the lean list response", () => {
		// The catalog endpoint returns TemplateListItem (no nested category/layout,
		// no photo_areas, no is_featured, no admin metadata). The card must not
		// reach for any of those — otherwise it'll crash on real list data.
		const source = readFileSync(
			join(__dirname, "..", "template-card.tsx"),
			"utf8",
		);
		expect(source).not.toMatch(/template\.is_featured/);
		expect(source).not.toMatch(/template\.category\b/);
		expect(source).not.toMatch(/template\.layout\b/);
		expect(source).not.toMatch(/template\.photo_areas/);
		expect(source).not.toMatch(/template\.created_by/);
		expect(source).not.toMatch(/template\.file_size/);
		expect(source).not.toMatch(/template\.file_type/);
	});

	it("renders without crashing when preview_url is null", () => {
		const { queryByText } = render(
			<TemplateCard
				template={makeTemplate({ preview_url: null })}
				onPress={() => {}}
			/>,
		);
		expect(queryByText("Sample Template")).toBeTruthy();
	});
});
