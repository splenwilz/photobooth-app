/**
 * Booth-create copy contract
 *
 * Post-creation flow: subscribe (US-storefront-gated CTA), then activate by
 * scanning the QR code on the physical booth. Connection credentials
 * (registration code / API key / booth id copy UI) are GONE — activation is
 * scan-based, and raw credentials must not be shown to the user.
 *
 * Verified via source inspection (rendering the success state requires
 * triggering the createBooth mutation, which is unnecessary complexity for
 * a copy-contract test).
 */
import { readFileSync } from "fs";
import { join } from "path";

const CREATE_SOURCE = readFileSync(
	join(__dirname, "..", "booths", "create.tsx"),
	"utf8",
);

describe("app/booths/create.tsx — post-creation flow contract", () => {
	describe("credentials UI removed (scan-based activation)", () => {
		it("does not render a Connection Credentials card", () => {
			expect(CREATE_SOURCE).not.toMatch(/Connection Credentials/);
		});

		it("does not display the registration code", () => {
			expect(CREATE_SOURCE).not.toMatch(/registration_code/);
			expect(CREATE_SOURCE).not.toMatch(/Registration Code/);
		});

		it("does not display the API key", () => {
			expect(CREATE_SOURCE).not.toMatch(/API Key/);
			expect(CREATE_SOURCE).not.toMatch(/api_key/);
		});
	});

	describe("scan-to-activate flow", () => {
		it("routes subscribed booths to the QR activation scanner", () => {
			expect(CREATE_SOURCE).toMatch(/\/licensing\/scan/);
			expect(CREATE_SOURCE).toMatch(/Scan QR/);
		});
	});

	it("still gates the connection flow on an active subscription", () => {
		expect(CREATE_SOURCE).toMatch(/useBoothSubscription/);
		expect(CREATE_SOURCE).toMatch(/is_active/);
	});

	it("keeps the neutral no-subscription message", () => {
		// Descriptive state shown on every storefront; never points to the
		// website in copy.
		expect(CREATE_SOURCE).toMatch(/needs an active subscription/);
	});

	it("gates the plan CTA behind the external-purchase (US storefront) check", () => {
		expect(CREATE_SOURCE).toMatch(/useExternalPurchases/);
		// The CTA must sit INSIDE the gated branch — assert proximity, not just
		// that a guard and the label both exist somewhere in the file.
		expect(CREATE_SOURCE).toMatch(
			/canPurchase && \([\s\S]{0,200}?Choose a Plan/,
		);
	});

	it("gates the imperative subscribe step title (anti-steering off-US)", () => {
		// "Start a subscription" is an instruction to purchase — it may only
		// render behind the gate; non-US storefronts get the descriptive title.
		// Whitespace-tolerant so a formatter re-wrap can't break the contract.
		expect(CREATE_SOURCE).toMatch(/"Start a subscription"/);
		expect(CREATE_SOURCE).toMatch(/"Subscription required"/);
		expect(CREATE_SOURCE).toMatch(
			/canPurchase[\s\S]{0,80}?"Start a subscription"[\s\S]{0,80}?"Subscription required"/,
		);
	});
});
