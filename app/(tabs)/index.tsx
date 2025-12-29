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
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// API hooks
import {
  useBoothDetail,
  useBoothList,
  useDashboardOverview,
} from "@/api/booths/queries";
import type { BoothDetailAlert, DashboardAlert } from "@/api/booths/types";
import { CustomHeader } from "@/components/custom-header";
import { ThemedText } from "@/components/themed-text";
import { AlertCard } from "@/components/ui/alert-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusCard } from "@/components/ui/status-card";
import {
  BorderRadius,
  BRAND_COLOR,
  Spacing,
  StatusColors,
  withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ALL_BOOTHS_ID, useBoothStore } from "@/stores/booth-store";
import type { Alert as AppAlert } from "@/types/photobooth";

type RevenuePeriod = "today" | "week" | "month" | "year";

/**
 * Maps API alert to app Alert type for AlertCard component
 * API uses: type (string like "printer_error"), severity ('critical'|'warning'|'info')
 * App uses: type ('critical'|'warning'|'info'), category ('hardware'|'supplies'|etc)
 */
function mapApiAlertToAppAlert(apiAlert: BoothDetailAlert): AppAlert {
	// Map API category to app AlertCategory, defaulting to 'hardware'
	const categoryMap: Record<string, AppAlert["category"]> = {
		hardware: "hardware",
		supplies: "supplies",
		connectivity: "connectivity",
		sales: "sales",
		system: "connectivity", // Map "system" category to "connectivity"
	};

	return {
		id: apiAlert.id,
		type: apiAlert.severity, // API severity → app type (AlertType)
		category: categoryMap[apiAlert.category] ?? "hardware",
		title: apiAlert.title,
		message: apiAlert.message,
		boothId: apiAlert.booth_id,
		boothName: apiAlert.booth_name,
		timestamp: apiAlert.timestamp,
		isRead: apiAlert.is_read,
	};
}

/**
 * Maps Dashboard overview alert to app Alert type
 * Dashboard alerts have slightly different structure (category is required)
 */
