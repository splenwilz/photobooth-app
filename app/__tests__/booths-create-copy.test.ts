/**
 * Booth-create copy contract
 *
 * After a booth is created, the screen MUST NOT show any
 * "Subscribe to This Booth" / "Subscribe to Activate" CTA.
 * Replaced by a neutral "Booth Connection Steps" info card.
 *
 * Verified via source inspection (rendering the success state
 * requires triggering the createBooth mutation, which is unnecessary
 * complexity for a copy-contract test).
 */
import { readFileSync } from "fs";
import { join } from "path";

const CREATE_SOURCE = readFileSync(
	join(__dirname, "..", "booths", "create.tsx"),
	"utf8",
);

describe("app/booths/create.tsx — Apple-compliance copy", () => {
	it('does not contain "Subscribe to This Booth" CTA', () => {
		expect(CREATE_SOURCE).not.toMatch(/Subscribe to This Booth/);
	});

	it('does not contain "Subscribe to Activate" header', () => {
		expect(CREATE_SOURCE).not.toMatch(/Subscribe to Activate/);
	});

	it("does not import PricingPlansSelector", () => {
		expect(CREATE_SOURCE).not.toMatch(/PricingPlansSelector/);
	});

	it("still renders the registration code section (regression guard)", () => {
		expect(CREATE_SOURCE).toMatch(/registration_code/);
		expect(CREATE_SOURCE).toMatch(/Registration Code/);
	});
});
