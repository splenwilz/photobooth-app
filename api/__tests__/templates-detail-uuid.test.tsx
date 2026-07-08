/**
 * Regression: template ids are UUID strings, not numbers.
 *
 * The store list returns `id` as a UUID (e.g. "c0710fba-32b5-…"). The detail
 * screen previously did `Number(id)` → NaN and the hook gated on `id > 0`,
 * so the query was disabled and every template dead-ended on "Template not
 * found". These tests lock in that a UUID id enables the query and reaches
 * the service unchanged, while a null id keeps it disabled.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { useTemplateById, useTemplateReviews } from "@/api/templates/queries";
import { getTemplateById, getTemplateReviews } from "@/api/templates/services";

jest.mock("@/api/templates/services");

const mockGetById = getTemplateById as jest.Mock;
const mockGetReviews = getTemplateReviews as jest.Mock;

const UUID = "c0710fba-32b5-4964-ab06-7009969e3af3";

function createWrapper() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	function Wrapper({ children }: { children: React.ReactNode }) {
		return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
	}
	Wrapper.displayName = "QueryClientWrapper";
	return Wrapper;
}

describe("template detail — UUID ids", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetById.mockResolvedValue({ id: UUID, name: "Halloween" });
		mockGetReviews.mockResolvedValue({ reviews: [], total: 0 });
	});

	it("fetches the template when given a UUID string id", async () => {
		renderHook(() => useTemplateById(UUID), { wrapper: createWrapper() });
		await waitFor(() => expect(mockGetById).toHaveBeenCalledWith(UUID));
	});

	it("does not fetch when the id is null", async () => {
		renderHook(() => useTemplateById(null), { wrapper: createWrapper() });
		// Give any pending effects/queries a tick to (not) fire.
		await new Promise((r) => setTimeout(r, 0));
		expect(mockGetById).not.toHaveBeenCalled();
	});

	it("fetches reviews when given a UUID string template id", async () => {
		renderHook(() => useTemplateReviews(UUID), { wrapper: createWrapper() });
		await waitFor(() =>
			expect(mockGetReviews).toHaveBeenCalledWith(UUID, expect.anything()),
		);
	});
});
