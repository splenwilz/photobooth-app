/**
 * Templates API surface contract
 *
 * The paid-template purchase initiation has been removed for Apple
 * compliance. Catalog browse + purchased-template download remain.
 */
import * as templates from "@/api/templates";

const templatesExports = templates as unknown as Record<string, unknown>;

describe("api/templates — Apple-compliance contract", () => {
	describe("removed (purchase initiation)", () => {
		// Use `not.toHaveProperty` rather than `toBeUndefined` so the assertion
		// fails even if the symbol is re-introduced as a stub like
		// `export const useTemplateCheckout = undefined`.
		it("does not export useTemplateCheckout", () => {
			expect(templatesExports).not.toHaveProperty("useTemplateCheckout");
		});

		it("does not export createTemplateCheckout", () => {
			expect(templatesExports).not.toHaveProperty("createTemplateCheckout");
		});
	});

	describe("kept (catalog + downloads)", () => {
		it("still exports useTemplates", () => {
			expect(typeof templatesExports.useTemplates).toBe("function");
		});

		it("still exports useTemplateById", () => {
			expect(typeof templatesExports.useTemplateById).toBe("function");
		});

		it("still exports usePurchasedTemplates", () => {
			expect(typeof templatesExports.usePurchasedTemplates).toBe("function");
		});

		it("still exports useDownloadTemplate", () => {
			expect(typeof templatesExports.useDownloadTemplate).toBe("function");
		});

		it("still exports getTemplates service", () => {
			expect(typeof templatesExports.getTemplates).toBe("function");
		});

		it("still exports getPurchasedTemplates service", () => {
			expect(typeof templatesExports.getPurchasedTemplates).toBe("function");
		});

		it("still exports downloadTemplate service", () => {
			expect(typeof templatesExports.downloadTemplate).toBe("function");
		});
	});
});
