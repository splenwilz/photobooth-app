/**
 * Every period-aggregating endpoint must receive ?tz=<operator zone>.
 * Partial adoption is the worst state: dashboard and booths tab would
 * disagree on "today" near midnight.
 */
import { apiClient } from "@/api/client";
import {
	getBoothRevenue,
	getRevenueDashboard,
} from "@/api/analytics/services";
import {
	getBoothDetail,
	getBoothOverview,
	getDashboardOverview,
} from "@/api/booths/services";

jest.mock("@/api/client", () => {
	const actual = jest.requireActual("@/api/client");
	return { ...actual, apiClient: jest.fn().mockResolvedValue({}) };
});

const mockedClient = apiClient as jest.Mock;

function requestedUrl(): string {
	expect(mockedClient).toHaveBeenCalledTimes(1);
	return mockedClient.mock.calls[0][0] as string;
}

describe("tz query parameter on aggregate endpoints", () => {
	beforeEach(() => mockedClient.mockClear());

	it("GET /analytics/revenue/dashboard carries tz", async () => {
		await getRevenueDashboard();
		expect(requestedUrl()).toMatch(/\/analytics\/revenue\/dashboard\?.*tz=/);
	});

	it("GET /analytics/revenue/dashboard keeps existing params alongside tz", async () => {
		await getRevenueDashboard({ recent_limit: 5 });
		const url = requestedUrl();
		expect(url).toMatch(/recent_limit=5/);
		expect(url).toMatch(/tz=/);
	});

	it("GET /analytics/revenue/{booth} carries tz", async () => {
		await getBoothRevenue({ booth_id: "b1" });
		expect(requestedUrl()).toMatch(/\/analytics\/revenue\/b1\?.*tz=/);
	});

	it("GET /booths/{id}/overview carries tz", async () => {
		await getBoothDetail("b1");
		expect(requestedUrl()).toMatch(/\/booths\/b1\/overview\?.*tz=/);
	});

	it("GET /booths/overview carries tz", async () => {
		await getBoothOverview();
		expect(requestedUrl()).toMatch(/\/booths\/overview\?.*tz=/);
	});

	it("GET /booths/overview/all carries tz", async () => {
		await getDashboardOverview();
		expect(requestedUrl()).toMatch(/\/booths\/overview\/all\?.*tz=/);
	});

	it("sends the exact operator zone, URL-encoded", async () => {
		const { operatorTz } = require("@/api/utils/timezone");
		await getBoothOverview();
		const url = requestedUrl();
		const sent = /[?&]tz=([^&]*)/.exec(url)?.[1];
		expect(sent).toBeDefined();
		expect(decodeURIComponent(sent as string)).toBe(operatorTz());
	});
});
