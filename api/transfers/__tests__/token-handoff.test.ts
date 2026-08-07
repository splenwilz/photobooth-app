/**
 * Transfer accept-token handoff.
 *
 * The store is the delivery path for a bearer credential, so three
 * properties are load-bearing:
 * - subscribers are notified on every stash (a link landing while the review
 *   screen is already focused emits no navigation event, so the screen can
 *   only learn about it from here),
 * - clearing is complete (tokens are account-scoped and the JS context
 *   survives an in-app session expiry), and
 * - the map is bounded (crafted links must not grow it without limit).
 */
import {
	clearTransferTokens,
	getTransferToken,
	stashTransferToken,
	subscribeTransferTokens,
} from "../token-handoff";

const ID_A = "6f0c6f2e-1234-4abc-9def-0123456789ab";
const ID_B = "7a0c6f2e-1234-4abc-9def-0123456789ab";

describe("transfer token handoff", () => {
	beforeEach(() => clearTransferTokens());

	it("round-trips a token and keeps it for repeat reads", () => {
		stashTransferToken(ID_A, "tok-a");
		expect(getTransferToken(ID_A)).toBe("tok-a");
		// Not consumed: backing out of the review screen and returning must
		// still allow accepting.
		expect(getTransferToken(ID_A)).toBe("tok-a");
		expect(getTransferToken(ID_B)).toBeNull();
	});

	it("overwrites with a rotated token (seller resend)", () => {
		stashTransferToken(ID_A, "old");
		stashTransferToken(ID_A, "fresh");
		expect(getTransferToken(ID_A)).toBe("fresh");
	});

	it("notifies subscribers on stash and on clear", () => {
		const listener = jest.fn();
		const unsubscribe = subscribeTransferTokens(listener);

		stashTransferToken(ID_A, "tok");
		expect(listener).toHaveBeenCalledTimes(1);

		clearTransferTokens();
		expect(listener).toHaveBeenCalledTimes(2);

		unsubscribe();
		stashTransferToken(ID_A, "tok2");
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("clears every token (account-scoped credentials)", () => {
		stashTransferToken(ID_A, "tok-a");
		stashTransferToken(ID_B, "tok-b");
		clearTransferTokens();
		expect(getTransferToken(ID_A)).toBeNull();
		expect(getTransferToken(ID_B)).toBeNull();
	});

	it("evicts least-recently-stashed entries beyond the cap", () => {
		const ids = Array.from(
			{ length: 10 },
			(_, i) => `${i}f0c6f2e-1234-4abc-9def-0123456789ab`,
		);
		ids.forEach((id, i) => stashTransferToken(id, `tok-${i}`));

		// Cap is 8: the two oldest are gone, the newest survive.
		expect(getTransferToken(ids[0])).toBeNull();
		expect(getTransferToken(ids[1])).toBeNull();
		expect(getTransferToken(ids[2])).toBe("tok-2");
		expect(getTransferToken(ids[9])).toBe("tok-9");
	});

	it("re-stashing refreshes recency so an active offer isn't evicted", () => {
		const ids = Array.from(
			{ length: 8 },
			(_, i) => `${i}f0c6f2e-1234-4abc-9def-0123456789ab`,
		);
		ids.forEach((id, i) => stashTransferToken(id, `tok-${i}`));
		stashTransferToken(ids[0], "refreshed");
		stashTransferToken(ID_B, "newcomer");

		expect(getTransferToken(ids[0])).toBe("refreshed");
		expect(getTransferToken(ids[1])).toBeNull();
	});
});
