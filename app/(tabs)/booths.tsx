/**
 * Booths Screen
 *
 * Multi-booth management screen for viewing and selecting photobooths.
 * Shows all booths with status, address, and today's performance.
 *
 * Features:
 * - List of all photobooths with status indicators
 * - Filter by status (All/Online/Offline)
 * - Search functionality
 * - Aggregated stats for all booths
 * - Real-time data from API with auto-refresh
 *
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 * @see /api/booths/queries.ts - useBoothOverview hook
 */

import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// API
import { useAlerts } from "@/api/alerts/queries";
import { useBoothOverview } from "@/api/booths/queries";
import type { BoothOverviewItem } from "@/api/booths/types";
import { useBoothSubscriptions } from "@/api/payments/queries";
import { CustomHeader } from "@/components/custom-header";
import { BoothsSkeleton } from "@/components/skeletons";
import { ThemedText } from "@/components/themed-text";
import { BoothCard } from "@/components/ui/booth-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	StatusColors,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ALL_BOOTHS_ID, useBoothStore } from "@/stores/booth-store";
import type { Booth, BoothStatus, OperationMode } from "@/types/photobooth";

type FilterStatus = "all" | "online" | "offline";

/**
 * Maps API booth data to the Booth type expected by BoothCard
 * Handles null/undefined fields gracefully
 */
function mapApiBoothToLocal(apiBooth: BoothOverviewItem): Booth {
	// Safely get operation mode - default to 'coin' if null/undefined
	const operationMode: OperationMode =
		apiBooth.operation?.mode?.toLowerCase() === "freeplay"
			? "freeplay"
			: "coin";

	const mappedBooth: Booth = {
		id: apiBooth.booth_id,
		name: apiBooth.booth_name,
		location: apiBooth.booth_address || "No address",
		status: apiBooth.booth_status as BoothStatus,
		todayRevenue: apiBooth.revenue?.today ?? 0,
		todayTransactions: apiBooth.transactions?.today_count ?? 0,
		operationMode,
		// Additional fields from API - with null safety
		credits: apiBooth.credits?.balance ?? 0,
		lastUpdated: apiBooth.last_updated,
	};

	return mappedBooth;
}

/**
 * Booths Screen Component
 */
