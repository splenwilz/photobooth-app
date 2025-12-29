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

import React, { useState, useMemo } from "react";
import {
	StyleSheet,
	View,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { CustomHeader } from "@/components/custom-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	Spacing,
	BorderRadius,
	BRAND_COLOR,
	StatusColors,
	withAlpha,
} from "@/constants/theme";

// API hooks for real data
import { useRevenueDashboard, useBoothRevenue } from "@/api/analytics/queries";
import type { RecentTransaction } from "@/api/analytics/types";
// Global booth selection store
import { ALL_BOOTHS_ID, useBoothStore } from "@/stores/booth-store";

type ChartPeriod = "week" | "month";

/**
 * Simple bar chart component using brand color
 */
const SimpleBarChart: React.FC<{
	data: { date: string; amount: number }[];
	maxValue: number;
	tint: string;
	textSecondary: string;
}> = ({ data, maxValue, tint, textSecondary }) => {
	return (
		<View style={chartStyles.container}>
			<View style={chartStyles.barsContainer}>
				{data.map((item, index) => {
					// Handle case where maxValue is 0 to avoid NaN
					const heightPercent =
						maxValue > 0 ? (item.amount / maxValue) * 100 : 0;
					// Use opacity variations of brand color for visual interest
					const opacity = 0.6 + (index / data.length) * 0.4;
					return (
						<View key={index} style={chartStyles.barWrapper}>
							<View style={chartStyles.barContainer}>
								<View
									style={[
										chartStyles.bar,
										{
											height: `${heightPercent}%`,
											backgroundColor: withAlpha(tint, opacity),
										},
									]}
								/>
							</View>
							<ThemedText
								style={[chartStyles.barLabel, { color: textSecondary }]}
							>
								{item.date}
							</ThemedText>
						</View>
					);
				})}
			</View>
		</View>
	);
};

const chartStyles = StyleSheet.create({
	container: {
		height: 160,
		marginTop: Spacing.sm,
	},
	barsContainer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
	},
	barWrapper: {
		flex: 1,
		alignItems: "center",
	},
	barContainer: {
		flex: 1,
		width: "70%",
		justifyContent: "flex-end",
	},
	bar: {
		width: "100%",
		borderRadius: 4,
		minHeight: 4,
	},
	barLabel: {
		fontSize: 10,
		marginTop: 4,
	},
});

/**
 * Format product name from API (e.g., "photo_4x6" -> "Photo 4x6")
 */
