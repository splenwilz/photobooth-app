/**
 * Pin the timezone for the whole test run.
 *
 * Must happen HERE, not in jest.setup.js: setupFiles runs inside a worker whose
 * V8 has already resolved the zone, so assigning process.env.TZ there is read
 * back correctly but changes nothing — Intl still reports the machine zone.
 * globalSetup runs in the parent before workers are forked, so they inherit
 * TZ=UTC from the environment at startup.
 *
 * Needed because date assertions go through toLocaleDateString: a UTC instant
 * like 2026-12-31T00:00:00Z renders as "Dec 30" anywhere west of UTC, so the
 * suite would pass in Lagos and fail in New York. Fixing it in the component
 * would be wrong — users should see billing dates in their own zone.
 */
module.exports = async () => {
	process.env.TZ = "UTC";
};
