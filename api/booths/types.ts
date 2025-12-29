import { z } from "zod";

/**
 * Booth API Types
 * 
 * Types for booth creation and management.
 * @see /api/v1/booths endpoint
 */

/**
 * Schema for creating a new booth
 */
export const CreateBoothRequestSchema = z.object({
  name: z.string().min(1, "Booth name is required").max(100, "Booth name is too long"),
  address: z.string().min(1, "Address is required").max(200, "Address is too long"),
});

export type CreateBoothRequest = z.infer<typeof CreateBoothRequestSchema>;

/**
 * Response from booth creation endpoint
 * POST /api/v1/booths
 */
export interface CreateBoothResponse {
  id: string;
  name: string;
  owner_id: string;
  api_key: string;
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
  status?: 'online' | 'offline' | 'warning' | 'error';
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
  status: 'online' | 'offline' | 'warning' | 'error';
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
  model: string | null;
  status: string;
  error: string | null;
  total_captures: number;
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
  booth_status: 'online' | 'offline' | 'warning' | 'error';
  last_heartbeat: string | null;
  last_heartbeat_ago: string;
  revenue: BoothDetailRevenue;
  payment_breakdown: BoothPaymentBreakdown;
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
export type BoothStatus = 'online' | 'offline';

/**
 * Individual booth in the overview response
 * Note: Some fields may be null if booth data is incomplete
 */
export interface BoothOverviewItem {
  booth_id: string;
  booth_name: string;
  booth_address: string | null;
  booth_status: BoothStatus;
  credits: BoothCredits | null;
  operation: BoothOperation | null;
  transactions: BoothTransactions | null;
  revenue: BoothRevenue | null;
  last_updated: string;
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
  hardware_summary: DashboardHardwareSummary;
  recent_alerts: DashboardAlert[];
  alerts_count: number;
}

