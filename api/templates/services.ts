/**
 * Template Store API Services
 *
 * Service functions for template marketplace endpoints.
 * @see /api/templates/types.ts - Type definitions
 * @see /api/templates/queries.ts - React Query hooks
 */

import { apiClient } from "../client";
import type {
  CategoriesResponse,
  CheckoutSessionResponse,
  LayoutsResponse,
  PurchasesResponse,
  ReviewsResponse,
  Template,
  TemplateCheckoutRequest,
  TemplateCheckoutResponse,
  TemplateReview,
  TemplatesQueryParams,
  TemplatesResponse,
} from "./types";

const BASE = "/api/v1/templates";

function buildQueryString<T extends object>(params: T): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Get paginated list of templates with optional filters
 * @see GET /api/v1/templates
 */
export async function getTemplates(
  params: TemplatesQueryParams = {},
): Promise<TemplatesResponse> {
  const qs = buildQueryString(params);
  return apiClient<TemplatesResponse>(`${BASE}${qs}`);
}

/**
 * Get a single template by ID
 * @see GET /api/v1/templates/{id}
 */
export async function getTemplateById(id: number): Promise<Template> {
  return apiClient<Template>(`${BASE}/${id}`);
}

/**
 * Get a template by its URL slug
 * @see GET /api/v1/templates/by-slug/{slug}
 */
export async function getTemplateBySlug(slug: string): Promise<Template> {
  return apiClient<Template>(`${BASE}/by-slug/${slug}`);
}

/**
 * Get all template categories
 * @see GET /api/v1/templates/categories
 */
export async function getCategories(): Promise<CategoriesResponse> {
  return apiClient<CategoriesResponse>(`${BASE}/categories`);
}

/**
 * Get all template layouts
 * @see GET /api/v1/templates/layouts
 */
export async function getLayouts(): Promise<LayoutsResponse> {
  return apiClient<LayoutsResponse>(`${BASE}/layouts`);
}

/**
 * Get reviews for a template
 * @see GET /api/v1/templates/{templateId}/reviews
 */
export async function getTemplateReviews(
  templateId: number,
  params: { page?: number; per_page?: number } = {},
): Promise<ReviewsResponse> {
  const qs = buildQueryString(params);
  return apiClient<ReviewsResponse>(`${BASE}/${templateId}/reviews${qs}`);
}

/**
 * Submit a review for a template
 * @see POST /api/v1/templates/{templateId}/reviews
 */
export async function submitReview(
  templateId: number,
  data: { rating: number; title?: string; comment?: string },
): Promise<void> {
  return apiClient(`${BASE}/${templateId}/reviews`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing review
 * @see PATCH /api/v1/templates/{templateId}/reviews/{reviewId}
 */
export async function updateReview(
  templateId: number,
  reviewId: number,
  data: { rating?: number; title?: string; comment?: string },
): Promise<TemplateReview> {
  return apiClient<TemplateReview>(
    `${BASE}/${templateId}/reviews/${reviewId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

/**
 * Delete a review
 * @see DELETE /api/v1/templates/{templateId}/reviews/{reviewId}
 */
export async function deleteReview(
  templateId: number,
  reviewId: number,
): Promise<void> {
  return apiClient(`${BASE}/${templateId}/reviews/${reviewId}`, {
    method: "DELETE",
  });
}

/**
 * Download a purchased template
 * @see POST /api/v1/templates/{id}/download
 */
export async function downloadTemplate(
  id: number,
): Promise<{ download_url: string }> {
  return apiClient<{ download_url: string }>(`${BASE}/${id}/download`, {
    method: "POST",
  });
}

/**
 * Get user's purchased templates
 * @see GET /api/v1/templates/purchased
 */
export async function getPurchasedTemplates(
  params: { page?: number; per_page?: number } = {},
): Promise<PurchasesResponse> {
  const qs = buildQueryString(params);
  return apiClient<PurchasesResponse>(`${BASE}/purchased${qs}`);
}

/**
 * Create a Stripe checkout session for template purchases
 * @see POST /api/v1/payments/checkout/templates
 */
export async function createTemplateCheckout(
  data: TemplateCheckoutRequest,
): Promise<TemplateCheckoutResponse> {
  return apiClient<TemplateCheckoutResponse>(
    "/api/v1/payments/checkout/templates",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

/**
 * Get checkout session status after payment
 * @see GET /api/v1/payments/checkout/{session_id}
 */
export async function getCheckoutSession(
  sessionId: string,
): Promise<CheckoutSessionResponse> {
  return apiClient<CheckoutSessionResponse>(
    `/api/v1/payments/checkout/${sessionId}`,
  );
}
