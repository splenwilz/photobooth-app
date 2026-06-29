/**
 * Payments API Index
 *
 * Read-only subscription state APIs. Purchase initiation AND subscription
 * management (cancel, billing portal) are intentionally absent — users manage
 * subscriptions on the web (Apple compliance).
 *
 * @example
 * import { useSubscriptionAccess, useBoothSubscription } from "@/api/payments";
 */

export * from "./types";
export * from "./services";
export * from "./queries";
