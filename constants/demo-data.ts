/**
 * Demo Data for PhotoBoothX Mobile App
 *
 * This file contains mock data for development and testing.
 * In production, this data would come from the API.
 *
 * Data structure follows the backend API contracts.
 */

import type {
	Alert,
	Booth,
	CreditHistory,
	HardwareStatus,
	Product,
	RevenueStats,
	Transaction,
} from "@/types/photobooth";

/**
 * Demo Photobooths
 * Simulating a fleet of 4 photobooths at different locations
 */
export const DEMO_BOOTHS: Booth[] = [
	{
		id: "booth-001",
		name: "Mall Central",
		location: "Westfield Shopping Center, Floor 2",
		status: "online",
		lastSeen: new Date().toISOString(),
		operationMode: "coin",
		todayRevenue: 245.5,
		todayTransactions: 47,
	},
	{
		id: "booth-002",
		name: "Downtown Cinema",
		location: "AMC Theater Lobby",
		status: "online",
		lastSeen: new Date().toISOString(),
		operationMode: "coin",
		todayRevenue: 189.0,
		todayTransactions: 36,
	},
	{
		id: "booth-003",
		name: "Beach Pier",
		location: "Santa Monica Pier, Section B",
		status: "warning",
		lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
		operationMode: "coin",
		todayRevenue: 312.75,
		todayTransactions: 62,
	},
	{
		id: "booth-004",
		name: "Convention Center",
		location: "Los Angeles Convention Center",
		status: "offline",
		lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
		operationMode: "freeplay",
		todayRevenue: 0,
		todayTransactions: 0,
	},
];

/**
 * Hardware Status for Mall Central booth
 * Detailed component health monitoring
 */
export const DEMO_HARDWARE_STATUS: HardwareStatus = {
	boothId: "booth-001",
	camera: {
		status: "healthy",
		model: "Canon EOS R5",
		resolution: "45MP",
		lastCapture: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
		totalCaptures: 15420,
	},
	printer: {
		status: "warning",
		model: "DNP DS-RX1HS",
		paperRemaining: 23, // percentage
		inkRemaining: 45, // percentage
		totalPrints: 12890,
		lastPrint: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
		estimatedPrintsRemaining: 46,
	},
	paymentController: {
		status: "healthy",
		type: "Coin + Card",
		coinAcceptor: true,
		billAcceptor: true,
		cardReader: true,
		lastTransaction: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
		todayTransactions: 47,
	},
	system: {
		status: "healthy",
		osVersion: "Windows 11 Pro",
		appVersion: "2.4.1",
		uptime: "5d 14h 32m", // System/OS uptime
		boothUptime: "12d 8h 15m", // Booth software running time
		diskUsage: 34, // percentage
		memoryUsage: 52, // percentage
		cpuUsage: 18, // percentage
	},
};

/**
 * Revenue Statistics
 * Aggregated revenue data for the selected period
 * Includes breakdown by payment method (cash vs credit)
 */
export const DEMO_REVENUE_STATS: RevenueStats = {
	today: {
		amount: 747.25,
		transactions: 145,
		change: 12.5, // percentage vs yesterday
		cashAmount: 298.90, // ~40% cash
		creditAmount: 448.35, // ~60% credit
	},
	week: {
		amount: 4892.5,
		transactions: 892,
		change: 8.2,
		cashAmount: 2201.63, // ~45% cash
		creditAmount: 2690.87, // ~55% credit
	},
	month: {
		amount: 18450.75,
		transactions: 3421,
		change: 15.3,
		cashAmount: 9225.38, // ~50% cash
		creditAmount: 9225.37, // ~50% credit
	},
	year: {
		amount: 198540.0,
		transactions: 38920,
		change: 22.1,
		cashAmount: 89343.0, // ~45% cash
		creditAmount: 109197.0, // ~55% credit
	},
};

/**
 * Revenue breakdown by product type
 */
export const DEMO_REVENUE_BY_PRODUCT = [
	{ name: "Photo Strips", value: 8225.4, percentage: 44.6 },
	{ name: "4x6 Photos", value: 5535.2, percentage: 30.0 },
	{ name: "Phone Prints", value: 3690.15, percentage: 20.0 },
	{ name: "Digital Only", value: 1000.0, percentage: 5.4 },
];

/**
 * Revenue breakdown by payment method
 */
export const DEMO_REVENUE_BY_PAYMENT = [
	{ name: "Cash/Coins", value: 9225.4, percentage: 50.0 },
	{ name: "Credit Card", value: 7377.3, percentage: 40.0 },
	{ name: "Free Play", value: 1848.05, percentage: 10.0 },
];

/**
 * Daily revenue for chart (last 7 days)
 */
/**
 * Daily Revenue - Last 7 days (Week view)
 */
export const DEMO_DAILY_REVENUE = [
	{ date: "Mon", amount: 685.5 },
	{ date: "Tue", amount: 742.25 },
	{ date: "Wed", amount: 598.0 },
	{ date: "Thu", amount: 821.75 },
	{ date: "Fri", amount: 912.5 },
	{ date: "Sat", amount: 1045.25 },
	{ date: "Sun", amount: 747.25 },
];

/**
 * Monthly Revenue - Last 12 months (Month view)
 * Shows aggregated revenue per month for yearly trend
 */
export const DEMO_MONTHLY_REVENUE = [
	{ date: "Jan", amount: 14250.0 },
	{ date: "Feb", amount: 12890.5 },
	{ date: "Mar", amount: 15320.75 },
	{ date: "Apr", amount: 16780.25 },
	{ date: "May", amount: 18450.0 },
	{ date: "Jun", amount: 21200.5 },
	{ date: "Jul", amount: 24500.75 },
	{ date: "Aug", amount: 23100.0 },
	{ date: "Sep", amount: 19850.25 },
	{ date: "Oct", amount: 17650.5 },
	{ date: "Nov", amount: 18950.75 },
	{ date: "Dec", amount: 18450.75 },
];

