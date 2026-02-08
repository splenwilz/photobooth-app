/**
 * Analytics Screen
 *
 * Sales and revenue analytics with charts, breakdowns, and transaction history.
 * Uses cohesive brand color with opacity variations for visual hierarchy.
 *
 * Features:
 * - Revenue chart (daily/weekly view)
 * - Revenue breakdown by product type
 * - Revenue breakdown by payment method
 * - Transaction history with filters
 *
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 * @see GET /api/v1/analytics/revenue/dashboard - API endpoint
 */

import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
	RefreshControl,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// API hooks for real data
import { useAlerts } from "@/api/alerts/queries";
import { useBoothRevenue, useRevenueDashboard } from "@/api/analytics/queries";
import type { RecentTransaction } from "@/api/analytics/types";
import { CustomHeader } from "@/components/custom-header";
import { AnalyticsSkeleton } from "@/components/skeletons";
import { ThemedText } from "@/components/themed-text";
// Extracted components for reusability
import { BreakdownCard } from "@/components/ui/breakdown-card";
import { ErrorState } from "@/components/ui/error-state";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SectionHeader } from "@/components/ui/section-header";
import { SimpleBarChart } from "@/components/ui/simple-bar-chart";
import { StatCard } from "@/components/ui/stat-card";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	StatusColors,
	withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
// Global booth selection store
import { ALL_BOOTHS_ID, useBoothStore } from "@/stores/booth-store";
// Utilities - extracted for separation of concerns
import {
	formatCurrency,
	formatPaymentMethod,
	formatProductName,
} from "@/utils";

type ChartPeriod = "week" | "month";

/**
 * Get print status display and color
 * @see StatusColors - Theme status colors
 */
function getPrintStatusConfig(status: RecentTransaction["print_status"]): {
	label: string;
	color: string;
} {
	switch (status) {
		case "completed":
			return { label: "Printed", color: StatusColors.success };
		case "pending":
			return { label: "Pending", color: StatusColors.warning };
		case "failed":
			return { label: "Failed", color: StatusColors.error };
		default:
			return { label: status, color: StatusColors.warning };
	}
}

/**
 * Analytics Screen Component
 */
