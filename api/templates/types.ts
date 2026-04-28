/**
 * Template Store Types
 *
 * Types matching the backend Template API for the template marketplace.
 *
 * @see /api/templates/services.ts - Template API service functions
 * @see /api/templates/queries.ts - React Query hooks
 */

export type TemplateType = "strip" | "photo_4x6";

export interface TemplateCategory {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  is_premium: boolean;
  sort_order: number;
  is_seasonal_category: boolean;
  season_start_date: string | null;
  season_end_date: string | null;
  seasonal_priority: number;
  created_at: string;
}

export interface TemplateLayout {
  id: string;
  layout_key: string;
  name: string;
  description: string;
  width: number;
  height: number;
  photo_count: number;
  product_category_id: number;
  is_active: boolean;
  sort_order: number;
  photo_areas: TemplatePhotoArea[];
  created_at: string;
}

export interface TemplatePhotoArea {
  id: number;
  layout_id: string;
  photo_index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  border_radius: number;
  shape_type: string;
}

/**
 * Signed S3 URLs returned for template asset files. Shared between the
 * lean catalog projection and the full detail/purchased response so the
 * URL contract is defined in one place.
 */
export interface TemplateAssetUrls {
  /**
   * Signed S3 URL for the template file. Per API docs:
   * - `null` for anonymous viewers, even free templates
   * - Populated for free templates, admins, and owners of paid templates
   * - `null` for authenticated non-owners of paid templates
   * Clients should call `POST /templates/{id}/download` for the canonical, auth-required URL.
   */
  download_url: string | null;
  /** Signed S3 URL for the preview image. `null` if the template has no preview asset. */
  preview_url: string | null;
  /** Signed S3 URL for the overlay asset (decorations layered atop photos). `null` if no overlay. */
  overlay_url: string | null;
}

/**
 * Lean projection returned by `GET /templates` (catalog list).
 *
 * Per the API docs, the list endpoint omits nested `category` / `layout`
 * objects, `photo_areas`, and admin/upload metadata to reduce response
 * size. Use the detail endpoints (`GET /templates/{id}`,
 * `GET /templates/by-slug/{slug}`) when the full `Template` shape is
 * required.
 */
export interface TemplateListItem extends TemplateAssetUrls {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  template_type: TemplateType;
  price: string;
  original_price: string | null;
  tags: string | null;
  is_new: boolean;
  rating_average: string;
  review_count: number;
  download_count: number;
  category_id: number | null;
  layout_id: string | null;
}

/**
 * Full template shape returned by detail endpoints
 * (`GET /templates/{id}`, `GET /templates/by-slug/{slug}`) and embedded
 * in `TemplatePurchase.template`.
 */
export interface Template extends TemplateAssetUrls {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category_id: number;
  category: TemplateCategory;
  layout_id: string | null;
  layout: TemplateLayout | null;
  template_type: TemplateType;
  status: string;
  is_active: boolean;
  sort_order: number;
  price: string;
  original_price: string | null;
  file_size: number;
  file_type: string;
  original_filename: string;
  width: number | null;
  height: number | null;
  tags: string | null;
  is_featured: boolean;
  is_new: boolean;
  download_count: number;
  rating_average: string;
  review_count: number;
  color_config: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// List response — uses the lean projection
export interface TemplatesResponse {
  templates: TemplateListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface TemplatesQueryParams {
  page?: number;
  per_page?: number;
  category_id?: number;
  layout_id?: string;
  template_type?: TemplateType;
  is_featured?: boolean;
  is_new?: boolean;
  is_free?: boolean;
  sort_by?: string;
  search?: string;
}

// Categories & layouts
export interface CategoriesResponse {
  categories: TemplateCategory[];
  total: number;
}

export interface LayoutsResponse {
  layouts: TemplateLayout[];
  total: number;
}

// Reviews
export interface TemplateReview {
  id: number;
  template_id: number;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface ReviewsResponse {
  reviews: TemplateReview[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Purchases
export interface TemplatePurchase {
  id: number;
  template_id: number;
  booth_id: string;
  template: Template;
  quantity: number;
  amount_paid: string;
  payment_intent_id: string;
  checkout_session_id: string;
  purchased_at: string;
}

export interface PurchasesResponse {
  purchases: TemplatePurchase[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
