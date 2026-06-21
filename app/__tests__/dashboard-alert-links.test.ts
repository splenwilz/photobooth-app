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
		expect(INDEX_SOURCE).toContain('router.push("/(tabs)/alerts")');
	});
});
