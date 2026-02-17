/**
 * Booth API Types
 * 
 * Types for booth creation and management.
 * @see /api/v1/booths endpoint
 */

/**
 * Request body for creating a new booth
 * POST /api/v1/booths
 */
export interface CreateBoothRequest {
  /** Booth name (1-100 characters) */
  name: string;
  /** Booth address (1-200 characters) */
  address: string;
}

/**
 * Response from booth creation endpoint
 * POST /api/v1/booths
 */
export interface CreateBoothResponse {
  id: string;
  name: string;
  owner_id: string;
  api_key: string;
  /** 6-digit registration code for easy booth connection (e.g., "7RR8B6") */
  registration_code: string;
  /** ISO timestamp when the registration code expires */
  code_expires_at: string;
  qr_code: string;
  message: string;
}

/**
 * Booth entity from API
 * Used for listing and fetching booth details
 */
export interface Booth {
  id: string;
  name: string;
  owner_id: string;
  address?: string;
  status?: 'online' | 'offline' | 'warning';
  /** Whether booth has a hardware error (printer, camera, payment controller) */
  has_error?: boolean;
  /** Details about the error when has_error is true */
  error_details?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Booth List API Types
// GET /api/v1/booths
// ============================================

/**
 * Booth item in list response
 */
export interface BoothListItem {
  id: string;
  name: string;
  owner_id: string;
  address: string | null;
  status: 'online' | 'offline' | 'warning';
  /** Whether booth has a hardware error */
  has_error: boolean;
  /** Details about the error when has_error is true */
  error_details: string | null;
  last_heartbeat: string | null;
  last_sync: string | null;
  created_at: string;
}

/**
 * Response from booth list endpoint
 * GET /api/v1/booths
 */
export interface BoothListResponse {
  booths: BoothListItem[];
  total: number;
}

// ============================================
// Single Booth Detail API Types
// GET /api/v1/booths/{booth_id}/overview
// ============================================

/**
 * Revenue period stats for a single booth
 */
export interface BoothDetailRevenuePeriod {
  amount: number;
  transactions: number;
  average: number;
  change: number;
}

/**
 * Revenue breakdown by period for single booth
 */
export interface BoothDetailRevenue {
  today: BoothDetailRevenuePeriod;
  week: BoothDetailRevenuePeriod;
  month: BoothDetailRevenuePeriod;
  year: BoothDetailRevenuePeriod;
}

/**
 * Payment values for a single period
 */
export interface BoothPaymentPeriod {
  cash: number;
  card: number;
  manual: number;
}

/**
 * Payment breakdown for single booth - by time period
 * Updated to match dashboard structure with today/week/month/year
 */
export interface BoothPaymentBreakdown {
  today: BoothPaymentPeriod;
  week: BoothPaymentPeriod;
  month: BoothPaymentPeriod;
  year: BoothPaymentPeriod;
}

/**
 * Upsale values for a single period
 * Tracks extra copies and cross-sell revenue
 */
export interface BoothUpsalePeriod {
  extra_copies_revenue: number;
  cross_sell_revenue: number;
  extra_copies_count: number;
  cross_sell_count: number;
}

/**
 * Upsale breakdown for single booth - by time period
 */
export interface BoothUpsaleBreakdown {
  today: BoothUpsalePeriod;
  week: BoothUpsalePeriod;
  month: BoothUpsalePeriod;
  year: BoothUpsalePeriod;
}

/**
 * Printer hardware status
 */
export interface PrinterStatus {
  name: string | null;
  model: string | null;
  status: string;
  error: string | null;
  paper_percent: number | null;
  ink_percent: number | null;
  prints_remaining: number;
}

/**
 * Payment controller hardware status
 */
export interface PaymentControllerStatus {
  status: string;
  error: string | null;
  payment_methods: string;
  transactions_today: number;
}

/**
 * Camera hardware status
 */
export interface CameraStatus {
  name: string | null;
  status: string;
  error: string | null;
  cameras_detected: number;
}

/**
 * Hardware status for a booth
 */
export interface BoothHardware {
  printer: PrinterStatus | null;
  payment_controller: PaymentControllerStatus | null;
  camera: CameraStatus | null;
}

/**
 * System information for a booth
 */
export interface BoothSystem {
  app_uptime_seconds: number;
  app_uptime_formatted: string;
  system_uptime_seconds: number;
  system_uptime_formatted: string;
  app_version: string;
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
}

/**
 * Alert from booth detail
 */
export interface BoothDetailAlert {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  message: string;
  booth_id: string;
  booth_name: string;
  timestamp: string;
  is_read: boolean;
}

/**
 * Complete booth detail response
 * GET /api/v1/booths/{booth_id}/overview
 */
export interface BoothDetailResponse {
  booth_id: string;
  booth_name: string;
  booth_address: string | null;
  booth_status: 'online' | 'offline' | 'warning';
  /** Whether booth has a hardware error */
  has_error: boolean;
  /** Details about the error when has_error is true */
  error_details: string | null;
  last_heartbeat: string | null;
  last_heartbeat_ago: string;
  revenue: BoothDetailRevenue;
  payment_breakdown: BoothPaymentBreakdown;
  upsale_breakdown: BoothUpsaleBreakdown;
  hardware: BoothHardware;
  system: BoothSystem;
  recent_alerts: BoothDetailAlert[];
  alerts_count: number;
}

// ============================================
// Booth Overview API Types
// GET /api/v1/booths/overview
// ============================================

/**
 * Summary statistics for all booths
 */
export interface BoothOverviewSummary {
  total_booths: number;
  online_count: number;
  offline_count: number;
  total_credits: number;
  total_transactions_today: number;
  total_revenue_today: number;
  booths_with_credits: number;
  booths_active_today: number;
}

/**
 * Credits information for a booth
 */
export interface BoothCredits {
  balance: number;
  has_credits: boolean;
}

/**
 * Operation mode for a booth
 */
export interface BoothOperation {
  mode: string;
  mode_display: string;
}

/**
 * Transaction statistics for a booth
 */
export interface BoothTransactions {
  today_count: number;
  last_transaction_at: string | null;
  is_active_today: boolean;
}

/**
 * Revenue information for a booth
 */
export interface BoothRevenue {
  today: number;
}

/**
 * Booth status type from API
 */
/**
 * Booth connectivity status from API
 * - online: Fresh heartbeat received
 * - offline: No heartbeat for extended period
 * - warning: Heartbeat delayed but not offline
 * Note: Hardware errors are indicated separately via has_error field
 */
export type BoothStatus = 'online' | 'offline' | 'warning';

/**
 * Subscription status for a booth
 * @see GET /api/v1/booths/overview
 */
export type BoothSubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';

/**
 * Subscription info embedded in booth overview
 * @see GET /api/v1/booths/overview
 */
export interface BoothSubscription {
  /** Plan ID the booth is subscribed to */
  plan_id: number;
  /** Plan name for display (e.g., "Pro") */
  plan_name: string;
  /** Stripe price ID */
  price_id: string;
  /** Subscription status */
  status: BoothSubscriptionStatus;
  /** End of current billing period (ISO 8601) */
  current_period_end: string;
  /** Whether subscription will cancel at period end */
  cancel_at_period_end: boolean;
}

/**
 * Individual booth in the overview response
 * Note: Some fields may be null if booth data is incomplete
 */
export interface BoothOverviewItem {
  booth_id: string;
  booth_name: string;
  booth_address: string | null;
  booth_status: BoothStatus;
  /** Whether booth has a hardware error */
  has_error: boolean;
  /** Details about the error when has_error is true */
  error_details: string | null;
  credits: BoothCredits | null;
  operation: BoothOperation | null;
  transactions: BoothTransactions | null;
  revenue: BoothRevenue | null;
  last_updated: string;
  /** Subscription info (null if not subscribed) */
  subscription: BoothSubscription | null;
}

/**
 * Complete booth overview response
 * GET /api/v1/booths/overview
 */
export interface BoothOverviewResponse {
  summary: BoothOverviewSummary;
  booths: BoothOverviewItem[];
}

// ============================================
// Dashboard Overview API Types (All Booths)
// GET /api/v1/dashboard/overview
// ============================================

/**
 * Summary counts for dashboard overview
 */
export interface DashboardSummary {
  total_booths: number;
  online_count: number;
  offline_count: number;
  error_count: number;
}

/**
 * Revenue stats for a time period
 */
export interface DashboardRevenuePeriod {
  amount: number;
  transactions: number;
  average: number;
  change: number;
}

/**
 * Revenue stats across all periods
 */
export interface DashboardRevenue {
  today: DashboardRevenuePeriod;
  week: DashboardRevenuePeriod;
  month: DashboardRevenuePeriod;
  year: DashboardRevenuePeriod;
}

/**
 * Payment breakdown for a single period
 */
export interface DashboardPaymentPeriod {
  cash: number;
  card: number;
  manual: number;
}

/**
 * Payment breakdown across all periods
 */
export interface DashboardPaymentBreakdown {
  today: DashboardPaymentPeriod;
  week: DashboardPaymentPeriod;
  month: DashboardPaymentPeriod;
  year: DashboardPaymentPeriod;
}

/**
 * Upsale values for a single period (all booths aggregated)
 * Tracks extra copies and cross-sell revenue
 */
export interface DashboardUpsalePeriod {
  extra_copies_revenue: number;
  cross_sell_revenue: number;
  extra_copies_count: number;
  cross_sell_count: number;
}

/**
 * Upsale breakdown across all periods (all booths aggregated)
 */
export interface DashboardUpsaleBreakdown {
  today: DashboardUpsalePeriod;
  week: DashboardUpsalePeriod;
  month: DashboardUpsalePeriod;
  year: DashboardUpsalePeriod;
}

/**
 * Printer status counts
 */
export interface PrinterSummary {
  online: number;
  error: number;
  offline: number;
}

/**
 * Payment controller status counts
 */
export interface PaymentControllerSummary {
  connected: number;
  disconnected: number;
  not_configured: number;
}

/**
 * Hardware summary across all booths
 */
export interface DashboardHardwareSummary {
  printers: PrinterSummary;
  payment_controllers: PaymentControllerSummary;
}

/**
 * Alert in dashboard overview
 */
export interface DashboardAlert {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  booth_id: string;
  booth_name: string;
  category: string;
  is_read: boolean;
  timestamp: string;
}

/**
 * Complete dashboard overview response (all booths aggregated)
 * GET /api/v1/dashboard/overview
 */
export interface DashboardOverviewResponse {
  summary: DashboardSummary;
  revenue: DashboardRevenue;
  payment_breakdown: DashboardPaymentBreakdown;
  upsale_breakdown: DashboardUpsaleBreakdown;
  hardware_summary: DashboardHardwareSummary;
  recent_alerts: DashboardAlert[];
  alerts_count: number;
}

// ============================================================================
// PRICING TYPES
// ============================================================================

/**
 * Request body for updating booth pricing
 * PUT /api/v1/booths/{booth_id}/pricing
 */
export interface UpdatePricingRequest {
  /** Photo strips base price */
  photo_strips_price?: number;
  /** 4x6 photo base price */
  photo_4x6_price?: number;
  /** Smartphone print base price */
  smartphone_print_price?: number;
  /** Photo strips extra copy price */
  strips_extra_copy_price?: number;
  /** Photo strips multiple copy discount percentage */
  strips_multiple_copy_discount?: number;
  /** 4x6 photo extra copy price */
  photo_4x6_extra_copy_price?: number;
  /** 4x6 photo multiple copy discount percentage */
  photo_4x6_multiple_copy_discount?: number;
  /** Smartphone print extra copy price */
  smartphone_extra_copy_price?: number;
  /** Smartphone print multiple copy discount percentage */
  smartphone_multiple_copy_discount?: number;
  /** Reason for the price update */
  reason?: string;
}

/**
 * Pricing info for a single product
 */
export interface ProductPricingInfo {
  price: number;
  extra_copy_price: number;
  multiple_copy_discount: number;
}

/**
 * Response from pricing update endpoint
 * PATCH /api/v1/booths/{booth_id}/pricing
 */
export interface UpdatePricingResponse {
  command_id: number;
  booth_id: string;
  updates: {
    PhotoStrips?: ProductPricingInfo;
    Photo4x6?: ProductPricingInfo;
    SmartphonePrint?: ProductPricingInfo;
  };
  status: "delivered" | "pending" | "failed";
  message: string;
}

/**
 * Response from pricing GET endpoint
 * GET /api/v1/booths/{booth_id}/pricing
 */
export interface BoothPricingResponse {
  booth_id: string;
  booth_name: string;
  pricing: {
    PhotoStrips?: ProductPricingInfo;
    Photo4x6?: ProductPricingInfo;
    SmartphonePrint?: ProductPricingInfo;
  };
  last_updated: string;
}

// ============================================================================
// RESTART COMMAND TYPES
// ============================================================================

/**
 * Request body for restart commands
 * @see POST /api/v1/booths/{booth_id}/restart-app
 * @see POST /api/v1/booths/{booth_id}/restart-system
 */
export interface RestartRequest {
  /** Delay in seconds before restart (default: 5 for app, 15 for system) */
  delay_seconds?: number;
  /** Force restart even if operations in progress */
  force?: boolean;
}

/**
 * Response from restart-app endpoint
 * POST /api/v1/booths/{booth_id}/restart-app
 */
export interface RestartAppResponse {
  command_id: number;
  booth_id: string;
  command_type: "restart_app";
  status: "delivered" | "pending" | "failed";
  message: string;
  delay_seconds: number;
}

/**
 * Response from restart-system endpoint
 * POST /api/v1/booths/{booth_id}/restart-system
 */
export interface RestartSystemResponse {
  command_id: number;
  booth_id: string;
  command_type: "restart_system";
  status: "delivered" | "pending" | "failed";
  message: string;
  delay_seconds: number;
}

/**
 * Response from cancel-restart endpoint
 * POST /api/v1/booths/{booth_id}/cancel-restart
 */
export interface CancelRestartResponse {
  command_id: number;
  booth_id: string;
  status: "delivered" | "pending" | "failed";
  message: string;
}

// ============================================================================
// BOOTH CREDENTIALS TYPES
// ============================================================================

/**
 * Response from booth credentials endpoint
 * Used for reconnecting booth - contains API key, QR code, and registration code
 * @see GET /api/v1/booths/{booth_id}/credentials
 */
export interface BoothCredentialsResponse {
  id: string;
  api_key: string;
  /** 6-digit registration code for easy booth connection (e.g., "7RR8B6") */
  registration_code: string;
  /** ISO timestamp when the registration code expires */
  code_expires_at: string;
  qr_code: string;
  message: string;
}

/**
 * Response from generate code endpoint
 * Generates a new 6-digit registration code for easy booth setup
 * @see POST /api/v1/booths/{booth_id}/generate-code
 */
export interface GenerateCodeResponse {
  booth_id: string;
  /** 6-character alphanumeric registration code (e.g., "A7X92K") */
  code: string;
  /** ISO timestamp when the code expires */
  expires_at: string;
  /** Minutes until expiration (default: 15) */
  expires_in_minutes: number;
}

// ============================================================================
// DELETE BOOTH TYPES
// ============================================================================

/**
 * Response from delete booth endpoint
 * @see DELETE /api/v1/booths/{booth_id}
 */
export interface DeleteBoothResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// SYNC TEMPLATES TYPES
// ============================================================================

/**
 * Response from sync-templates endpoint
 * @see POST /api/v1/booths/{booth_id}/sync-templates
 */
export interface SyncTemplatesResponse {
  command_id: number;
  booth_id: string;
  status: "delivered" | "queued";
  message: string;
}

// ============================================================================
// BUSINESS SETTINGS TYPES
// ============================================================================

/**
 * Response from booth business settings endpoint
 * @see GET /api/v1/booths/{booth_id}/business-settings
 */
export interface BoothBusinessSettingsResponse {
  /** Account-level business name */
  business_name: string | null;
  /** Presigned URL for the effective logo (custom if overridden, otherwise account) */
  logo_url: string | null;
  /** Presigned URL for the booth's own uploaded custom logo, or null if none */
  custom_logo_url: string | null;
  /** Whether this booth uses a custom logo override */
  use_custom_logo: boolean;
  /** Whether to show logo on printed photos */
  show_logo_on_prints: boolean;
  /** Booth physical address */
  address: string | null;
  /** Whether to show the business name on the welcome screen */
  show_business_name: boolean;
  /** Whether to show the logo on the welcome screen */
  show_logo: boolean;
  /** Custom welcome screen subtitle text */
  welcome_subtitle: string | null;
  /** Whether to show the subtitle on the welcome screen */
  show_welcome_subtitle: boolean;
}

/**
 * Request body for updating booth settings
 * @see PATCH /api/v1/booths/{booth_id}
 */
export interface UpdateBoothSettingsRequest {
  /** Booth name (1-100 chars) */
  name?: string;
  /** Physical location (max 500 chars) */
  address?: string;
  /** true = use custom booth logo, false = use account logo */
  use_custom_logo?: boolean;
  /** Whether to show the logo on printed photos */
  show_logo_on_prints?: boolean;
  /** Whether to show the business name on the welcome screen */
  show_business_name?: boolean;
  /** Whether to show the logo on the welcome screen */
  show_logo?: boolean;
  /** Custom welcome screen subtitle (max 255 chars). null to use default */
  welcome_subtitle?: string | null;
  /** Whether to show the subtitle on the welcome screen */
  show_welcome_subtitle?: boolean;
}

/**
 * Response from booth settings update
 * @see PATCH /api/v1/booths/{booth_id}
 */
export interface UpdateBoothSettingsResponse {
  id: string;
  name: string;
  owner_id: string;
  address: string | null;
  use_custom_logo: boolean;
  /** Presigned URL for the effective logo */
  logo_url: string | null;
  show_logo_on_prints: boolean;
  show_business_name: boolean;
  show_logo: boolean;
  welcome_subtitle: string | null;
  show_welcome_subtitle: boolean;
  status: 'online' | 'offline' | 'warning';
  last_heartbeat: string | null;
  last_sync: string | null;
  created_at: string;
  subscription: BoothSubscription | null;
}

// ============================================================================
// EMERGENCY PASSWORD TYPES
// ============================================================================

/**
 * Request body for generating a self-service emergency password
 * @see POST /api/v1/booths/{booth_id}/emergency-password
 */
export interface EmergencyPasswordRequest {
  /** Password validity in minutes (5-30, default: 15) */
  validity_minutes?: number;
  /** Reason for emergency access (10-500 chars) */
  reason: string;
}

/**
 * Response from emergency password generation endpoint
 * Note: The actual password is emailed and never returned in the response
 * @see POST /api/v1/booths/{booth_id}/emergency-password
 */
export interface EmergencyPasswordResponse {
  message: string;
  booth_id: string;
  booth_name: string;
  /** ISO timestamp when password expires */
  expires_at: string;
  validity_minutes: number;
  /** Partially masked email for confirmation (e.g., "jo***@example.com") */
  emailed_to: string;
  /** ISO timestamp when password was issued */
  issued_at: string;
}