export default function AnalyticsScreen() {
	const backgroundColor = useThemeColor({}, "background");
	const tint = useThemeColor({}, "tint");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	// Track if screen is focused - prevents refresh indicator from freezing when navigating
	const isFocused = useIsFocused();

	// Fetch alerts for notification badge
	// @see GET /api/v1/analytics/alerts
	// Error handling: If alerts fail to load, badge will show 0 (non-critical)
	const { data: alertsData } = useAlerts();
	const unreadAlerts = useMemo(() => {
		if (!alertsData?.alerts) return 0;
		return alertsData.alerts.filter((a) => !a.isRead).length;
	}, [alertsData?.alerts]);

	// Navigation handlers
	const handleNotificationPress = () => {
		router.push("/(tabs)/alerts");
	};

	// Global booth selection from Zustand store
	const { selectedBoothId } = useBoothStore();

	// Check if we're in "All Booths" mode - computed directly from state for reactivity
	const isAllMode = selectedBoothId === ALL_BOOTHS_ID;

	// Fetch aggregated revenue data (all booths) - only when in "all" mode
	const {
		data: allBoothsData,
		isLoading: isLoadingAll,
		error: errorAll,
		refetch: refetchAll,
		isRefetching: isRefetchingAll,
	} = useRevenueDashboard({ recent_limit: 10 }, { enabled: isAllMode });

	// Fetch individual booth revenue data - only when in single booth mode
	const {
		data: boothData,
		isLoading: isLoadingBooth,
		error: errorBooth,
		refetch: refetchBooth,
		isRefetching: isRefetchingBooth,
	} = useBoothRevenue(isAllMode ? null : selectedBoothId, { recent_limit: 10 });

	// Unified data access - both APIs return same structure
	const dashboardData = isAllMode ? allBoothsData : boothData;
	const isLoading = isAllMode ? isLoadingAll : isLoadingBooth;
	const error = isAllMode ? errorAll : errorBooth;
	const refetch = isAllMode ? refetchAll : refetchBooth;
	// Only true if:
	// 1. Screen is focused (prevents frozen loader when navigating between tabs)
	// 2. The ACTIVE query is refetching (prevents stale state from disabled queries)
	const isRefetching =
		isFocused &&
		((isAllMode && isRefetchingAll) || (!isAllMode && isRefetchingBooth));

	// State for chart period toggle
	const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("week");

	// Get chart data based on selected period
	const chartData = useMemo(() => {
		if (!dashboardData) return [];
		return chartPeriod === "week"
			? dashboardData.daily_chart
			: dashboardData.monthly_chart;
	}, [dashboardData, chartPeriod]);

	// Calculate max value for chart scaling based on current data
	const maxChartValue = useMemo(() => {
		if (chartData.length === 0) return 1;
		const maxAmount = Math.max(...chartData.map((d) => d.amount));
		// Return at least 1 to avoid division by zero, multiply by 1.1 for padding
		return Math.max(maxAmount * 1.1, 1);
	}, [chartData]);

	// Format time
	const formatTime = (timestamp: string): string => {
		const date = new Date(timestamp);
		return date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
		});
	};

	// Loading state - skeleton for polished loading experience
	if (isLoading) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader
					title="Analytics"
					onNotificationPress={handleNotificationPress}
					notificationCount={unreadAlerts}
				/>
				<AnalyticsSkeleton />
			</SafeAreaView>
		);
	}

	// Error state
	if (error) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader
					title="Analytics"
					onNotificationPress={handleNotificationPress}
					notificationCount={unreadAlerts}
				/>
				<ErrorState
					title="Failed to load analytics"
					message={error.message || "An unexpected error occurred"}
					onRetry={() => refetch()}
				/>
			</SafeAreaView>
		);
	}

	// Main content with data
	const stats = dashboardData?.stats;
	const byProduct = dashboardData?.by_product || [];
	const byPayment = dashboardData?.by_payment || [];
	// Access transactions from nested data property (API returns { data, pagination })
	const transactions = dashboardData?.recent_transactions?.data || [];

	// Get booth name for display (only available in single booth mode)
	const boothName =
		!isAllMode && boothData?.booth_name ? boothData.booth_name : null;

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor }]}
			edges={["top"]}
		>
			<CustomHeader
				title="Analytics"
				onNotificationPress={handleNotificationPress}
				notificationCount={unreadAlerts}
			/>

			<ScrollView
				style={styles.content}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefetching}
						onRefresh={refetch}
						tintColor={tint}
					/>
				}
			>
				{/* Revenue Overview */}
				<View style={styles.section}>
					<SectionHeader
						title="Revenue Overview"
						subtitle={
							isAllMode
								? "All booths combined"
								: (boothName ?? "Selected booth")
						}
					/>

					<View style={styles.statsGrid}>
						<View style={styles.statsRow}>
							<StatCard
								label="Today"
								value={formatCurrency(stats?.today.amount || 0)}
								change={stats?.today.change}
							/>
							<View style={{ width: Spacing.sm }} />
							<StatCard
								label="This Week"
								value={formatCurrency(stats?.week.amount || 0)}
								change={stats?.week.change}
							/>
						</View>
						<View style={styles.statsRow}>
							<StatCard
								label="This Month"
								value={formatCurrency(stats?.month.amount || 0)}
								change={stats?.month.change}
							/>
							<View style={{ width: Spacing.sm }} />
							<StatCard
								label="This Year"
								value={formatCurrency(stats?.year.amount || 0)}
								change={stats?.year.change}
							/>
						</View>
					</View>
				</View>

				{/* Revenue Chart */}
				<View style={styles.section}>
					<SectionHeader
						title={chartPeriod === "week" ? "Daily Revenue" : "Monthly Revenue"}
						subtitle={chartPeriod === "week" ? "Last 7 days" : "Last 12 months"}
						rightAction={
							<View style={styles.chartToggle}>
								<TouchableOpacity
									style={[
										styles.chartToggleButton,
										chartPeriod === "week" && { backgroundColor: tint },
									]}
									onPress={() => setChartPeriod("week")}
								>
									<ThemedText
										style={[
											styles.chartToggleText,
											{
												color: chartPeriod === "week" ? "white" : textSecondary,
											},
										]}
									>
										Week
									</ThemedText>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.chartToggleButton,
										chartPeriod === "month" && { backgroundColor: tint },
									]}
									onPress={() => setChartPeriod("month")}
								>
									<ThemedText
										style={[
											styles.chartToggleText,
											{
												color:
													chartPeriod === "month" ? "white" : textSecondary,
											},
										]}
									>
										Month
									</ThemedText>
								</TouchableOpacity>
							</View>
						}
					/>

					<View
						style={[styles.chartCard, { backgroundColor: cardBg, borderColor }]}
					>
						{chartData.length > 0 ? (
							<SimpleBarChart
								data={chartData}
								maxValue={maxChartValue}
								tint={tint}
								textSecondary={textSecondary}
							/>
						) : (
							<View style={styles.emptyChart}>
								<ThemedText style={{ color: textSecondary }}>
									No data available
								</ThemedText>
							</View>
						)}
					</View>
				</View>

				{/* Revenue Breakdown - Using extracted BreakdownCard component */}
				<View style={styles.section}>
					<SectionHeader title="Revenue Breakdown" subtitle="By product type" />
					<BreakdownCard
						items={byProduct}
						formatLabel={formatProductName}
						emptyMessage="No product data available"
						opacityStep={0.2}
					/>
				</View>

				{/* Payment Method Breakdown */}
				<View style={styles.section}>
					<SectionHeader
						title="Payment Methods"
						subtitle="Revenue by payment type"
					/>
					<BreakdownCard
						items={byPayment}
						formatLabel={formatPaymentMethod}
						emptyMessage="No payment data available"
						opacityStep={0.25}
					/>
				</View>

				{/* Recent Transactions */}
				<View style={styles.section}>
					<SectionHeader
						title="Recent Transactions"
						subtitle="Latest sales activity"
						showViewAll={transactions.length > 0}
						onViewAllPress={() => router.push("/transactions")}
					/>

					{transactions.length > 0 ? (
						transactions.map((txn) => {
							const statusConfig = getPrintStatusConfig(txn.print_status);
							return (
								<View
									key={txn.id}
									style={[
										styles.transactionCard,
										{ backgroundColor: cardBg, borderColor },
									]}
								>
									<View style={styles.transactionMain}>
										<View style={styles.transactionInfo}>
											<ThemedText
												type="defaultSemiBold"
												style={styles.transactionProduct}
											>
												{formatProductName(txn.product)}
											</ThemedText>
											<ThemedText
												style={[
													styles.transactionDetails,
													{ color: textSecondary },
												]}
											>
												{txn.booth_name} • {txn.template}
											</ThemedText>
										</View>
										<View style={styles.transactionAmount}>
											<ThemedText
												type="defaultSemiBold"
												style={{ color: BRAND_COLOR }}
											>
												{formatCurrency(txn.amount)}
											</ThemedText>
											<ThemedText
												style={[
													styles.transactionTime,
													{ color: textSecondary },
												]}
											>
												{formatTime(txn.timestamp)}
											</ThemedText>
										</View>
									</View>
									<View style={styles.transactionMeta}>
										<View
											style={[
												styles.paymentBadge,
												{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
											]}
										>
											<ThemedText
												style={[styles.paymentText, { color: BRAND_COLOR }]}
											>
												{formatPaymentMethod(txn.payment_method)}
											</ThemedText>
										</View>
										<View
											style={[
												styles.statusBadge,
												{
													backgroundColor: withAlpha(statusConfig.color, 0.15),
												},
											]}
										>
											<ThemedText
												style={[
													styles.statusText,
													{ color: statusConfig.color },
												]}
											>
												{statusConfig.label}
											</ThemedText>
										</View>
									</View>
								</View>
							);
						})
					) : (
						<View
							style={[
								styles.emptyTransactions,
								{ backgroundColor: cardBg, borderColor },
							]}
						>
							<IconSymbol name="doc.text" size={32} color={textSecondary} />
							<ThemedText
								style={{ color: textSecondary, marginTop: Spacing.sm }}
							>
								No transactions yet
							</ThemedText>
						</View>
					)}
				</View>

				{/* Bottom spacing */}
				<View style={{ height: Spacing.xxl }} />
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
		paddingHorizontal: Spacing.lg,
	},
	section: {
		marginTop: Spacing.lg,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		marginTop: Spacing.md,
		fontSize: 16,
	},
	statsGrid: {
		gap: Spacing.sm,
	},
	statsRow: {
		flexDirection: "row",
	},
	chartToggle: {
		flexDirection: "row",
		borderRadius: BorderRadius.md,
		overflow: "hidden",
	},
	chartToggleButton: {
		paddingVertical: 6,
		paddingHorizontal: 12,
	},
	chartToggleText: {
		fontSize: 12,
		fontWeight: "500",
	},
	chartCard: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	emptyChart: {
		height: 160,
		justifyContent: "center",
		alignItems: "center",
	},
	// Note: breakdownCard styles moved to components/ui/breakdown-card.tsx
	transactionCard: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	transactionMain: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: Spacing.sm,
	},
	transactionInfo: {
		flex: 1,
	},
	transactionProduct: {
		fontSize: 14,
		marginBottom: 2,
	},
	transactionDetails: {
		fontSize: 12,
	},
	transactionAmount: {
		alignItems: "flex-end",
	},
	transactionTime: {
		fontSize: 11,
		marginTop: 2,
	},
	transactionMeta: {
		flexDirection: "row",
		gap: Spacing.xs,
	},
	paymentBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: BorderRadius.sm,
	},
	paymentText: {
		fontSize: 11,
		fontWeight: "500",
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: BorderRadius.sm,
	},
	statusText: {
		fontSize: 11,
		fontWeight: "500",
	},
	emptyTransactions: {
		padding: Spacing.xl,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		alignItems: "center",
	},
});
