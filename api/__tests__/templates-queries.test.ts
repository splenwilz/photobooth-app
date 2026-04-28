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
		it("does not export useTemplateCheckout", () => {
			expect(templatesExports.useTemplateCheckout).toBeUndefined();
		});

		it("does not export createTemplateCheckout", () => {
			expect(templatesExports.createTemplateCheckout).toBeUndefined();
		});
	});

	describe("kept (catalog + downloads)", () => {
		it("still templatesExports useTemplates", () => {
			expect(typeof templatesExports.useTemplates).toBe("function");
		});

		it("still templatesExports useTemplateById", () => {
			expect(typeof templatesExports.useTemplateById).toBe("function");
		});

		it("still templatesExports usePurchasedTemplates", () => {
			expect(typeof templatesExports.usePurchasedTemplates).toBe("function");
		});

		it("still templatesExports useDownloadTemplate", () => {
			expect(typeof templatesExports.useDownloadTemplate).toBe("function");
		});

		it("still templatesExports getTemplates service", () => {
			expect(typeof templatesExports.getTemplates).toBe("function");
		});

		it("still templatesExports getPurchasedTemplates service", () => {
			expect(typeof templatesExports.getPurchasedTemplates).toBe("function");
		});

		it("still templatesExports downloadTemplate service", () => {
			expect(typeof templatesExports.downloadTemplate).toBe("function");
		});
	});
});
