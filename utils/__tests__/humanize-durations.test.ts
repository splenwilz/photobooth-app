/**
 * humanizeDurationsInText
 *
 * Server-composed alert messages embed raw minute counts ("Lost connection
 * 2946 minutes ago"). At display time any "N minutes ago" of an hour or
 * more is rewritten into hours/days so operators aren't doing mental math.
 */
import { humanizeDurationsInText } from "@/utils/humanize-durations";

describe("humanizeDurationsInText", () => {
	it("converts day-scale minute counts", () => {
		expect(
			humanizeDurationsInText(
				"Lost connection 2946 minutes ago. Check network status.",
			),
		).toBe("Lost connection 2 days ago. Check network status.");
	});

	it("converts hour-scale minute counts", () => {
		expect(humanizeDurationsInText("Lost connection 95 minutes ago.")).toBe(
			"Lost connection 1 hour ago.",
		);
		expect(humanizeDurationsInText("Lost connection 150 minutes ago.")).toBe(
			"Lost connection 2 hours ago.",
		);
	});

	it("leaves sub-hour counts untouched", () => {
		expect(humanizeDurationsInText("Lost connection 45 minutes ago.")).toBe(
			"Lost connection 45 minutes ago.",
		);
	});

	it("handles the singular form and multiple occurrences", () => {
		expect(
			humanizeDurationsInText("A 1 minute ago; B 1440 minutes ago."),
		).toBe("A 1 minute ago; B 1 day ago.");
	});

	it("passes through text without durations", () => {
		expect(humanizeDurationsInText("Paper jam detected in the feed path.")).toBe(
			"Paper jam detected in the feed path.",
		);
	});

	it("leaves comma-grouped counts untouched rather than corrupting them", () => {
		expect(humanizeDurationsInText("Lost connection 1,440 minutes ago.")).toBe(
			"Lost connection 1,440 minutes ago.",
		);
	});

	it("leaves signed or decimal-prefixed counts untouched", () => {
		expect(humanizeDurationsInText("Drifted -75 minutes ago")).toBe(
			"Drifted -75 minutes ago",
		);
		expect(humanizeDurationsInText("Took 2.5 minutes ago")).toBe(
			"Took 2.5 minutes ago",
		);
	});
});
