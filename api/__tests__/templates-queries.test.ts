/**
 * Templates API surface contract
 *
 * The paid-template purchase initiation has been removed for Apple
 * compliance. Catalog browse + purchased-template download remain.
 */
import * as templates from "@/api/templates";

const exports = templates as unknown as Record<string, unknown>;

describe("api/templates — Apple-compliance contract", () => {
	describe("removed (purchase initiation)", () => {
		it("does not export useTemplateCheckout", () => {
			expect(exports.useTemplateCheckout).toBeUndefined();
		});

		it("does not export createTemplateCheckout", () => {
			expect(exports.createTemplateCheckout).toBeUndefined();
		});
	});

	describe("kept (catalog + downloads)", () => {
		it("still exports useTemplates", () => {
			expect(typeof exports.useTemplates).toBe("function");
		});

		it("still exports useTemplateById", () => {
			expect(typeof exports.useTemplateById).toBe("function");
		});

		it("still exports usePurchasedTemplates", () => {
			expect(typeof exports.usePurchasedTemplates).toBe("function");
		});

		it("still exports useDownloadTemplate", () => {
			expect(typeof exports.useDownloadTemplate).toBe("function");
		});

		it("still exports getTemplates service", () => {
			expect(typeof exports.getTemplates).toBe("function");
		});

		it("still exports getPurchasedTemplates service", () => {
			expect(typeof exports.getPurchasedTemplates).toBe("function");
		});

		it("still exports downloadTemplate service", () => {
			expect(typeof exports.downloadTemplate).toBe("function");
		});
	});
});
