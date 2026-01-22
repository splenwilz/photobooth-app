/**
 * Dashboard Screen (Home Tab)
 *
 * Core screen of the PhotoBoothX app - "Mission Control" for photobooths.
 * Uses cohesive brand color (Cyan) with status colors only for hardware health.
 *
 * Features:
 * - Booth selector (current booth or all booths)
 * - Hardware health status cards with progress bars
 * - Revenue period selector (Today/Week/Month/Year)
 * - Recent alerts preview
 *
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 */

import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// API hooks
import { useAlerts } from "@/api/alerts/queries";
import { useBoothDetail, useDashboardOverview } from "@/api/booths/queries";
import { CustomHeader } from "@/components/custom-header";
// Dashboard section components - extracted for separation of concerns
import {
  BoothHardwareSection,
  HardwareSummaryCard,
  SystemInfoCard,
} from "@/components/dashboard";
import { DashboardSkeleton } from "@/components/skeletons";
import { ThemedText } from "@/components/themed-text";
import { AlertCard } from "@/components/ui/alert-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { BorderRadius, BRAND_COLOR, Spacing, StatusColors, withAlpha } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ALL_BOOTHS_ID, useBoothStore } from "@/stores/booth-store";
// Utilities - extracted for separation of concerns
import {
  formatCurrency,
  getBoothStatusColor,
  mapBoothAlertToAppAlert,
  mapDashboardAlertToAppAlert,
} from "@/utils";

/** Revenue time period selector type */
type RevenuePeriod = "today" | "week" | "month" | "year";

/**
 * Dashboard Screen Component
 */
