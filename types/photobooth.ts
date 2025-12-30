/**
 * TypeScript Types for PhotoBoothX Mobile App
 * 
 * These types define the data structures used throughout the app.
 * They mirror the API contracts from the backend.
 */

/**
 * Booth status indicating online/offline/warning/error state
 * @see GET /api/v1/booths/overview - API returns these status values
 */
export type BoothStatus = 'online' | 'offline' | 'warning' | 'error';

/**
 * Operation mode for the photobooth
 * - coin: Pay-per-use with coins/cash/card
 * - freeplay: Free unlimited use (events, promotions)
 */
export type OperationMode = 'coin' | 'freeplay';

/**
 * Photobooth entity
 * Represents a single photobooth unit
 */
export interface Booth {
  id: string;
  name: string;
  location: string;
  status: BoothStatus;
  lastSeen?: string; // ISO timestamp (deprecated, use lastUpdated)
  operationMode: OperationMode;
  todayRevenue: number;
  todayTransactions: number;
  /** Credit balance for the booth */
  credits?: number;
  /** Last updated timestamp from API */
  lastUpdated?: string;
}

/**
 * Hardware component health status
 */
export type ComponentStatus = 'healthy' | 'warning' | 'error' | 'unknown';

/**
 * Camera hardware details
 */
export interface CameraStatus {
  status: ComponentStatus;
  model: string;
  resolution: string;
  lastCapture: string; // ISO timestamp
  totalCaptures: number;
}

/**
 * Printer hardware details with supply levels
 */
export interface PrinterStatus {
  status: ComponentStatus;
  model: string;
  paperRemaining: number; // percentage 0-100
  inkRemaining: number;   // percentage 0-100
  totalPrints: number;
  lastPrint: string; // ISO timestamp
  estimatedPrintsRemaining: number;
}

/**
 * Payment controller details
 */
export interface PaymentControllerStatus {
  status: ComponentStatus;
  type: string;
  coinAcceptor: boolean;
  billAcceptor: boolean;
  cardReader: boolean;
  lastTransaction: string; // ISO timestamp
  todayTransactions: number;
}

/**
 * System information
 */
export interface SystemStatus {
  status: ComponentStatus;
  osVersion: string;
  appVersion: string;
  uptime: string;        // System/OS uptime
  boothUptime?: string;  // Booth software running time
  diskUsage: number;     // percentage 0-100
  memoryUsage: number;   // percentage 0-100
  cpuUsage: number;      // percentage 0-100
}

/**
 * Complete hardware status for a booth
 */
export interface HardwareStatus {
  boothId: string;
  camera: CameraStatus;
  printer: PrinterStatus;
  paymentController: PaymentControllerStatus;
  system: SystemStatus;
}

/**
 * Payment method types
 */
export type PaymentMethod = 'coin' | 'bill' | 'card' | 'free';

/**
 * Print job status
 */
export type PrintStatus = 'pending' | 'printing' | 'completed' | 'failed';

/**
 * Transaction record
 */
export interface Transaction {
  id: string;
  boothId: string;
  boothName: string;
  timestamp: string; // ISO timestamp
  product: string;
  template: string;
  copies: number;
  amount: number;
  paymentMethod: PaymentMethod;
  printStatus: PrintStatus;
}

/**
 * Alert severity levels
 */
export type AlertType = 'critical' | 'warning' | 'info';

/**
 * Alert categories for filtering
 */
export type AlertCategory = 'hardware' | 'supplies' | 'connectivity' | 'sales';

/**
 * Alert/Notification entity
 */
export interface Alert {
  id: string;
  boothId: string;
  boothName: string;
  type: AlertType;
  category: AlertCategory;
  title: string;
  message: string;
  timestamp: string; // ISO timestamp
  isRead: boolean;
}

/**
 * Revenue period statistics
 */
export interface RevenuePeriod {
  amount: number;
  transactions: number;
  change: number; // percentage change vs previous period
  /** Revenue from cash/coin payments */
  cashAmount?: number;
  /** Revenue from credit/card payments */
  creditAmount?: number;
}

/**
 * Aggregated revenue statistics
 */
export interface RevenueStats {
  today: RevenuePeriod;
  week: RevenuePeriod;
  month: RevenuePeriod;
  year: RevenuePeriod;
}

/**
 * Product configuration
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  extraCopyPrice: number;
  enabled: boolean;
  popularityRank: number;
}

/**
 * Credit transaction type
 */
export type CreditType = 'add' | 'deduct' | 'reset';

/**
 * Credit history entry
 */
export interface CreditHistory {
  id: string;
  boothId: string;
  type: CreditType;
  amount: number;
  balance: number;
  timestamp: string; // ISO timestamp
  note?: string;
}