export default function BoothsScreen() {
	const backgroundColor = useThemeColor({}, "background");
	const tint = useThemeColor({}, "tint");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");

	// Track if screen is focused - prevents refresh indicator from freezing when navigating
	const isFocused = useIsFocused();

	// Fetch booth data from API
	const {
		data: boothData,
		isLoading,
		isRefetching: isQueryRefetching,
		refetch,
	} = useBoothOverview();

	// Fetch alerts for notification badge
	// @see GET /api/v1/analytics/alerts
	const { data: alertsData } = useAlerts();
	const unreadAlerts = useMemo(() => {
		if (!alertsData?.alerts) return 0;
		return alertsData.alerts.filter((a) => !a.isRead).length;
	}, [alertsData?.alerts]);

	// Fetch booth subscriptions
	// @see GET /api/v1/payments/booths/subscriptions
	const { data: subscriptionsData } = useBoothSubscriptions();

	// Create map of boothId → subscription status for quick lookup
	const subscriptionMap = useMemo(() => {
		if (!subscriptionsData?.items) return new Map();
		return new Map(
			subscriptionsData.items.map((sub) => [
				sub.booth_id,
				{
					is_active: sub.is_active,
					status: sub.status,
					cancel_at_period_end: sub.cancel_at_period_end,
				},
			]),
		);
	}, [subscriptionsData?.items]);

	// Only show refresh indicator when screen is focused (prevents frozen loader)
	const isRefetching = isFocused && isQueryRefetching;

	// Global booth selection from Zustand store
	const { selectedBoothId, setSelectedBoothId } = useBoothStore();

	// Navigation handlers
	const handleNotificationPress = () => {
		router.push("/(tabs)/alerts");
	};

	// Local state
	const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
	const [searchQuery, setSearchQuery] = useState("");

	// Map API booths to local format
	const booths = useMemo(() => {
		if (!boothData?.booths) return [];
		return boothData.booths.map(mapApiBoothToLocal);
	}, [boothData?.booths]);

	// Get aggregated stats from API summary
	const aggregatedStats = useMemo(() => {
		if (!boothData?.summary) {
			return {
				totalBooths: 0,
				onlineBooths: 0,
				onlineCount: 0,
				offlineCount: 0,
				totalRevenue: 0,
				totalTransactions: 0,
			};
		}
		return {
			totalBooths: boothData.summary.total_booths,
			onlineBooths: boothData.summary.online_count,
			onlineCount: boothData.summary.online_count,
			offlineCount: boothData.summary.offline_count,
			totalRevenue: boothData.summary.total_revenue_today,
			totalTransactions: boothData.summary.total_transactions_today,
		};
	}, [boothData?.summary]);

	// Filter booths
	const filteredBooths = useMemo(() => {
		return booths.filter((booth) => {
			// Filter by status
			// "online" filter includes: online, warning, error (connected but may have issues)
			// "offline" filter includes: only offline
			if (filterStatus === "online") {
				if (booth.status === "offline") return false;
			} else if (filterStatus === "offline") {
				if (booth.status !== "offline") return false;
			}
			// Filter by search query
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				return (
					booth.name.toLowerCase().includes(query) ||
					booth.location.toLowerCase().includes(query)
				);
			}
			return true;
		});
	}, [booths, filterStatus, searchQuery]);

	// Status filter options (removed 'warning' as API only has online/offline)
	const statusFilters: {
		value: FilterStatus;
		label: string;
		color?: string;
	}[] = [
		{ value: "all", label: "All" },
		{ value: "online", label: "Online", color: StatusColors.success },
		{ value: "offline", label: "Offline", color: StatusColors.error },
	];

	// Format currency
	const formatCurrency = (amount: number): string => {
		return `$${amount.toFixed(2)}`;
	};

	// Navigate to create booth screen
	const handleAddBooth = () => {
		router.push("/booths/create");
	};

	// Pull to refresh
	const handleRefresh = useCallback(async () => {
		await refetch();
	}, [refetch]);

	// Loading state
	// Loading state - show skeleton instead of spinner
	if (isLoading) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader 
					title="Booths" 
					onNotificationPress={handleNotificationPress}
					notificationCount={unreadAlerts}
				/>
				<BoothsSkeleton />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor }]}
			edges={["top"]}
		>
			<CustomHeader 
				title="Booths" 
				onNotificationPress={handleNotificationPress}
				notificationCount={unreadAlerts}
			/>

			<ScrollView
				style={styles.content}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefetching}
						onRefresh={handleRefresh}
						tintColor={BRAND_COLOR}
						colors={[BRAND_COLOR]}
					/>
				}
			>
				{/* Aggregated Stats */}
				<View style={styles.section}>
					<View style={styles.statsRow}>
						<StatCard
							label="Total Booths"
							value={aggregatedStats.totalBooths.toString()}
							subValue={`${aggregatedStats.onlineBooths} online`}
						/>
						<View style={{ width: Spacing.sm }} />
						<StatCard
							label="Today's Revenue"
							value={formatCurrency(aggregatedStats.totalRevenue)}
							subValue={`${aggregatedStats.totalTransactions} transactions`}
						/>
					</View>
				</View>

				{/* Search Bar */}
				<View style={styles.section}>
					<View
						style={[styles.searchBar, { backgroundColor: cardBg, borderColor }]}
					>
						<IconSymbol
							name="magnifyingglass"
							size={18}
							color={textSecondary}
						/>
						<TextInput
							style={[styles.searchInput, { color: textColor }]}
							placeholder="Search booths..."
							placeholderTextColor={textSecondary}
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity onPress={() => setSearchQuery("")}>
								<IconSymbol name="xmark" size={18} color={textSecondary} />
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Status Filters */}
				<View style={styles.filterContainer}>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.filterScroll}
					>
						{statusFilters.map((filter) => (
							<TouchableOpacity
								key={filter.value}
								style={[
									styles.filterButton,
									{
										backgroundColor:
											filterStatus === filter.value ? tint : "transparent",
										borderColor:
											filterStatus === filter.value ? tint : borderColor,
									},
								]}
								onPress={() => setFilterStatus(filter.value)}
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
												filterStatus === filter.value ? "white" : textSecondary,
										},
									]}
								>
									{filter.label}
								</ThemedText>
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>

				{/* All Booths Card - Aggregate Mode */}
				<TouchableOpacity
					style={[
						styles.allBoothsCard,
						{
							backgroundColor: cardBg,
							borderColor:
								selectedBoothId === ALL_BOOTHS_ID ? BRAND_COLOR : borderColor,
							borderWidth: selectedBoothId === ALL_BOOTHS_ID ? 2 : 1,
						},
					]}
					onPress={() => {
						setSelectedBoothId(ALL_BOOTHS_ID);
						router.push("/(tabs)");
					}}
					activeOpacity={0.7}
				>
					<View style={styles.allBoothsLeft}>
						<View
							style={[
								styles.allBoothsIcon,
								{ backgroundColor: `${BRAND_COLOR}20` },
							]}
						>
							<IconSymbol
								name="rectangle.stack"
								size={24}
								color={BRAND_COLOR}
							/>
						</View>
						<View>
							<ThemedText type="defaultSemiBold" style={styles.allBoothsTitle}>
								All Booths
							</ThemedText>
							<ThemedText
								style={[styles.allBoothsSubtitle, { color: textSecondary }]}
							>
								{aggregatedStats.onlineCount} online ·{" "}
								{aggregatedStats.offlineCount} offline
							</ThemedText>
						</View>
					</View>
					<View style={styles.allBoothsRight}>
						{selectedBoothId === ALL_BOOTHS_ID && (
							<View
								style={[styles.selectedBadge, { backgroundColor: BRAND_COLOR }]}
							>
								<IconSymbol name="checkmark" size={12} color="#FFFFFF" />
							</View>
						)}
						<IconSymbol name="chevron.right" size={16} color={textSecondary} />
					</View>
				</TouchableOpacity>

				{/* Booth List */}
				<View style={styles.section}>
					<SectionHeader
						title="Your Booths"
						subtitle={`${filteredBooths.length} booth${filteredBooths.length !== 1 ? "s" : ""}`}
					/>

					{filteredBooths.map((booth) => (
						<BoothCard
							key={booth.id}
							booth={booth}
							isSelected={selectedBoothId === booth.id}
							subscriptionStatus={subscriptionMap.get(booth.id)}
							onPress={() => {
								// Set as active booth and navigate to dashboard
								setSelectedBoothId(booth.id);
								router.push("/(tabs)");
							}}
						/>
					))}

					{filteredBooths.length === 0 && (
						<View style={styles.emptyState}>
							<IconSymbol name="photo.stack" size={48} color={textSecondary} />
							<ThemedText style={[styles.emptyTitle, { color: textSecondary }]}>
								{searchQuery || filterStatus !== "all"
									? "No booths match your filters"
									: "No booths yet"}
							</ThemedText>
							{!searchQuery && filterStatus === "all" && (
								<TouchableOpacity
									style={[styles.emptyButton, { backgroundColor: BRAND_COLOR }]}
									onPress={handleAddBooth}
								>
									<IconSymbol name="plus" size={16} color="#FFFFFF" />
									<ThemedText style={styles.emptyButtonText}>
										Add Your First Booth
									</ThemedText>
								</TouchableOpacity>
							)}
						</View>
					)}
				</View>

				{/* Bottom spacing for FAB */}
				<View style={{ height: 100 }} />
			</ScrollView>

			{/* Floating Action Button */}
			<Pressable
				style={({ pressed }) => [
					styles.fab,
					{
						backgroundColor: BRAND_COLOR,
						opacity: pressed ? 0.9 : 1,
						transform: [{ scale: pressed ? 0.95 : 1 }],
					},
				]}
				onPress={handleAddBooth}
			>
				<IconSymbol name="plus" size={28} color="#FFFFFF" />
			</Pressable>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: Spacing.md,
	},
	loadingText: {
		fontSize: 14,
	},
	content: {
		flex: 1,
		paddingHorizontal: Spacing.lg,
	},
	section: {
		marginTop: Spacing.lg,
	},
	statsRow: {
		flexDirection: "row",
	},
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.sm,
		paddingHorizontal: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.sm,
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
		paddingVertical: Spacing.xs,
	},
	filterContainer: {
		marginTop: Spacing.md,
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
	emptyState: {
		alignItems: "center",
		paddingVertical: Spacing.xxl,
		gap: Spacing.md,
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: "500",
	},
	emptyButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: Spacing.sm,
		paddingHorizontal: Spacing.lg,
		borderRadius: BorderRadius.full,
		gap: Spacing.xs,
		marginTop: Spacing.sm,
	},
	emptyButtonText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "600",
	},
	fab: {
		position: "absolute",
		bottom: 24,
		right: 24,
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: "center",
		alignItems: "center",
		// Shadow for iOS
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		// Elevation for Android
		elevation: 8,
	},
	// All Booths Card Styles
	allBoothsCard: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		marginTop: Spacing.lg,
	},
	allBoothsLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
	},
	allBoothsIcon: {
		width: 48,
		height: 48,
		borderRadius: BorderRadius.md,
		justifyContent: "center",
		alignItems: "center",
	},
	allBoothsTitle: {
		fontSize: 16,
	},
	allBoothsSubtitle: {
		fontSize: 13,
		marginTop: 2,
	},
	allBoothsRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	selectedBadge: {
		width: 20,
		height: 20,
		borderRadius: 10,
		justifyContent: "center",
		alignItems: "center",
	},
});
