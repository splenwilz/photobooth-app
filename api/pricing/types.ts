/**
 * Pricing API Types
 *
 * Type definitions for pricing plans endpoint.
 *
 * @see GET /api/v1/pricing/plans - Get available pricing plans
 */

/**
 * Billing interval for subscription plans
 */
export type BillingInterval = "month" | "year";

/**
 * Single pricing plan from API
 */
export interface PricingPlan {
	/** Plan ID */
	id: number;
	/** Plan name (e.g., "Starter", "Pro", "Enterprise") */
	name: string;
	/** Plan description */
	description: string;
	/** Monthly price in cents (e.g., 2900 = $29.00) */
	price_cents: number;
	/** Formatted monthly price (e.g., "$29/mo") */
	price_display: string;
	/** Currency code (e.g., "usd") */
	currency: string;
	/** Billing interval */
	billing_interval: BillingInterval;
	/** List of features included in plan */
	features: string[];
	/** Stripe price ID for monthly billing */
	stripe_price_id: string;
	/** Whether annual billing option is available */
	has_annual_option: boolean;
	/** Annual discount percentage (e.g., 20 for 20% off) */
	annual_discount_percent: number;
	/** Annual price in cents */
	annual_price_cents: number;
	/** Formatted annual price (e.g., "$278.40/year") */
	annual_price_display: string;
	/** Formatted annual savings (e.g., "Save $69.60/year") */
	annual_savings_display: string;
	/** Stripe price ID for annual billing */
	stripe_annual_price_id: string;
}

/**
 * GET /api/v1/pricing/plans response
 */
export interface PricingPlansResponse {
	/** Available pricing plans */
	plans: PricingPlan[];
	/** Trial period in days (0 if no trial) */
	trial_period_days: number;
}
