/**
 * Template detail — "your own review" identification.
 *
 * The reviews API identifies the caller's own review via `is_own_review`
 * (it does NOT return `user_id`). The detail screen must use that flag to
 * switch into edit mode ("Edit Your Review", pre-filled, with a delete
 * button). These tests lock that in so the edit/delete-own-review feature
 * can't silently regress to matching a field the API never sends.
 */
import { render } from "@testing-library/react-native";
import React from "react";

import TemplateDetailScreen from "../[id]";

// jest.setup.js mocks expo-router but not useLocalSearchParams — add it here.
jest.mock("expo-router", () => ({
	router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
	useLocalSearchParams: () => ({ id: "c0710fba-32b5-4964-ab06-7009969e3af3" }),
}));

const mockTemplate = {
	id: "c0710fba-32b5-4964-ab06-7009969e3af3",
	name: "Halloween",
	slug: "halloween",
	description: "Spooky strip",
	category: { id: "cat-1", name: "Seasonal" },
	template_type: "strip",
	price: "3.99",
	original_price: null,
	rating_average: "5.00",
	review_count: 1,
	preview_url: "https://example.com/p.png",
};

// Set per-test so we can toggle is_own_review.
let mockReviewsData: unknown;

jest.mock("@/api/templates/queries", () => ({
	useTemplateById: () => ({ data: mockTemplate, isLoading: false }),
	useTemplateReviews: () => ({ data: mockReviewsData, isLoading: false }),
	useSubmitReview: () => ({ mutate: jest.fn(), isPending: false }),
	useUpdateReview: () => ({ mutate: jest.fn(), isPending: false }),
	useDeleteReview: () => ({ mutate: jest.fn(), isPending: false }),
}));

function makeReview(overrides: Record<string, unknown> = {}) {
	return {
		id: 6,
		template_id: "c0710fba-32b5-4964-ab06-7009969e3af3",
		rating: 4,
		title: "Mine",
		comment: "My comment",
		is_approved: true,
		created_at: "2026-06-14T10:38:58Z",
		reviewer_display_name: "Me",
		reviewer_avatar_url: null,
		is_own_review: false,
		...overrides,
	};
}

describe("TemplateDetailScreen — own review via is_own_review", () => {
	it("enters edit mode and pre-fills when a review has is_own_review=true", () => {
		mockReviewsData = { reviews: [makeReview({ is_own_review: true })], total: 1 };
		const { getByText, getByDisplayValue } = render(<TemplateDetailScreen />);

		expect(getByText("Edit Your Review")).toBeTruthy();
		// Pre-filled from the user's existing review
		expect(getByDisplayValue("Mine")).toBeTruthy();
		expect(getByDisplayValue("My comment")).toBeTruthy();
	});

	it("stays in create mode when no review is flagged is_own_review", () => {
		mockReviewsData = {
			reviews: [makeReview({ id: 7, is_own_review: false, title: "Someone else" })],
			total: 1,
		};
		const { getByText, queryByDisplayValue } = render(<TemplateDetailScreen />);

		expect(getByText("Write a Review")).toBeTruthy();
		// Not pre-filled from a review that isn't the user's own
		expect(queryByDisplayValue("Someone else")).toBeNull();
	});
});
