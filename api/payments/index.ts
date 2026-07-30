/**
 * Payments API Index
 *
 * Subscription reads, per-booth management, and external (Stripe web) purchase
 * surfaces.
 *
 * Storefront policy (Guideline 3.1.1(a)) splits these in two:
 * - Anything that opens Stripe on the web — checkout, the account portal, the
 *   per-booth `portal` flows — is a purchase surface and every UI entry point
 *   must sit behind `useExternalPurchases()`.
 * - Native management that calls only our own API — cancel, resume — is not a
 *   call to action directing users to a purchasing mechanism, and ships on
 *   every storefront.
 *
 * @example
 * import { useBoothSubscriptionState, useCancelBoothSubscription } from "@/api/payments";
 */

export * from "./types";
export * from "./services";
export * from "./queries";
