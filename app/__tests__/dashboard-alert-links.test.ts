/**
 * Dashboard alert tap contract — Apple Guideline 2.1 (App Completeness)
 *
 * Recent-alert cards on the home dashboard are tappable, so the handler must do
 * something real (navigate to the Alerts screen) rather than the previous
 * `console.log` placeholder, which presents a dead interaction to reviewers.
 */
import { readFileSync } from "fs";
import { join } from "path";

const INDEX_SOURCE = readFileSync(
	join(__dirname, "..", "(tabs)", "index.tsx"),
	"utf8",
);

describe("Home dashboard recent-alert cards", () => {
	it("do not use a console.log placeholder handler", () => {
		expect(INDEX_SOURCE).not.toContain('console.log("Alert pressed:"');
	});

	it("navigate to the Alerts screen on press", () => {
		// Both recent-alert card handlers (all-booths mode and single-booth mode)
		// must navigate — a bare toContain() would still pass if only one did.
		const navHandlers = INDEX_SOURCE.match(
			/onPress=\{\(\) => router\.push\("\/\(tabs\)\/alerts"\)\}/g,
		);
		expect(navHandlers).toHaveLength(2);
	});
});
