/**
 * Template Store React Query Hooks
 *
 * React Query v5 hooks for template marketplace data fetching.
 * @see /api/templates/services.ts - Service functions
 * @see /api/templates/types.ts - Type definitions
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../utils/query-keys";
import {
  createTemplateCheckout,
  deleteReview,
  downloadTemplate,
  getCategories,
  getLayouts,
  getPurchasedTemplates,
  getTemplateById,
  getTemplateReviews,
  getTemplates,
  submitReview,
  updateReview,
} from "./services";
import type {
  TemplateCheckoutRequest,
  TemplatesQueryParams,
} from "./types";

/**
 * Hook to fetch paginated templates with filters
 * @see GET /api/v1/templates
 */
export function useTemplates(params: TemplatesQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.templates.list(params as Record<string, unknown>),
    queryFn: () => getTemplates(params),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to fetch a single template by ID
 * @see GET /api/v1/templates/{id}
 */
export function useTemplateById(id: number | null) {
  return useQuery({
    queryKey: id ? queryKeys.templates.detail(id) : ["templates", "detail", null],
    queryFn: () => getTemplateById(id!),
    enabled: !!id && id > 0,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to fetch template categories
 * @see GET /api/v1/templates/categories
 */
export function useTemplateCategories() {
  return useQuery({
    queryKey: queryKeys.templates.categories(),
    queryFn: () => getCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch template layouts
 * @see GET /api/v1/templates/layouts
 */
export function useTemplateLayouts() {
  return useQuery({
    queryKey: queryKeys.templates.layouts(),
    queryFn: () => getLayouts(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch reviews for a template
 * @see GET /api/v1/templates/{templateId}/reviews
 */
export function useTemplateReviews(
  templateId: number | null,
  params: { page?: number; per_page?: number } = {},
) {
  return useQuery({
    queryKey: templateId
      ? [...queryKeys.templates.reviews(templateId), params]
      : ["templates", "reviews", null],
    queryFn: () => getTemplateReviews(templateId!, params),
    enabled: !!templateId && templateId > 0,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to submit a template review
 * @see POST /api/v1/templates/{templateId}/reviews
 */
export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: number;
      data: { rating: number; title?: string; comment?: string };
    }) => submitReview(templateId, data),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.templates.reviews(templateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.templates.detail(templateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.templates.lists(),
      });
    },
  });
}

/**
 * Hook to update an existing review
 * @see PATCH /api/v1/templates/{templateId}/reviews/{reviewId}
 */
export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      reviewId,
      data,
    }: {
      templateId: number;
      reviewId: number;
      data: { rating?: number; title?: string; comment?: string };
    }) => updateReview(templateId, reviewId, data),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.templates.reviews(templateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.templates.detail(templateId),
      });
    },
  });
}

/**
 * Hook to delete a review
 * @see DELETE /api/v1/templates/{templateId}/reviews/{reviewId}
 */
export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      reviewId,
    }: {
      templateId: number;
      reviewId: number;
    }) => deleteReview(templateId, reviewId),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.templates.reviews(templateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.templates.detail(templateId),
      });
    },
  });
}

/**
 * Hook to fetch user's purchased templates
 * @see GET /api/v1/templates/purchased
 */
export function usePurchasedTemplates(
  params: { booth_id?: string; page?: number; per_page?: number } = {},
) {
  const { booth_id, ...rest } = params;
  return useQuery({
    queryKey: booth_id
      ? [...queryKeys.templates.purchased(booth_id), rest]
      : ["templates", "purchased", null],
    queryFn: () => getPurchasedTemplates({ booth_id: booth_id!, ...rest }),
    enabled: !!booth_id,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to download a purchased template
 * @see POST /api/v1/templates/{id}/download
 */
export function useDownloadTemplate() {
  return useMutation({
    mutationFn: (id: number) => downloadTemplate(id),
  });
}

/**
 * Hook to create a Stripe checkout session for template purchases
 * @see POST /api/v1/payments/checkout/templates
 */
export function useTemplateCheckout() {
  return useMutation({
    mutationFn: (data: TemplateCheckoutRequest) =>
      createTemplateCheckout(data),
  });
}
