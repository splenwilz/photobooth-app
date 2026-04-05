/**
 * Alerts Screen
 *
 * Central notification center for alerts and notifications.
 * Shows critical, warning, and informational alerts from all booths
 * or a specific booth selected via the booth picker.
 *
 * Features:
 * - Booth picker to scope alerts to a specific booth or all booths
 * - Filter by severity (All/Critical/Warning/Info)
 * - Filter by category (Hardware/Supplies/Network/Revenue)
 * - Pull-to-refresh
 *
 * @see GET /api/v1/analytics/alerts - All booths endpoint
 * @see GET /api/v1/analytics/alerts/{booth_id} - Single booth endpoint
 */

import { useIsFocused } from "@react-navigation/native";
import type React from "react";
import { useMemo, useState } from "react";
import {
	RefreshControl,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// API hooks
import { useAlerts, useBoothAlerts } from "@/api/alerts/queries";
import type { AlertSeverity } from "@/api/alerts/types";
import { BoothPickerModal } from "@/components/booth-picker-modal";
import { CustomHeader } from "@/components/custom-header";
import { AlertsSkeleton } from "@/components/skeletons";
import { ThemedText } from "@/components/themed-text";
import { ErrorState } from "@/components/ui/error-state";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SectionHeader } from "@/components/ui/section-header";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	StatusColors,
	withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ALL_BOOTHS_ID, useBoothStore } from "@/stores/booth-store";
import type { Alert, AlertCategory } from "@/types/photobooth";
// Utilities - using shared formatRelativeTime from utils
import { formatRelativeTime } from "@/utils";

type FilterSeverity = "all" | AlertSeverity;
type FilterCategory = "all" | AlertCategory;

/**
 * Get icon for alert severity
 */
function getSeverityIcon(severity: AlertSeverity): string {
	switch (severity) {
		case "critical":
			return "exclamationmark.circle.fill";
		case "warning":
			return "exclamationmark.triangle.fill";
		case "info":
			return "info.circle.fill";
		default:
			return "bell.fill";
	}
}

/**
 * Get color for alert severity
 */
function getSeverityColor(severity: AlertSeverity): string {
	switch (severity) {
		case "critical":
			return StatusColors.error;
		case "warning":
			return StatusColors.warning;
		case "info":
			return StatusColors.info;
		default:
			return StatusColors.info;
	}
}

/**
 * Alert card component
 */
