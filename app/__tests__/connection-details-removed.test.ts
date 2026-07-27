/**
 * Connection-details removal contract
 *
 * Booth activation is scan-based: the operator scans the QR code shown on
 * the physical booth's screen (app/licensing/scan). The old
 * ConnectionDetailsModal exposed raw credentials (API key, registration
 * code) and must not come back.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const REPO = join(__dirname, "..", "..");

describe("Connection details — retired in favor of QR activation", () => {
	it("ConnectionDetailsModal no longer exists", () => {
		expect(
			existsSync(
				join(REPO, "components", "booths", "ConnectionDetailsModal.tsx"),
			),
		).toBe(false);
	});

	it("the booths barrel does not export it", () => {
		const barrel = readFileSync(
			join(REPO, "components", "booths", "index.ts"),
			"utf8",
		);
		expect(barrel).not.toMatch(/ConnectionDetailsModal/);
	});

	it("the QR activation scanner still exists (replacement flow)", () => {
		expect(existsSync(join(REPO, "app", "licensing", "scan.tsx"))).toBe(true);
	});
});