export default function DashboardScreen() {
	const backgroundColor = useThemeColor({}, "background");
	const tint = useThemeColor({}, "tint");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	// Track if screen is focused - prevents refresh indicator from freezing when navigating
	const isFocused = useIsFocused();

	// State
	const [selectedPeriod, setSelectedPeriod] = useState<RevenuePeriod>("today");

	// Global booth selection from Zustand store
	const { selectedBoothId, setSelectedBoothId, isHydrated } = useBoothStore();

	// Is a specific booth selected (vs "All Booths")?
	const hasBoothSelected = selectedBoothId !== ALL_BOOTHS_ID && !!selectedBoothId;

	// Fetch booth detail when a specific booth is selected
	const {
		data: boothDetail,
		isLoading: isLoadingDetail,
		refetch: refetchDetail,
		isRefetching: isRefetchingDetail,
	} = useBoothDetail(hasBoothSelected ? selectedBoothId : null);

	// Show "All Booths" mode when no specific booth is selected
	// Note: isAllMode is based on selection state, not data loading state
	const isAllMode = !hasBoothSelected;

	// Always fetch dashboard overview (used as fallback and for "All Booths" mode)
	const {
		data: dashboardOverview,
		isLoading: isLoadingOverview,
		refetch: refetchOverview,
		isRefetching: isRefetchingOverview,
	} = useDashboardOverview({
		enabled: true, // Always fetch - it's our fallback
	});

	// Combined refetching state - only true if:
	// 1. Screen is focused
	// 2. We have data (not initial load)
	// 3. The active query is refetching
	const hasData = isAllMode ? !!dashboardOverview : !!boothDetail;
	const isRefetching =
		isFocused &&
		hasData &&
		((isAllMode && isRefetchingOverview) || (!isAllMode && isRefetchingDetail));

	// Auto-select "all" mode if nothing selected or if selected booth doesn't exist
	useEffect(() => {
		if (isHydrated && !selectedBoothId) {
			setSelectedBoothId(ALL_BOOTHS_ID);
		}
		// Reset to "all" mode if selected booth doesn't exist (deleted or invalid)
		if (hasBoothSelected && !isLoadingDetail && !boothDetail) {
			setSelectedBoothId(ALL_BOOTHS_ID);
		}
	}, [isHydrated, selectedBoothId, setSelectedBoothId, hasBoothSelected, isLoadingDetail, boothDetail]);

	// Fetch alerts for notification badge - uses same API as other screens
	// @see GET /api/v1/analytics/alerts
	const { data: alertsData } = useAlerts();
	const unreadAlerts = alertsData?.alerts?.filter((a) => !a.isRead).length ?? 0;

	// Get revenue stats for selected period - works for both modes
	const revenueStats = isAllMode
		? dashboardOverview?.revenue?.[selectedPeriod]
		: boothDetail?.revenue?.[selectedPeriod];

	// Get payment breakdown for current period - both modes now use period-based structure
	const paymentBreakdown = isAllMode
		? dashboardOverview?.payment_breakdown?.[selectedPeriod]
		: boothDetail?.payment_breakdown?.[selectedPeriod];

	// Get upsale breakdown for current period - tracks extra copies and cross-sells
	const upsaleBreakdown = isAllMode
		? dashboardOverview?.upsale_breakdown?.[selectedPeriod]
		: boothDetail?.upsale_breakdown?.[selectedPeriod];

	// Pull-to-refresh handler - refreshes appropriate data based on mode
	const onRefresh = useCallback(async () => {
		if (isAllMode) {
			await refetchOverview();
		} else {
			await refetchDetail();
		}
	}, [isAllMode, refetchOverview, refetchDetail]);

	// Navigation handlers
	const handleNotificationPress = () => {
		router.push("/(tabs)/alerts");
	};

	const handleViewAllAlerts = () => {
		router.push("/(tabs)/alerts");
	};

	const handleBoothPress = () => {
		router.push("/(tabs)/booths");
	};

	// Loading state - show skeleton during initial load
	// Show loading when:
	// - Store hasn't hydrated yet
	// - Dashboard overview is loading or not yet available (for "All Booths" mode)
	// - Booth detail is loading (for single booth mode)
	// - Booth is selected but no data yet (waiting for useEffect to reset)
	const isInvalidBoothSelection = hasBoothSelected && !isLoadingDetail && !boothDetail;
	const isWaitingForDashboardData = isAllMode && !dashboardOverview;
	const isWaitingForBoothData = !isAllMode && !boothDetail && !isLoadingDetail;
	const isInitialLoading = !isHydrated || isLoadingOverview || (hasBoothSelected && isLoadingDetail);

	// Show skeleton while loading OR while data hasn't arrived yet
	if (isInitialLoading || isInvalidBoothSelection || isWaitingForDashboardData || isWaitingForBoothData) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader title="Dashboard" />
				<DashboardSkeleton isAllBoothsMode={isAllMode} />
			</SafeAreaView>
		);
	}

	// No booths state - check if user has no booths
	// This handles: new signups, all booths deleted
	const hasNoBooths = dashboardOverview?.summary?.total_booths === 0;

	if (hasNoBooths) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader
					title="Dashboard"
					onNotificationPress={handleNotificationPress}
					notificationCount={unreadAlerts}
				/>
				<View style={[styles.container, styles.centered]}>
					<IconSymbol name="photo.stack" size={64} color={textSecondary} />
					<ThemedText type="subtitle" style={styles.emptyTitle}>
						No Booths Yet
					</ThemedText>
					<ThemedText style={[styles.emptySubtitle, { color: textSecondary }]}>
						Create your first booth to get started
					</ThemedText>
					<TouchableOpacity
						style={[styles.createButton, { backgroundColor: BRAND_COLOR }]}
						onPress={() => router.push("/booths/create")}
					>
						<IconSymbol name="plus" size={18} color="white" />
						<ThemedText style={styles.createButtonText}>
							Create Booth
						</ThemedText>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor }]}
			edges={["top"]}
		>
			<CustomHeader
				title="Dashboard"
				onNotificationPress={handleNotificationPress}
				notificationCount={unreadAlerts}
			/>

			<ScrollView
				style={styles.content}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefetching}
						onRefresh={onRefresh}
						tintColor={tint}
						colors={[tint]}
					/>
				}
			>
				{/* Booth Selector Card */}
				<TouchableOpacity
					style={[
						styles.boothSelector,
						{ backgroundColor: cardBg, borderColor },
					]}
					onPress={handleBoothPress}
					activeOpacity={0.7}
				>
					<View style={styles.boothInfo}>
						<View
							style={[
								styles.boothIconContainer,
								{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
							]}
						>
							<IconSymbol
								name={isAllMode ? "rectangle.stack" : "photo.stack"}
								size={20}
								color={BRAND_COLOR}
							/>
						</View>
						<View style={styles.boothTextContainer}>
							<ThemedText type="defaultSemiBold">
								{isAllMode ? "All Booths" : boothDetail?.booth_name}
							</ThemedText>
							<ThemedText
								style={[styles.boothLocation, { color: textSecondary }]}
								numberOfLines={1}
							>
								{isAllMode
									? `${dashboardOverview?.summary?.online_count ?? 0} online · ${dashboardOverview?.summary?.offline_count ?? 0} offline`
									: (boothDetail?.booth_address ?? "No address")}
							</ThemedText>
						</View>
					</View>
					<View style={styles.boothStatusContainer}>
						{/* Show status dot only for single booth mode */}
						{!isAllMode && boothDetail && (
							<View
								style={[
									styles.statusDot,
									{
										backgroundColor: getBoothStatusColor(
											boothDetail.booth_status ?? "offline",
										),
									},
								]}
							/>
						)}
						<IconSymbol name="chevron.right" size={16} color={textSecondary} />
					</View>
				</TouchableOpacity>

				{/* Revenue Overview Section - Works for both modes */}
				{(isAllMode ? dashboardOverview : boothDetail) && (
					<>
						<View style={styles.section}>
							<SectionHeader
								title="Revenue Overview"
								subtitle={
									isAllMode
										? `${dashboardOverview?.summary?.total_booths ?? 0} booths total`
										: "Track your earnings across periods"
								}
							/>

							{/* Period Selector */}
							<View style={styles.periodSelector}>
								{(["today", "week", "month", "year"] as RevenuePeriod[]).map(
									(period) => (
										<TouchableOpacity
											key={period}
											style={[
												styles.periodButton,
												{
													backgroundColor:
														selectedPeriod === period
															? BRAND_COLOR
															: "transparent",
													borderColor:
														selectedPeriod === period
															? BRAND_COLOR
															: borderColor,
												},
											]}
											onPress={() => setSelectedPeriod(period)}
										>
											<ThemedText
												style={[
													styles.periodButtonText,
													{
														color:
															selectedPeriod === period
																? "white"
																: textSecondary,
													},
												]}
											>
												{period.charAt(0).toUpperCase() + period.slice(1)}
											</ThemedText>
										</TouchableOpacity>
									),
								)}
							</View>

							{/* Stats Cards Row */}
							<View style={styles.statsRow}>
								<StatCard
									label="Revenue"
									value={formatCurrency(revenueStats?.amount ?? 0)}
									change={revenueStats?.change}
								/>
								<View style={{ width: Spacing.sm }} />
								<StatCard
									label="Transactions"
									value={(revenueStats?.transactions ?? 0).toLocaleString()}
									subValue={`Avg: ${formatCurrency(revenueStats?.average ?? 0)}`}
								/>
							</View>

							{/* Payment Breakdown - Clean List */}
							<View
								style={[
									styles.breakdownCard,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<ThemedText
									style={[styles.breakdownTitle, { color: textSecondary }]}
								>
									Payment Methods
								</ThemedText>
								
								{/* Cash */}
								<View style={styles.breakdownRow}>
									<ThemedText style={{ color: textSecondary }}>Cash</ThemedText>
									<ThemedText type="defaultSemiBold">
										{formatCurrency(paymentBreakdown?.cash ?? 0)}
									</ThemedText>
								</View>
								
								<View style={[styles.breakdownDivider, { backgroundColor: borderColor }]} />
								
								{/* Card */}
								<View style={styles.breakdownRow}>
									<ThemedText style={{ color: textSecondary }}>Card</ThemedText>
									<ThemedText type="defaultSemiBold">
										{formatCurrency(paymentBreakdown?.card ?? 0)}
									</ThemedText>
								</View>
								
								<View style={[styles.breakdownDivider, { backgroundColor: borderColor }]} />
								
								{/* Manual */}
								<View style={styles.breakdownRow}>
									<ThemedText style={{ color: textSecondary }}>Manual</ThemedText>
									<ThemedText type="defaultSemiBold">
										{formatCurrency(paymentBreakdown?.manual ?? 0)}
									</ThemedText>
								</View>
							</View>

							{/* Upsales - Original Row Design */}
							<View
								style={[
									styles.upsaleContainer,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<ThemedText
									style={[styles.upsaleTitle, { color: textSecondary }]}
								>
									Upsale Revenue
								</ThemedText>
								<View style={styles.upsaleRow}>
									{/* Extra Copies */}
									<View style={styles.upsaleItem}>
										<View
											style={[
												styles.upsaleIcon,
												{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
											]}
										>
											<IconSymbol
												name="doc.on.doc"
												size={16}
												color={BRAND_COLOR}
											/>
										</View>
										<View>
											<ThemedText
												style={[styles.upsaleLabel, { color: textSecondary }]}
											>
												Extra Copies
											</ThemedText>
											<ThemedText type="defaultSemiBold">
												{formatCurrency(upsaleBreakdown?.extra_copies_revenue ?? 0)}
											</ThemedText>
										</View>
									</View>
									<View
										style={[
											styles.upsaleDivider,
											{ backgroundColor: borderColor },
										]}
									/>
									{/* Cross-Sell */}
									<View style={styles.upsaleItem}>
										<View
											style={[
												styles.upsaleIcon,
												{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
											]}
										>
											<IconSymbol
												name="arrow.up.right"
												size={16}
												color={BRAND_COLOR}
											/>
										</View>
										<View>
											<ThemedText
												style={[styles.upsaleLabel, { color: textSecondary }]}
											>
												Cross-Sell
											</ThemedText>
											<ThemedText type="defaultSemiBold">
												{formatCurrency(upsaleBreakdown?.cross_sell_revenue ?? 0)}
											</ThemedText>
										</View>
									</View>
								</View>
							</View>
						</View>

						{/* Hardware Status Section - Different for each mode */}
						<View style={styles.section}>
							<SectionHeader
								title={isAllMode ? "Hardware Overview" : "Hardware Status"}
								subtitle={
									isAllMode
										? `${dashboardOverview?.summary?.total_booths ?? 0} booths`
										: (boothDetail?.booth_name ?? "")
								}
							/>

							{/* All Booths Mode: Aggregated hardware summary */}
							{isAllMode && dashboardOverview?.hardware_summary && (
								<HardwareSummaryCard
									hardwareSummary={dashboardOverview.hardware_summary}
								/>
							)}

							{/* Single Booth Mode: Detailed hardware status */}
							{!isAllMode && boothDetail?.hardware && (
								<BoothHardwareSection hardware={boothDetail.hardware} />
							)}
						</View>

						{/* System Info Section - Only for single booth mode */}
						{!isAllMode && boothDetail && (
							<View style={styles.section}>
								<SectionHeader title="System Info" />
								<SystemInfoCard system={boothDetail.system} />
							</View>
						)}

						{/* Recent Alerts Section - Works for both modes */}
						<View style={styles.section}>
							<SectionHeader
								title="Recent Alerts"
								showViewAll={
									isAllMode
										? (dashboardOverview?.alerts_count ?? 0) > 3
										: (boothDetail?.alerts_count ?? 0) > 3
								}
								onViewAllPress={handleViewAllAlerts}
							/>

							{/* All Booths Mode Alerts */}
							{isAllMode && dashboardOverview?.recent_alerts?.length ? (
								dashboardOverview.recent_alerts
									.slice(0, 3)
									.map((alert) => (
										<AlertCard
											key={alert.id}
											alert={mapDashboardAlertToAppAlert(alert)}
											onPress={() => console.log("Alert pressed:", alert.id)}
										/>
									))
							) : isAllMode ? (
								<View
									style={[
										styles.noAlertsCard,
										{ backgroundColor: cardBg, borderColor },
									]}
								>
									<IconSymbol
										name="bell.badge"
										size={24}
										color={StatusColors.success}
									/>
									<ThemedText
										style={[styles.noAlertsText, { color: textSecondary }]}
									>
										No alerts across your booths
									</ThemedText>
								</View>
							) : null}

							{/* Single Booth Mode Alerts */}
							{!isAllMode && boothDetail?.recent_alerts?.length ? (
								boothDetail.recent_alerts
									.slice(0, 3)
									.map((alert) => (
										<AlertCard
											key={alert.id}
											alert={mapBoothAlertToAppAlert(alert)}
											onPress={() => console.log("Alert pressed:", alert.id)}
										/>
									))
							) : !isAllMode && boothDetail ? (
								<View
									style={[
										styles.noAlertsCard,
										{ backgroundColor: cardBg, borderColor },
									]}
								>
									<IconSymbol
										name="bell.badge"
										size={24}
										color={StatusColors.success}
									/>
									<ThemedText
										style={[styles.noAlertsText, { color: textSecondary }]}
									>
										No alerts for this booth
									</ThemedText>
								</View>
							) : null}
						</View>
					</>
				)}

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
	centered: {
		justifyContent: "center",
		alignItems: "center",
	},
	content: {
		flex: 1,
		paddingHorizontal: Spacing.lg,
	},
	section: {
		marginTop: Spacing.lg,
	},
	loadingText: {
		marginTop: Spacing.md,
		fontSize: 14,
	},
	loadingDetailContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.xl,
		gap: Spacing.sm,
	},
	loadingDetailText: {
		fontSize: 14,
	},
	emptyTitle: {
		marginTop: Spacing.lg,
		marginBottom: Spacing.xs,
	},
	emptySubtitle: {
		fontSize: 14,
		textAlign: "center",
		marginBottom: Spacing.lg,
	},
	createButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		gap: Spacing.xs,
	},
	createButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
	boothSelector: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginTop: Spacing.md,
	},
	boothInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	boothIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.sm,
	},
	boothTextContainer: {
		flex: 1,
	},
	boothLocation: {
		fontSize: 12,
		marginTop: 2,
	},
	boothStatusContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	statusDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	periodSelector: {
		flexDirection: "row",
		marginBottom: Spacing.md,
		gap: Spacing.xs,
	},
	periodButton: {
		flex: 1,
		paddingVertical: Spacing.sm,
		paddingHorizontal: Spacing.sm,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		alignItems: "center",
	},
	periodButtonText: {
		fontSize: 12,
		fontWeight: "600",
	},
	statsRow: {
		flexDirection: "row",
	},
	// Clean Breakdown Cards
	breakdownCard: {
		marginTop: Spacing.md,
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	breakdownTitle: {
		fontSize: 13,
		fontWeight: "600",
		marginBottom: Spacing.md,
	},
	breakdownRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: Spacing.xs,
	},
	breakdownDivider: {
		height: 1,
		marginVertical: Spacing.xs,
	},
	breakdownSubtext: {
		fontSize: 12,
		marginTop: 2,
		opacity: 0.7,
	},
	// Original Row Design for Upsales
	upsaleContainer: {
		marginTop: Spacing.md,
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	upsaleTitle: {
		fontSize: 12,
		fontWeight: "500",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: Spacing.sm,
	},
	upsaleRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	upsaleItem: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	upsaleIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
	},
	upsaleLabel: {
		fontSize: 11,
		marginBottom: 2,
	},
	upsaleDivider: {
		width: 1,
		height: 40,
		marginHorizontal: Spacing.md,
	},
	noAlertsCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.sm,
	},
	noAlertsText: {
		fontSize: 14,
	},
});