function mapDashboardAlertToAppAlert(apiAlert: DashboardAlert): AppAlert {
	const categoryMap: Record<string, AppAlert["category"]> = {
		hardware: "hardware",
		supplies: "supplies",
		connectivity: "connectivity",
		sales: "sales",
		system: "connectivity",
	};

	return {
		id: apiAlert.id,
		type: apiAlert.severity, // API severity → app type (AlertType)
		category: categoryMap[apiAlert.category] ?? "hardware",
		title: apiAlert.title,
		message: apiAlert.message,
		boothId: apiAlert.booth_id,
		boothName: apiAlert.booth_name,
		timestamp: apiAlert.timestamp,
		isRead: apiAlert.is_read,
	};
}

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

	// Check if we're in "All Booths" mode - computed directly from state for reactivity
	const isAllMode = selectedBoothId === ALL_BOOTHS_ID;

	// Fetch booth list for selector
	const { data: boothListData, isLoading: isLoadingList } = useBoothList();

	// Fetch dashboard overview (all booths) - only when in "all" mode
	const {
		data: dashboardOverview,
		isLoading: isLoadingOverview,
		refetch: refetchOverview,
		isRefetching: isRefetchingOverview,
	} = useDashboardOverview({
		enabled: isAllMode, // Only fetch when in "All Booths" mode
	});

	// Fetch selected booth details - only when a specific booth is selected
	const {
		data: boothDetail,
		isLoading: isLoadingDetail,
		refetch: refetchDetail,
		isRefetching: isRefetchingDetail,
	} = useBoothDetail(isAllMode ? null : selectedBoothId);

	// Combined refetching state - only true if:
	// 1. Screen is focused (prevents frozen loader when navigating between tabs)
	// 2. The ACTIVE query is refetching (prevents stale state from disabled queries)
	const isRefetching =
		isFocused &&
		((isAllMode && isRefetchingOverview) || (!isAllMode && isRefetchingDetail));

	// Auto-select "all" mode if nothing selected
	useEffect(() => {
		if (isHydrated && !selectedBoothId) {
			setSelectedBoothId(ALL_BOOTHS_ID);
		}
	}, [isHydrated, selectedBoothId, setSelectedBoothId]);

	// Get selected booth info from list (only relevant in single booth mode)
	const selectedBooth = boothListData?.booths?.find(
		(b) => b.id === selectedBoothId,
	);

	// Get unread alerts count - works for both modes
	const unreadAlerts = isAllMode
		? (dashboardOverview?.recent_alerts?.filter((a) => !a.is_read).length ?? 0)
		: (boothDetail?.recent_alerts?.filter((a) => !a.is_read).length ?? 0);

	// Get revenue stats for selected period - works for both modes
	const revenueStats = isAllMode
		? dashboardOverview?.revenue?.[selectedPeriod]
		: boothDetail?.revenue?.[selectedPeriod];

	// Get payment breakdown for current period - both modes now use period-based structure
	const paymentBreakdown = isAllMode
		? dashboardOverview?.payment_breakdown?.[selectedPeriod]
		: boothDetail?.payment_breakdown?.[selectedPeriod];

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

	// Format currency
	const formatCurrency = (amount: number): string => {
		return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	};

	// Get status color for booth
	const getBoothStatusColor = (status: string): string => {
		switch (status) {
			case "online":
				return StatusColors.success;
			case "warning":
				return StatusColors.warning;
			case "offline":
			case "error":
				return StatusColors.error;
			default:
				return StatusColors.neutral;
		}
	};

	/**
	 * Printer Status Mapping
	 * Online → healthy (connected, ready, supplies > 25%)
	 * Error → error (has error message)
	 * Offline → unknown (not detected/disconnected)
	 * Low Supplies → warning (paper or ink ≤ 25%)
	 * unknown → unknown
	 */
	const mapPrinterStatus = (
		status: string | undefined,
	): "healthy" | "warning" | "error" | "unknown" => {
		if (!status) return "unknown";
		const lower = status.toLowerCase();
		if (lower === "online" || lower === "ok" || lower === "ready")
			return "healthy";
		if (lower === "low supplies" || lower === "low") return "warning";
		if (lower === "error") return "error";
		if (lower === "offline") return "unknown";
		return "unknown";
	};

	const getPrinterStatusColor = (status: string | undefined): string => {
		const mapped = mapPrinterStatus(status);
		switch (mapped) {
			case "healthy":
				return StatusColors.success;
			case "warning":
				return StatusColors.warning;
			case "error":
				return StatusColors.error;
			default:
				return StatusColors.neutral;
		}
	};

	/**
	 * Payment Controller Status Mapping
	 * Connected → healthy (active or idle, working)
	 * Disconnected → warning (was connected, now unplugged)
	 * Not Configured → unknown (never set up)
	 * Error → error (connection error)
	 * Unknown → unknown
	 */
	const mapPaymentControllerStatus = (
		status: string | undefined,
	): "healthy" | "warning" | "error" | "unknown" => {
		if (!status) return "unknown";
		const lower = status.toLowerCase();
		if (
			lower === "connected" ||
			lower === "active" ||
			lower === "idle" ||
			lower === "ok"
		)
			return "healthy";
		if (lower === "disconnected") return "warning";
		if (lower === "error") return "error";
		if (lower === "not configured") return "unknown";
		return "unknown";
	};

	const getPaymentControllerStatusColor = (
		status: string | undefined,
	): string => {
		const mapped = mapPaymentControllerStatus(status);
		switch (mapped) {
			case "healthy":
				return StatusColors.success;
			case "warning":
				return StatusColors.warning;
			case "error":
				return StatusColors.error;
			default:
				return StatusColors.neutral;
		}
	};

	/**
	 * Camera Status Mapping (generic)
	 * Online/OK/Ready → healthy
	 * Warning → warning
	 * Error → error
	 * Offline/Unknown → unknown
	 */
	const mapCameraStatus = (
		status: string | undefined,
	): "healthy" | "warning" | "error" | "unknown" => {
		if (!status) return "unknown";
		const lower = status.toLowerCase();
		if (lower === "online" || lower === "ok" || lower === "ready")
			return "healthy";
		if (lower === "warning") return "warning";
		if (lower === "error") return "error";
		return "unknown";
	};

	const getCameraStatusColor = (status: string | undefined): string => {
		const mapped = mapCameraStatus(status);
		switch (mapped) {
			case "healthy":
				return StatusColors.success;
			case "warning":
				return StatusColors.warning;
			case "error":
				return StatusColors.error;
			default:
				return StatusColors.neutral;
		}
	};

	// Loading state
	if (!isHydrated || isLoadingList) {
		return (
			<SafeAreaView
				style={[styles.container, styles.centered, { backgroundColor }]}
				edges={["top"]}
			>
				<ActivityIndicator size="large" color={BRAND_COLOR} />
				<ThemedText style={[styles.loadingText, { color: textSecondary }]}>
					Loading dashboard...
				</ThemedText>
			</SafeAreaView>
		);
	}

	// No booths state
	if (!boothListData?.booths?.length) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader
					title="Dashboard"
					onNotificationPress={handleNotificationPress}
					notificationCount={0}
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
								{isAllMode
									? "All Booths"
									: (selectedBooth?.name ??
										boothDetail?.booth_name ??
										"Select Booth")}
							</ThemedText>
							<ThemedText
								style={[styles.boothLocation, { color: textSecondary }]}
								numberOfLines={1}
							>
								{isAllMode
									? `${dashboardOverview?.summary?.online_count ?? 0} online · ${dashboardOverview?.summary?.offline_count ?? 0} offline`
									: (selectedBooth?.address ??
										boothDetail?.booth_address ??
										"No address")}
							</ThemedText>
						</View>
					</View>
					<View style={styles.boothStatusContainer}>
						{/* Show status dot only for single booth mode */}
						{!isAllMode && (
							<View
								style={[
									styles.statusDot,
									{
										backgroundColor: getBoothStatusColor(
											selectedBooth?.status ??
												boothDetail?.booth_status ??
												"offline",
										),
									},
								]}
							/>
						)}
						<IconSymbol name="chevron.right" size={16} color={textSecondary} />
					</View>
				</TouchableOpacity>

				{/* Loading state - for either mode */}
				{(isAllMode ? isLoadingOverview : isLoadingDetail) && (
					<View style={styles.loadingDetailContainer}>
						<ActivityIndicator size="small" color={BRAND_COLOR} />
						<ThemedText
							style={[styles.loadingDetailText, { color: textSecondary }]}
						>
							{isAllMode ? "Loading overview..." : "Loading booth data..."}
						</ThemedText>
					</View>
				)}

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

							{/* Payment Method Breakdown */}
							<View
								style={[
									styles.paymentBreakdown,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<ThemedText
									style={[styles.paymentTitle, { color: textSecondary }]}
								>
									Payment Breakdown
								</ThemedText>
								<View style={styles.paymentRow}>
									<View style={styles.paymentItem}>
										<View
											style={[
												styles.paymentIcon,
												{
													backgroundColor: withAlpha(
														StatusColors.success,
														0.15,
													),
												},
											]}
										>
											<IconSymbol
												name="banknote"
												size={16}
												color={StatusColors.success}
											/>
										</View>
										<View>
											<ThemedText
												style={[styles.paymentLabel, { color: textSecondary }]}
											>
												Cash
											</ThemedText>
											<ThemedText type="defaultSemiBold">
												{formatCurrency(paymentBreakdown?.cash ?? 0)}
											</ThemedText>
										</View>
									</View>
									<View
										style={[
											styles.paymentDivider,
											{ backgroundColor: borderColor },
										]}
									/>
									<View style={styles.paymentItem}>
										<View
											style={[
												styles.paymentIcon,
												{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
											]}
										>
											<IconSymbol
												name="creditcard"
												size={16}
												color={BRAND_COLOR}
											/>
										</View>
										<View>
											<ThemedText
												style={[styles.paymentLabel, { color: textSecondary }]}
											>
												Card
											</ThemedText>
											<ThemedText type="defaultSemiBold">
												{formatCurrency(paymentBreakdown?.card ?? 0)}
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

							{/* All Booths Mode: Show aggregated hardware summary */}
							{isAllMode && dashboardOverview?.hardware_summary && (
								<>
									{/* Printers Summary */}
									<View
										style={[
											styles.hardwareSummaryCard,
											{ backgroundColor: cardBg, borderColor },
										]}
									>
										<View style={styles.hardwareSummaryHeader}>
											<IconSymbol
												name="printer"
												size={20}
												color={BRAND_COLOR}
											/>
											<ThemedText type="defaultSemiBold">Printers</ThemedText>
										</View>
										<View style={styles.hardwareSummaryRow}>
											<View style={styles.hardwareSummaryItem}>
												<View
													style={[
														styles.summaryDot,
														{ backgroundColor: StatusColors.success },
													]}
												/>
												<ThemedText
													style={[
														styles.summaryLabel,
														{ color: textSecondary },
													]}
												>
													Online
												</ThemedText>
												<ThemedText type="defaultSemiBold">
													{dashboardOverview.hardware_summary.printers.online}
												</ThemedText>
											</View>
											<View style={styles.hardwareSummaryItem}>
												<View
													style={[
														styles.summaryDot,
														{ backgroundColor: StatusColors.error },
													]}
												/>
												<ThemedText
													style={[
														styles.summaryLabel,
														{ color: textSecondary },
													]}
												>
													Error
												</ThemedText>
												<ThemedText type="defaultSemiBold">
													{dashboardOverview.hardware_summary.printers.error}
												</ThemedText>
											</View>
											<View style={styles.hardwareSummaryItem}>
												<View
													style={[
														styles.summaryDot,
														{ backgroundColor: StatusColors.neutral },
													]}
												/>
												<ThemedText
													style={[
														styles.summaryLabel,
														{ color: textSecondary },
													]}
												>
													Offline
												</ThemedText>
												<ThemedText type="defaultSemiBold">
													{dashboardOverview.hardware_summary.printers.offline}
												</ThemedText>
											</View>
										</View>
									</View>

									{/* Payment Controllers Summary */}
									<View
										style={[
											styles.hardwareSummaryCard,
											{ backgroundColor: cardBg, borderColor },
										]}
									>
										<View style={styles.hardwareSummaryHeader}>
											<IconSymbol
												name="creditcard"
												size={20}
												color={BRAND_COLOR}
											/>
											<ThemedText type="defaultSemiBold">
												Payment Controllers
											</ThemedText>
										</View>
										<View style={styles.hardwareSummaryRow}>
											<View style={styles.hardwareSummaryItem}>
												<View
													style={[
														styles.summaryDot,
														{ backgroundColor: StatusColors.success },
													]}
												/>
												<ThemedText
													style={[
														styles.summaryLabel,
														{ color: textSecondary },
													]}
												>
													Connected
												</ThemedText>
												<ThemedText type="defaultSemiBold">
													{
														dashboardOverview.hardware_summary
															.payment_controllers.connected
													}
												</ThemedText>
											</View>
											<View style={styles.hardwareSummaryItem}>
												<View
													style={[
														styles.summaryDot,
														{ backgroundColor: StatusColors.warning },
													]}
												/>
												<ThemedText
													style={[
														styles.summaryLabel,
														{ color: textSecondary },
													]}
												>
													Disconnected
												</ThemedText>
												<ThemedText type="defaultSemiBold">
													{
														dashboardOverview.hardware_summary
															.payment_controllers.disconnected
													}
												</ThemedText>
											</View>
											<View style={styles.hardwareSummaryItem}>
												<View
													style={[
														styles.summaryDot,
														{ backgroundColor: StatusColors.neutral },
													]}
												/>
												<ThemedText
													style={[
														styles.summaryLabel,
														{ color: textSecondary },
													]}
												>
													Not Configured
												</ThemedText>
												<ThemedText type="defaultSemiBold">
													{
														dashboardOverview.hardware_summary
															.payment_controllers.not_configured
													}
												</ThemedText>
											</View>
										</View>
									</View>
								</>
							)}

							{/* Single Booth Mode: Show detailed hardware status */}
							{!isAllMode && boothDetail && (
								<>
									{/* Camera Status */}
									{boothDetail.hardware?.camera ? (
										<StatusCard
											title="Camera"
											status={mapCameraStatus(
												boothDetail.hardware.camera.status,
											)}
											subtitle={
												boothDetail.hardware.camera.model ??
												boothDetail.hardware.camera.name ??
												"Unknown"
											}
											infoText={
												boothDetail.hardware.camera.error ??
												`${boothDetail.hardware.camera.total_captures?.toLocaleString() ?? 0} total captures`
											}
											icon={
												<IconSymbol
													name="camera"
													size={20}
													color={getCameraStatusColor(
														boothDetail.hardware.camera.status,
													)}
												/>
											}
										/>
									) : (
										<StatusCard
											title="Camera"
											status="unknown"
											subtitle="Not connected"
											infoText="No camera data available"
											icon={
												<IconSymbol
													name="camera"
													size={20}
													color={StatusColors.neutral}
												/>
											}
										/>
									)}

									{/* Printer Status with supply levels */}
									{boothDetail.hardware?.printer ? (
										<StatusCard
											title="Printer"
											status={mapPrinterStatus(
												boothDetail.hardware.printer.status,
											)}
											subtitle={
												boothDetail.hardware.printer.model ??
												boothDetail.hardware.printer.name ??
												"Unknown"
											}
											progress={
												boothDetail.hardware.printer.paper_percent ?? undefined
											}
											progressLabel="Paper"
											secondaryProgress={
												boothDetail.hardware.printer.ink_percent ?? undefined
											}
											secondaryProgressLabel="Ink"
											infoText={
												boothDetail.hardware.printer.error ??
												`~${boothDetail.hardware.printer.prints_remaining} prints remaining`
											}
											icon={
												<IconSymbol
													name="printer"
													size={20}
													color={getPrinterStatusColor(
														boothDetail.hardware.printer.status,
													)}
												/>
											}
										/>
									) : (
										<StatusCard
											title="Printer"
											status="unknown"
											subtitle="Not connected"
											infoText="No printer data available"
											icon={
												<IconSymbol
													name="printer"
													size={20}
													color={StatusColors.neutral}
												/>
											}
										/>
									)}

									{/* Payment Controller Status */}
									{boothDetail.hardware?.payment_controller ? (
										<StatusCard
											title="Payment Controller"
											status={mapPaymentControllerStatus(
												boothDetail.hardware.payment_controller.status,
											)}
											subtitle={
												boothDetail.hardware.payment_controller.payment_methods
											}
											infoText={
												boothDetail.hardware.payment_controller.error ??
												`${boothDetail.hardware.payment_controller.transactions_today} transactions today`
											}
											icon={
												<IconSymbol
													name="creditcard"
													size={20}
													color={getPaymentControllerStatusColor(
														boothDetail.hardware.payment_controller.status,
													)}
												/>
											}
										/>
									) : (
										<StatusCard
											title="Payment Controller"
											status="unknown"
											subtitle="Not connected"
											infoText="No payment controller data available"
											icon={
												<IconSymbol
													name="creditcard"
													size={20}
													color={StatusColors.neutral}
												/>
											}
										/>
									)}
								</>
							)}
						</View>

						{/* System Info Section - Only for single booth mode */}
						{!isAllMode && boothDetail && (
							<View style={styles.section}>
								<SectionHeader title="System Info" />

								<View
									style={[
										styles.systemInfoCard,
										{ backgroundColor: cardBg, borderColor },
									]}
								>
									<View style={styles.systemInfoRow}>
										<View style={styles.systemInfoItem}>
											<ThemedText
												style={[
													styles.systemInfoLabel,
													{ color: textSecondary },
												]}
											>
												Booth Uptime
											</ThemedText>
											<ThemedText type="defaultSemiBold">
												{boothDetail.system?.app_uptime_formatted ?? "N/A"}
											</ThemedText>
										</View>
										<View style={styles.systemInfoItem}>
											<ThemedText
												style={[
													styles.systemInfoLabel,
													{ color: textSecondary },
												]}
											>
												System Uptime
											</ThemedText>
											<ThemedText type="defaultSemiBold">
												{boothDetail.system?.system_uptime_formatted ?? "N/A"}
											</ThemedText>
										</View>
										<View style={styles.systemInfoItem}>
											<ThemedText
												style={[
													styles.systemInfoLabel,
													{ color: textSecondary },
												]}
											>
												App Version
											</ThemedText>
											<ThemedText type="defaultSemiBold">
												v{boothDetail.system?.app_version ?? "?"}
											</ThemedText>
										</View>
									</View>
									<View style={styles.systemInfoRow}>
										<View style={styles.systemInfoItem}>
											<ThemedText
												style={[
													styles.systemInfoLabel,
													{ color: textSecondary },
												]}
											>
												CPU
											</ThemedText>
											<ThemedText type="defaultSemiBold">
												{boothDetail.system?.cpu_percent?.toFixed(1) ?? 0}%
											</ThemedText>
										</View>
										<View style={styles.systemInfoItem}>
											<ThemedText
												style={[
													styles.systemInfoLabel,
													{ color: textSecondary },
												]}
											>
												Memory
											</ThemedText>
											<ThemedText type="defaultSemiBold">
												{boothDetail.system?.memory_percent?.toFixed(1) ?? 0}%
											</ThemedText>
										</View>
										<View style={styles.systemInfoItem}>
											<ThemedText
												style={[
													styles.systemInfoLabel,
													{ color: textSecondary },
												]}
											>
												Disk
											</ThemedText>
											<ThemedText type="defaultSemiBold">
												{boothDetail.system?.disk_percent?.toFixed(1) ?? 0}%
											</ThemedText>
										</View>
									</View>
								</View>
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
											alert={mapApiAlertToAppAlert(alert)}
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
	paymentBreakdown: {
		marginTop: Spacing.md,
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	paymentTitle: {
		fontSize: 12,
		fontWeight: "500",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: Spacing.sm,
	},
	paymentRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	paymentItem: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	paymentIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
	},
	paymentLabel: {
		fontSize: 11,
		marginBottom: 2,
	},
	paymentDivider: {
		width: 1,
		height: 40,
		marginHorizontal: Spacing.md,
	},
	systemInfoCard: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	systemInfoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: Spacing.sm,
	},
	systemInfoItem: {
		flex: 1,
		alignItems: "center",
	},
	systemInfoLabel: {
		fontSize: 11,
		marginBottom: 2,
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
	// Hardware Summary Styles (All Booths Mode)
	hardwareSummaryCard: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	hardwareSummaryHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		marginBottom: Spacing.md,
	},
	hardwareSummaryRow: {
		flexDirection: "row",
		justifyContent: "space-around",
	},
	hardwareSummaryItem: {
		alignItems: "center",
		gap: 4,
	},
	summaryDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	summaryLabel: {
		fontSize: 11,
	},
});
