/**
 * Pricing React Query Hooks
 *
 * Hooks for fetching pricing plan data.
 *
 * @see https://tanstack.com/query/latest - React Query docs
 */

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/utils/query-keys";
import { getPricingPlans } from "./services";

/**
 * Hook to get available pricing plans
 *
 * Fetches all available subscription plans for display in pricing UI.
 * Data is cached for longer periods since plans change infrequently.
 *
 * @returns Query result with pricing plans
 *
 * @example
 * const { data, isLoading } = usePricingPlans();
 * if (data) {
 *   data.plans.forEach(plan => console.log(plan.name));
 * }
 */
export function usePricingPlans() {
	return useQuery({
		queryKey: queryKeys.pricing.plans(),
		queryFn: getPricingPlans,
		staleTime: 30 * 60 * 1000, // 30 minutes - plans don't change often
		gcTime: 60 * 60 * 1000, // 1 hour
	});
}