const AlertCard: React.FC<{
	alert: Alert;
	cardBg: string;
	borderColor: string;
	textSecondary: string;
	onPress?: () => void;
}> = ({ alert, cardBg, borderColor, textSecondary, onPress }) => {
	const severityColor = getSeverityColor(alert.type);
	const severityIcon = getSeverityIcon(alert.type);

	return (
		<TouchableOpacity
			style={[
				styles.alertCard,
				{
					backgroundColor: cardBg,
					borderColor: alert.isRead ? borderColor : severityColor,
					opacity: alert.isRead ? 0.7 : 1,
				},
			]}
			onPress={onPress}
			activeOpacity={0.8}
		>
			<View style={styles.alertHeader}>
				<View
					style={[
						styles.alertIconContainer,
						{ backgroundColor: withAlpha(severityColor, 0.15) },
					]}
				>
					<IconSymbol name={severityIcon} size={20} color={severityColor} />
				</View>
				<View style={styles.alertHeaderText}>
					<ThemedText type="defaultSemiBold" style={styles.alertTitle}>
						{alert.title}
					</ThemedText>
					<ThemedText style={[styles.alertBooth, { color: textSecondary }]}>
						{alert.boothName}
					</ThemedText>
				</View>
				<View style={styles.alertMeta}>
					<ThemedText style={[styles.alertTime, { color: textSecondary }]}>
						{formatRelativeTime(alert.timestamp)}
					</ThemedText>
					{!alert.isRead && (
						<View
							style={[styles.unreadDot, { backgroundColor: severityColor }]}
						/>
					)}
				</View>
			</View>
			<ThemedText style={[styles.alertMessage, { color: textSecondary }]}>
				{alert.message}
			</ThemedText>
			<View style={styles.alertFooter}>
				<View
					style={[
						styles.categoryBadge,
						{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
					]}
				>
					<ThemedText style={[styles.categoryText, { color: BRAND_COLOR }]}>
						{alert.category.charAt(0).toUpperCase() + alert.category.slice(1)}
					</ThemedText>
				</View>
			</View>
		</TouchableOpacity>
	);
};

/**
 * Alerts Screen Component
 */
export default function AlertsScreen() {
	const backgroundColor = useThemeColor({}, "background");
	const tint = useThemeColor({}, "tint");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	// Track if screen is focused - prevents refresh indicator from freezing when navigating
	const isFocused = useIsFocused();

	// Booth picker state
	const [isPickerVisible, setIsPickerVisible] = useState(false);
	const { selectedBoothId } = useBoothStore();
	const isAllMode = selectedBoothId === ALL_BOOTHS_ID;

	// State for filters
	const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>("all");
	const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");

	// Fetch alerts — conditional on booth selection (same pattern as analytics.tsx)
	const {
		data: allData,
		isLoading: isLoadingAll,
		error: errorAll,
		refetch: refetchAll,
		isRefetching: isRefetchingAll,
	} = useAlerts({ limit: 50 }, { enabled: isAllMode });

	const {
		data: boothData,
		isLoading: isLoadingBooth,
		error: errorBooth,
		refetch: refetchBooth,
		isRefetching: isRefetchingBooth,
	} = useBoothAlerts(isAllMode ? null : selectedBoothId, { limit: 50 });

	// Unified data access
	const data = isAllMode ? allData : boothData;
	const isLoading = isAllMode ? isLoadingAll : isLoadingBooth;
	const error = isAllMode ? errorAll : errorBooth;
	const refetch = isAllMode ? refetchAll : refetchBooth;
	const isQueryRefetching = isAllMode ? isRefetchingAll : isRefetchingBooth;

	// Only show refresh indicator when screen is focused (prevents frozen loader)
	const isRefetching = isFocused && isQueryRefetching;

	// Memoize alerts array to prevent useMemo dependency warnings
	const alerts = useMemo(() => data?.alerts ?? [], [data?.alerts]);

	// Use API summary when available, fall back to client-side counting
	const summaryCounts = useMemo(() => {
		if (data?.summary) return data.summary;
		return {
			critical: alerts.filter((a) => a.type === "critical").length,
			warning: alerts.filter((a) => a.type === "warning").length,
			info: alerts.filter((a) => a.type === "info").length,
		};
	}, [data?.summary, alerts]);

	// Filter alerts locally
	const filteredAlerts = useMemo(() => {
		return alerts.filter((alert) => {
			if (filterSeverity !== "all" && alert.type !== filterSeverity)
				return false;
			if (filterCategory !== "all" && alert.category !== filterCategory)
				return false;
			return true;
		});
	}, [alerts, filterSeverity, filterCategory]);

	// Count total unread for badge
	const totalUnread = useMemo(
		() => alerts.filter((a) => !a.isRead).length,
		[alerts],
	);

	// Severity filter options
	const severityFilters: {
		value: FilterSeverity;
		label: string;
		color?: string;
	}[] = [
		{ value: "all", label: "All" },
		{ value: "critical", label: "Critical", color: StatusColors.error },
		{ value: "warning", label: "Warning", color: StatusColors.warning },
		{ value: "info", label: "Info", color: StatusColors.info },
	];

	// Category filter options
	const categoryFilters: { value: FilterCategory; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "hardware", label: "Hardware" },
		{ value: "supplies", label: "Supplies" },
		{ value: "connectivity", label: "Connectivity" },
		{ value: "sales", label: "Sales" },
	];

	// Handle alert press (could mark as read via API in the future)
	const handleAlertPress = (alertId: string) => {
		// TODO: Implement mark as read API call when endpoint is available
	};

	// Loading state - show skeleton instead of spinner
	if (isLoading) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader
					title="Alerts"
					boothContext
					onBoothPress={() => setIsPickerVisible(true)}
				/>
				<AlertsSkeleton />
				<BoothPickerModal
					visible={isPickerVisible}
					onClose={() => setIsPickerVisible(false)}
				/>
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
					title="Alerts"
					boothContext
					onBoothPress={() => setIsPickerVisible(true)}
				/>
				<ErrorState
					title="Failed to load alerts"
					message={error.message || "An unexpected error occurred"}
					onRetry={() => refetch()}
				/>
				<BoothPickerModal
					visible={isPickerVisible}
					onClose={() => setIsPickerVisible(false)}
				/>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor }]}
			edges={["top"]}
		>
			<CustomHeader
				title="Alerts"
				boothContext
				onBoothPress={() => setIsPickerVisible(true)}
				rightAction={
					totalUnread > 0 ? (
						<View
							style={[styles.unreadBadge, { backgroundColor: BRAND_COLOR }]}
						>
							<ThemedText style={styles.unreadBadgeText}>
								{totalUnread}
							</ThemedText>
						</View>
					) : undefined
				}
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
				{/* Summary Card */}
				<View
					style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}
				>
					<View style={styles.summaryRow}>
						<View style={styles.summaryItem}>
							<ThemedText
								style={[styles.summaryValue, { color: StatusColors.error }]}
							>
								{summaryCounts.critical}
							</ThemedText>
							<ThemedText
								style={[styles.summaryLabel, { color: textSecondary }]}
							>
								Critical
							</ThemedText>
						</View>
						<View
							style={[styles.summaryDivider, { backgroundColor: borderColor }]}
						/>
						<View style={styles.summaryItem}>
							<ThemedText
								style={[styles.summaryValue, { color: StatusColors.warning }]}
							>
								{summaryCounts.warning}
							</ThemedText>
							<ThemedText
								style={[styles.summaryLabel, { color: textSecondary }]}
							>
								Warnings
							</ThemedText>
						</View>
						<View
							style={[styles.summaryDivider, { backgroundColor: borderColor }]}
						/>
						<View style={styles.summaryItem}>
							<ThemedText
								style={[styles.summaryValue, { color: StatusColors.info }]}
							>
								{summaryCounts.info}
							</ThemedText>
							<ThemedText
								style={[styles.summaryLabel, { color: textSecondary }]}
							>
								Info
							</ThemedText>
						</View>
					</View>
				</View>

				{/* Severity Filters */}
				<View style={styles.filterSection}>
					<ThemedText style={[styles.filterLabel, { color: textSecondary }]}>
						Severity
					</ThemedText>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.filterScroll}
					>
						{severityFilters.map((filter) => (
							<TouchableOpacity
								key={filter.value}
								style={[
									styles.filterButton,
									{
										backgroundColor:
											filterSeverity === filter.value ? tint : "transparent",
										borderColor:
											filterSeverity === filter.value ? tint : borderColor,
									},
								]}
								onPress={() => setFilterSeverity(filter.value)}
							>
								{filter.color && (
									<View
										style={[
											styles.filterDot,
											{ backgroundColor: filter.color },
										]}
									/>
								)}
								<ThemedText
									style={[
										styles.filterButtonText,
										{
											color:
												filterSeverity === filter.value
													? "white"
													: textSecondary,
										},
									]}
								>
									{filter.label}
								</ThemedText>
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>

				{/* Category Filters */}
				<View style={styles.filterSection}>
					<ThemedText style={[styles.filterLabel, { color: textSecondary }]}>
						Category
					</ThemedText>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.filterScroll}
					>
						{categoryFilters.map((filter) => (
							<TouchableOpacity
								key={filter.value}
								style={[
									styles.filterButton,
									{
										backgroundColor:
											filterCategory === filter.value ? tint : "transparent",
										borderColor:
											filterCategory === filter.value ? tint : borderColor,
									},
								]}
								onPress={() => setFilterCategory(filter.value)}
							>
								<ThemedText
									style={[
										styles.filterButtonText,
										{
											color:
												filterCategory === filter.value
													? "white"
													: textSecondary,
										},
									]}
								>
									{filter.label}
								</ThemedText>
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>

				{/* Alerts List */}
				<View style={styles.section}>
					<SectionHeader
						title="Notifications"
						subtitle={`${filteredAlerts.length} alert${filteredAlerts.length !== 1 ? "s" : ""}`}
					/>

					{filteredAlerts.length > 0 ? (
						filteredAlerts.map((alert) => (
							<AlertCard
								key={alert.id}
								alert={alert}
								cardBg={cardBg}
								borderColor={borderColor}
								textSecondary={textSecondary}
								onPress={() => handleAlertPress(alert.id)}
							/>
						))
					) : (
						<View
							style={[
								styles.emptyState,
								{ backgroundColor: cardBg, borderColor },
							]}
						>
							<IconSymbol name="bell.slash" size={48} color={textSecondary} />
							<ThemedText style={[styles.emptyTitle, { color: textSecondary }]}>
								No Alerts
							</ThemedText>
							<ThemedText
								style={[styles.emptySubtitle, { color: textSecondary }]}
							>
								{filterSeverity !== "all" || filterCategory !== "all"
									? "No alerts match your current filters."
									: "You're all caught up! No alerts at this time."}
							</ThemedText>
						</View>
					)}
				</View>

				{/* Bottom spacing */}
				<View style={{ height: Spacing.xxl }} />
			</ScrollView>

			<BoothPickerModal
				visible={isPickerVisible}
				onClose={() => setIsPickerVisible(false)}
			/>
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
	unreadBadge: {
		minWidth: 24,
		height: 24,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 8,
	},
	unreadBadgeText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "600",
	},
	summaryCard: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginTop: Spacing.md,
	},
	summaryRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	summaryItem: {
		flex: 1,
		alignItems: "center",
	},
	summaryValue: {
		fontSize: 28,
		fontWeight: "bold",
		paddingTop: Spacing.sm,
	},
	summaryLabel: {
		fontSize: 12,
		marginTop: 2,
	},
	summaryDivider: {
		width: 1,
		height: 40,
	},
	filterSection: {
		marginTop: Spacing.md,
	},
	filterLabel: {
		fontSize: 12,
		fontWeight: "500",
		marginBottom: Spacing.xs,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	filterScroll: {
		gap: Spacing.xs,
	},
	filterButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: Spacing.sm,
		paddingHorizontal: Spacing.md,
		borderRadius: BorderRadius.full,
		borderWidth: 1,
		gap: 6,
	},
	filterDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	filterButtonText: {
		fontSize: 13,
		fontWeight: "500",
	},
	alertCard: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	alertHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		marginBottom: Spacing.sm,
	},
	alertIconContainer: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.sm,
	},
	alertHeaderText: {
		flex: 1,
	},
	alertTitle: {
		fontSize: 15,
	},
	alertBooth: {
		fontSize: 12,
		marginTop: 2,
	},
	alertMeta: {
		alignItems: "flex-end",
	},
	alertTime: {
		fontSize: 11,
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginTop: 4,
	},
	alertMessage: {
		fontSize: 13,
		lineHeight: 18,
		marginBottom: Spacing.sm,
	},
	alertFooter: {
		flexDirection: "row",
	},
	categoryBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: BorderRadius.sm,
	},
	categoryText: {
		fontSize: 11,
		fontWeight: "500",
	},
	emptyState: {
		padding: Spacing.xl,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		alignItems: "center",
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginTop: Spacing.md,
	},
	emptySubtitle: {
		fontSize: 13,
		textAlign: "center",
		marginTop: Spacing.xs,
	},
});
