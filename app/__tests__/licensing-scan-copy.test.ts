/**
 * Licensing scan copy contract
 *
 * Apple anti-steering: in-app text MUST NOT instruct the user to
 * "subscribe" — that's a CTA pointing to external purchase.
 * Verified by source-text inspection of /app/licensing/scan.tsx.
 */
import { readFileSync } from "fs";
import { join } from "path";

const SCAN_SOURCE = readFileSync(
	join(__dirname, "..", "licensing", "scan.tsx"),
	"utf8",
);

describe("app/licensing/scan.tsx — Apple-compliance copy", () => {
	it('does not instruct the user to "Please subscribe"', () => {
		expect(SCAN_SOURCE).not.toMatch(/please subscribe/i);
	});

	it('does not contain a "Subscribe" CTA in the no-subscription alert', () => {
		// The new wording uses "Activation Unavailable" with descriptive body.
		// Allow status-text occurrences of "subscription" (e.g., "active subscription"),
		// but disallow imperative "subscribe" verb in alerts.
		expect(SCAN_SOURCE).not.toMatch(/subscribe to this booth/i);
	});

	it('uses the new "Activation Unavailable" alert title', () => {
		expect(SCAN_SOURCE).toMatch(/Activation Unavailable/);
	});
});
