/**
 * Settings external links contract — Apple Guidelines 2.1 / 2.3 / 5.1.1(i)
 *
 * Settings links out to boothiq.com for content the app shouldn't ship its own
 * (divergent or non-functional) copy of:
 *  - Privacy Policy / Terms — single source of truth on the web (was stale in-app).
 *  - Help Center — was a dead placeholder button (`console.log` + TODO), which is
 *    an App-Completeness violation; now opens the hosted docs/FAQ hub.
 * URLs are centralized in constants/config.ts (WEB_URLS) and opened via a
 * scheme-validated Linking call.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { WEB_URLS } from "@/constants/config";

const REPO = join(__dirname, "..", "..");
const SETTINGS_SOURCE = readFileSync(
	join(REPO, "app", "(tabs)", "settings.tsx"),
	"utf8",
);

describe("In-app legal screens removed", () => {
	it("app/legal/privacy.tsx no longer exists", () => {
		expect(existsSync(join(REPO, "app", "legal", "privacy.tsx"))).toBe(false);
	});

	it("app/legal/terms.tsx no longer exists", () => {
		expect(existsSync(join(REPO, "app", "legal", "terms.tsx"))).toBe(false);
	});

	it("app/legal/_layout.tsx no longer exists", () => {
		expect(existsSync(join(REPO, "app", "legal", "_layout.tsx"))).toBe(false);
	});
});

describe("Settings links out to hosted pages", () => {
	it("does not navigate to the removed in-app legal routes", () => {
		expect(SETTINGS_SOURCE).not.toContain("/legal/privacy");
		expect(SETTINGS_SOURCE).not.toContain("/legal/terms");
	});

	it("references the canonical WEB_URLS constants for legal docs", () => {
		expect(SETTINGS_SOURCE).toContain("WEB_URLS.PRIVACY_POLICY");
		expect(SETTINGS_SOURCE).toContain("WEB_URLS.TERMS_OF_SERVICE");
	});

	it("wires Help Center to the hosted docs (no dead placeholder)", () => {
		expect(SETTINGS_SOURCE).toContain("WEB_URLS.HELP_CENTER");
		// The previous placeholder must be gone (App Completeness, 2.1).
		expect(SETTINGS_SOURCE).not.toContain("// TODO: Open help center");
		expect(SETTINGS_SOURCE).not.toContain('console.log("Open help center")');
	});
});

describe("WEB_URLS point at live boothiq.com pages", () => {
	it("privacy policy URL", () => {
		expect(WEB_URLS.PRIVACY_POLICY).toBe("https://boothiq.com/privacy");
	});

	it("terms of service URL", () => {
		expect(WEB_URLS.TERMS_OF_SERVICE).toBe("https://boothiq.com/terms");
	});

	it("help center URL", () => {
		expect(WEB_URLS.HELP_CENTER).toBe("https://boothiq.com/docs");
	});

	it("are all https", () => {
		for (const url of Object.values(WEB_URLS)) {
			expect(url.startsWith("https://")).toBe(true);
		}
	});
});
