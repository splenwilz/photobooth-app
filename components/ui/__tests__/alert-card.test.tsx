/**
 * AlertCard (shared) — server-composed alert prose must be humanized here
 * too, not only on the Alerts tab's local card: this component backs the
 * dashboard's Recent Alerts, and "2946 minutes ago" on the landing screen
 * is exactly what the humanizer exists to prevent.
 */
import React from "react";
import { render } from "@testing-library/react-native";

import { AlertCard } from "@/components/ui/alert-card";
import type { Alert } from "@/types/photobooth";

const alert: Alert = {
	id: "a1",
	type: "critical",
	category: "connectivity",
	title: "Booth Offline",
	message: "Lost connection 2946 minutes ago. Check network status.",
	timestamp: new Date("2026-08-03T10:00:00Z").toISOString(),
	boothName: "Downtown Event Center",
	read: false,
} as unknown as Alert;

describe("AlertCard", () => {
	it("humanizes raw minute counts in the message", () => {
		const { getByText, queryByText } = render(<AlertCard alert={alert} />);
		expect(
			getByText("Lost connection 2 days ago. Check network status."),
		).toBeTruthy();
		expect(queryByText(/2946 minutes/)).toBeNull();
	});
});
