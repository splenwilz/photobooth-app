/**
 * TemplateCard tests
 *
 * Validates display-only catalog rendering: prices/badges as informational
 * metadata, no purchase affordances, graceful handling of the lean
 * `TemplateListItem` shape returned by `GET /templates`.
 */
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
		// If template-card.tsx still imported "@/stores/cart-store", module
		// resolution would fail at test load time (the file was deleted), so
		// even instantiating the component proves the import isn't there.
		// We additionally render with a lean fixture to catch any runtime
		// access to cart-store-shaped state on render.
		expect(() =>
			render(
				<TemplateCard template={makeTemplate()} onPress={() => {}} />,
			),
		).not.toThrow();
	});

	it("does not access fields absent from the lean list response", () => {
		// Render with the strict TemplateListItem shape (no category/layout
		// nesting, no photo_areas, no is_featured, no admin metadata). If the
		// card reached for nested objects (e.g. `template.category.name`), it
		// would throw on undefined access. The positive assertion confirms
		// allowed metadata renders; the negative assertions confirm no
		// content driven by forbidden fields appears.
		const { queryByText, getByText } = render(
			<TemplateCard
				template={makeTemplate({
					price: "4.99",
					original_price: "9.99",
					is_new: true,
				})}
				onPress={() => {}}
			/>,
		);

		// Allowed metadata — proves the component used only lean-shape fields
		expect(getByText("Sample Template")).toBeTruthy();
		expect(getByText("$4.99")).toBeTruthy();
		expect(getByText("$9.99")).toBeTruthy(); // strikethrough sale price
		expect(getByText("New")).toBeTruthy();
		expect(getByText("Sale")).toBeTruthy();

		// Forbidden affordances and badges driven by full-Template fields
		expect(queryByText("Featured")).toBeNull(); // is_featured isn't in the lean shape
		expect(queryByText(/add to cart/i)).toBeNull();
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