/**
 * Recent Transactions
 */
export const DEMO_TRANSACTIONS: Transaction[] = [
	{
		id: "txn-001",
		boothId: "booth-001",
		boothName: "Mall Central",
		timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
		product: "Photo Strips",
		template: "Classic Black",
		copies: 2,
		amount: 8.0,
		paymentMethod: "card",
		printStatus: "completed",
	},
	{
		id: "txn-002",
		boothId: "booth-001",
		boothName: "Mall Central",
		timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
		product: "4x6 Photo",
		template: "Vintage Sepia",
		copies: 1,
		amount: 5.0,
		paymentMethod: "coin",
		printStatus: "completed",
	},
	{
		id: "txn-003",
		boothId: "booth-002",
		boothName: "Downtown Cinema",
		timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
		product: "Photo Strips",
		template: "Movie Night",
		copies: 3,
		amount: 12.0,
		paymentMethod: "card",
		printStatus: "completed",
	},
	{
		id: "txn-004",
		boothId: "booth-003",
		boothName: "Beach Pier",
		timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
		product: "Phone Print",
		template: "Summer Vibes",
		copies: 1,
		amount: 3.0,
		paymentMethod: "coin",
		printStatus: "completed",
	},
	{
		id: "txn-005",
		boothId: "booth-003",
		boothName: "Beach Pier",
		timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
		product: "Photo Strips",
		template: "Beach Party",
		copies: 4,
		amount: 16.0,
		paymentMethod: "card",
		printStatus: "failed",
	},
];

/**
 * Alerts and Notifications
 */
export const DEMO_ALERTS: Alert[] = [
	{
		id: "alert-001",
		boothId: "booth-003",
		boothName: "Beach Pier",
		type: "warning",
		category: "supplies",
		title: "Paper Running Low",
		message: "Only 23% paper remaining. Consider restocking soon.",
		timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
		isRead: false,
	},
	{
		id: "alert-002",
		boothId: "booth-004",
		boothName: "Convention Center",
		type: "critical",
		category: "connectivity",
		title: "Booth Offline",
		message: "Lost connection 2 hours ago. Check network status.",
		timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
		isRead: false,
	},
	{
		id: "alert-003",
		boothId: "booth-001",
		boothName: "Mall Central",
		type: "warning",
		category: "supplies",
		title: "Ink Level Low",
		message: "Printer ink at 45%. Estimated 92 prints remaining.",
		timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
		isRead: true,
	},
	{
		id: "alert-004",
		boothId: "booth-002",
		boothName: "Downtown Cinema",
		type: "info",
		category: "sales",
		title: "Daily Revenue Goal Met",
		message: "Congratulations! Downtown Cinema reached $150 daily goal.",
		timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
		isRead: true,
	},
	{
		id: "alert-005",
		boothId: "booth-003",
		boothName: "Beach Pier",
		type: "critical",
		category: "hardware",
		title: "Print Job Failed",
		message: "Transaction txn-005 failed to print. Customer may need refund.",
		timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
		isRead: false,
	},
];

/**
 * Products Configuration
 */
export const DEMO_PRODUCTS: Product[] = [
	{
		id: "product-001",
		name: "Photo Strips",
		description: "Classic 2x6 photo strips with 4 photos",
		basePrice: 4.0,
		extraCopyPrice: 2.0,
		enabled: true,
		popularityRank: 1,
	},
	{
		id: "product-002",
		name: "4x6 Photo",
		description: "Standard 4x6 inch photo print",
		basePrice: 5.0,
		extraCopyPrice: 2.5,
		enabled: true,
		popularityRank: 2,
	},
	{
		id: "product-003",
		name: "Phone Print",
		description: "Photo sent directly to smartphone",
		basePrice: 3.0,
		extraCopyPrice: 0,
		enabled: true,
		popularityRank: 3,
	},
	{
		id: "product-004",
		name: "Digital Only",
		description: "Digital download link via QR code",
		basePrice: 2.0,
		extraCopyPrice: 0,
		enabled: false,
		popularityRank: 4,
	},
];

/**
 * Credit History (for Credits Management screen)
 */
export const DEMO_CREDIT_HISTORY: CreditHistory[] = [
	{
		id: "credit-001",
		boothId: "booth-001",
		type: "add",
		amount: 100,
		balance: 350,
		timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
		note: "Weekly credit top-up",
	},
	{
		id: "credit-002",
		boothId: "booth-001",
		type: "deduct",
		amount: 47,
		balance: 250,
		timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
		note: "Daily transactions",
	},
	{
		id: "credit-003",
		boothId: "booth-001",
		type: "add",
		amount: 50,
		balance: 297,
		timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
		note: "Manual adjustment",
	},
	{
		id: "credit-004",
		boothId: "booth-001",
		type: "reset",
		amount: 0,
		balance: 247,
		timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
		note: "Monthly reset",
	},
];

/**
 * Current credit balance
 */
export const DEMO_CURRENT_CREDITS = {
	boothId: "booth-001",
	balance: 350,
	lastUpdated: new Date().toISOString(),
};

/**
 * Quick add credit amounts
 * Used in Add Credits modal - admin adds credits to booth
 * 1 credit = $1
 */
export const QUICK_CREDIT_AMOUNTS = [50, 100, 250, 500, 1000];
