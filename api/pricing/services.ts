/**
 * Pricing API Services
 *
 * Service functions for fetching pricing plans.
 *
 * @see GET /api/v1/pricing/plans - Get available pricing plans
 */

import { apiClient } from "../client";
import type { PricingPlansResponse } from "./types";

/**
 * Get available pricing plans
 *
 * Returns all available subscription plans with pricing and features.
 *
 * @returns Pricing plans with trial period info
 *
 * @example
 * const { plans, trial_period_days } = await getPricingPlans();
 * plans.forEach(plan => console.log(plan.name, plan.price_display));
 */
export async function getPricingPlans(): Promise<PricingPlansResponse> {
	const response = await apiClient<PricingPlansResponse>(
		"/api/v1/pricing/plans",
		{ method: "GET" },
	);
	return response;
}
