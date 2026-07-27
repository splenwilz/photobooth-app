/**
 * Subscription Components Index
 *
 * Subscription state display plus US-storefront-only purchase/management
 * affordances (Guideline 3.1.1(a)). Purchase initiation and the billing
 * portal are gated behind useExternalPurchases(); all other storefronts see
 * the read-only surface.
 *
 * @example
 * import { SubscriptionStatusCard, SubscriptionDetailsModal } from "@/components/subscription";
 */

export { SubscriptionStatusCard } from "./SubscriptionStatusCard";
export { SubscriptionDetailsModal } from "./SubscriptionDetailsModal";
export { PricingPlansSelector } from "./PricingPlansSelector";
export { PlanCard } from "./PlanCard";
export {
	BillingIntervalToggle,
	type BillingInterval,
} from "./BillingIntervalToggle";
