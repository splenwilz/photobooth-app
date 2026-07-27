/**
 * Templates API surface contract
 *
 * Dual-storefront policy (Guideline 3.1.1(a)): template checkout services
 * and hooks ARE exported — purchase initiation is legal on the US
 * storefront — but the only UI entry point (TemplateBuySection) sits
 * behind useExternalPurchases(). Catalog browse + downloads unchanged.
 */
import * as templates from "@/api/templates";

const templatesExports = templates as unknown as Record<string, unknown>;

describe("api/templates — external-purchase surface contract", () => {
	describe("present (US-storefront external checkout)", () => {
		it("exports useTemplateCheckout", () => {
			expect(typeof templatesExports.useTemplateCheckout).toBe("function");
		});

		it("exports createTemplateCheckout", () => {
			expect(typeof templatesExports.createTemplateCheckout).toBe("function");
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