function formatProductName(name: string): string {
	return name
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * Format payment method from API (e.g., "credit" -> "Credit")
 */
function formatPaymentMethod(method: string): string {
	return method.charAt(0).toUpperCase() + method.slice(1);
}

/**
 * Get print status display and color
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
	const isRefetching = isFocused && ((isAllMode && isRefetchingAll) || (!isAllMode && isRefetchingBooth));

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

	// Format currency
	const formatCurrency = (amount: number): string => {
		return `$${amount.toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})}`;
	};

	// Format time
	const formatTime = (timestamp: string): string => {
		const date = new Date(timestamp);
		return date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
		});
	};

	// Loading state
	if (isLoading) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
				<CustomHeader title="Analytics" />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
					<ThemedText style={[styles.loadingText, { color: textSecondary }]}>
						Loading analytics...
					</ThemedText>
				</View>
			</SafeAreaView>
		);
	}

	// Error state
	if (error) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
				<CustomHeader title="Analytics" />
				<View style={styles.errorContainer}>
					<IconSymbol
						name="exclamationmark.triangle.fill"
						size={48}
						color={StatusColors.error}
					/>
					<ThemedText style={styles.errorTitle}>
						Failed to load analytics
					</ThemedText>
					<ThemedText style={[styles.errorMessage, { color: textSecondary }]}>
						{error.message || "An unexpected error occurred"}
					</ThemedText>
					<TouchableOpacity
						style={[styles.retryButton, { backgroundColor: BRAND_COLOR }]}
						onPress={() => refetch()}
					>
						<ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
					</TouchableOpacity>
				</View>
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
	const boothName = !isAllMode && boothData?.booth_name ? boothData.booth_name : null;

	return (
		<SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
			<CustomHeader title="Analytics" />

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
						subtitle={isAllMode ? "All booths combined" : boothName ?? "Selected booth"}
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
						subtitle={
							chartPeriod === "week" ? "Last 7 days" : "Last 12 months"
						}
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
											{ color: chartPeriod === "week" ? "white" : textSecondary },
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
												color: chartPeriod === "month" ? "white" : textSecondary,
											},
										]}
									>
										Month
									</ThemedText>
								</TouchableOpacity>
							</View>
						}
					/>

					<View style={[styles.chartCard, { backgroundColor: cardBg, borderColor }]}>
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

				{/* Revenue Breakdown - Using brand color with opacity */}
				<View style={styles.section}>
					<SectionHeader
						title="Revenue Breakdown"
						subtitle="By product type"
					/>

					<View style={[styles.breakdownCard, { backgroundColor: cardBg, borderColor }]}>
						{byProduct.length > 0 ? (
							byProduct.map((item, index) => {
								// Use progressively lighter opacity for each item
								const opacity = 1 - index * 0.2;
								const itemColor = withAlpha(BRAND_COLOR, Math.max(0.4, opacity));

								return (
									<View key={item.name} style={styles.breakdownItem}>
										<View style={styles.breakdownHeader}>
											<View style={styles.breakdownLabelRow}>
												<View
													style={[
														styles.breakdownDot,
														{ backgroundColor: itemColor },
													]}
												/>
												<ThemedText style={styles.breakdownLabel}>
													{formatProductName(item.name)}
												</ThemedText>
											</View>
											<ThemedText type="defaultSemiBold">
												{formatCurrency(item.value)}
											</ThemedText>
										</View>
										<View style={styles.breakdownBarTrack}>
											<View
												style={[
													styles.breakdownBarFill,
													{
														width: `${item.percentage}%`,
														backgroundColor: itemColor,
													},
												]}
											/>
										</View>
										<ThemedText
											style={[styles.breakdownPercent, { color: textSecondary }]}
										>
											{item.percentage}%
										</ThemedText>
									</View>
								);
							})
						) : (
							<ThemedText style={{ color: textSecondary, textAlign: "center" }}>
								No product data available
							</ThemedText>
						)}
					</View>
				</View>

				{/* Payment Method Breakdown */}
				<View style={styles.section}>
					<SectionHeader
						title="Payment Methods"
						subtitle="Revenue by payment type"
					/>

					<View style={[styles.breakdownCard, { backgroundColor: cardBg, borderColor }]}>
						{byPayment.length > 0 ? (
							byPayment.map((item, index) => {
								const opacity = 1 - index * 0.25;
								const itemColor = withAlpha(BRAND_COLOR, Math.max(0.4, opacity));

								return (
									<View key={item.name} style={styles.breakdownItem}>
										<View style={styles.breakdownHeader}>
											<View style={styles.breakdownLabelRow}>
												<View
													style={[
														styles.breakdownDot,
														{ backgroundColor: itemColor },
													]}
												/>
												<ThemedText style={styles.breakdownLabel}>
													{formatPaymentMethod(item.name)}
												</ThemedText>
											</View>
											<ThemedText type="defaultSemiBold">
												{formatCurrency(item.value)}
											</ThemedText>
										</View>
										<View style={styles.breakdownBarTrack}>
											<View
												style={[
													styles.breakdownBarFill,
													{
														width: `${item.percentage}%`,
														backgroundColor: itemColor,
													},
												]}
											/>
										</View>
										<ThemedText
											style={[styles.breakdownPercent, { color: textSecondary }]}
										>
											{item.percentage}%
										</ThemedText>
									</View>
								);
							})
						) : (
							<ThemedText style={{ color: textSecondary, textAlign: "center" }}>
								No payment data available
							</ThemedText>
						)}
					</View>
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
						<View style={[styles.emptyTransactions, { backgroundColor: cardBg, borderColor }]}>
							<IconSymbol name="doc.text" size={32} color={textSecondary} />
							<ThemedText style={{ color: textSecondary, marginTop: Spacing.sm }}>
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
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: Spacing.xl,
	},
	errorTitle: {
		fontSize: 18,
		fontWeight: "600",
		marginTop: Spacing.md,
		textAlign: "center",
	},
	errorMessage: {
		fontSize: 14,
		marginTop: Spacing.sm,
		textAlign: "center",
	},
	retryButton: {
		marginTop: Spacing.lg,
		paddingVertical: Spacing.sm,
		paddingHorizontal: Spacing.xl,
		borderRadius: BorderRadius.md,
	},
	retryButtonText: {
		color: "#FFFFFF",
		fontWeight: "600",
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
	breakdownCard: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	breakdownItem: {
		marginBottom: Spacing.md,
	},
	breakdownHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 6,
	},
	breakdownLabelRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	breakdownDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		marginRight: Spacing.sm,
	},
	breakdownLabel: {
		fontSize: 14,
	},
	breakdownBarTrack: {
		height: 8,
		backgroundColor: "rgba(255,255,255,0.1)",
		borderRadius: 4,
		overflow: "hidden",
	},
	breakdownBarFill: {
		height: "100%",
		borderRadius: 4,
	},
	breakdownPercent: {
		fontSize: 11,
		marginTop: 4,
		textAlign: "right",
	},
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
