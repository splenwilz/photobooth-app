/**
 * Alerts Screen
 *
 * Central notification center for all alerts and notifications.
 * Shows critical, warning, and informational alerts from all booths.
 *
 * Features:
 * - Filter by severity (All/Critical/Warning/Info)
 * - Filter by category (Hardware/Supplies/Network/Revenue)
 * - Mark as read functionality
 * - Pull-to-refresh
 *
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 * @see GET /api/v1/analytics/alerts - API endpoint
 */

import { useIsFocused } from "@react-navigation/native";
import type React from "react";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	RefreshControl,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// API hook
import { useAlerts } from "@/api/alerts/queries";
import type { Alert, AlertCategory, AlertSeverity } from "@/api/alerts/types";
import { CustomHeader } from "@/components/custom-header";
import { ThemedText } from "@/components/themed-text";
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
// Utilities - using shared formatRelativeTime from utils
import { formatRelativeTime } from "@/utils";

type FilterSeverity = "all" | AlertSeverity;
type FilterCategory = "all" | AlertCategory;

/**
 * Get icon for alert severity
 * @see IconSymbol - Available icon names
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
 * @see StatusColors - Theme status colors
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
	const severityColor = getSeverityColor(alert.severity);
	const severityIcon = getSeverityIcon(alert.severity);

	return (
		<TouchableOpacity
			style={[
				styles.alertCard,
				{
					backgroundColor: cardBg,
					borderColor: alert.is_read ? borderColor : severityColor,
					opacity: alert.is_read ? 0.7 : 1,
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
						{alert.booth_name}
					</ThemedText>
				</View>
				<View style={styles.alertMeta}>
					<ThemedText style={[styles.alertTime, { color: textSecondary }]}>
						{formatRelativeTime(alert.timestamp)}
					</ThemedText>
					{!alert.is_read && (
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

	// State for filters
	const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>("all");
	const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");

	// Fetch alerts from API
	const {
		data,
		isLoading,
		error,
		refetch,
		isRefetching: isQueryRefetching,
	} = useAlerts({
		limit: 50,
	});

	// Only show refresh indicator when screen is focused (prevents frozen loader)
	const isRefetching = isFocused && isQueryRefetching;

	// Memoize alerts array to prevent useMemo dependency warnings
	const alerts = useMemo(() => data?.alerts ?? [], [data?.alerts]);

	// Filter alerts locally (API doesn't support multiple filters at once)
	const filteredAlerts = useMemo(() => {
		return alerts.filter((alert) => {
			if (filterSeverity !== "all" && alert.severity !== filterSeverity) return false;
			if (filterCategory !== "all" && alert.category !== filterCategory) return false;
			return true;
		});
	}, [alerts, filterSeverity, filterCategory]);

	// Count unread alerts by severity
	const unreadCounts = useMemo(() => ({
		critical: alerts.filter((a) => a.severity === "critical" && !a.is_read).length,
		warning: alerts.filter((a) => a.severity === "warning" && !a.is_read).length,
		info: alerts.filter((a) => a.severity === "info" && !a.is_read).length,
		total: alerts.filter((a) => !a.is_read).length,
	}), [alerts]);

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
		{ value: "network", label: "Network" },
		{ value: "revenue", label: "Revenue" },
	];

	// Handle alert press (could mark as read via API in the future)
	const handleAlertPress = (alertId: string) => {
		console.log("Alert pressed:", alertId);
		// TODO: Implement mark as read API call when endpoint is available
	};

	// Loading state
	if (isLoading) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader title="Alerts" />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
					<ThemedText style={[styles.loadingText, { color: textSecondary }]}>
						Loading alerts...
					</ThemedText>
				</View>
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
				<CustomHeader title="Alerts" />
				<View style={styles.errorContainer}>
					<IconSymbol
						name="exclamationmark.triangle.fill"
						size={48}
						color={StatusColors.error}
					/>
					<ThemedText style={styles.errorTitle}>
						Failed to load alerts
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

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor }]}
			edges={["top"]}
		>
			<CustomHeader
				title="Alerts"
				rightAction={
					unreadCounts.total > 0 ? (
						<View
							style={[styles.unreadBadge, { backgroundColor: BRAND_COLOR }]}
						>
							<ThemedText style={styles.unreadBadgeText}>
								{unreadCounts.total}
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
								{unreadCounts.critical}
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
								{unreadCounts.warning}
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
								{unreadCounts.info}
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
