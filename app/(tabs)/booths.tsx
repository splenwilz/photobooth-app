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
import { queryKeys } from "@/api/utils/query-keys";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
	useBoothOverview,
	useBoothsCriticalEvents,
} from "@/api/booths/queries";
import { useQueryClient } from "@tanstack/react-query";
import type { BoothOverviewItem } from "@/api/booths/types";
import { useBoothSubscriptions } from "@/api/payments/queries";
import { CustomHeader } from "@/components/custom-header";
import { BoothsSkeleton } from "@/components/skeletons";
import { ThemedText } from "@/components/themed-text";
import { ErrorState } from "@/components/ui/error-state";
import { EditBoothModal } from "@/components/booths";
import { BoothCard } from "@/components/ui/booth-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	StatusColors,
	scaleFont,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAttentionStore } from "@/stores/attention-store";
import { ALL_BOOTHS_ID, useBoothStore } from "@/stores/booth-store";
import { countCriticalAttention } from "@/utils";
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
		// Hardware error state — drives BoothCard's error badge/details row
		has_error: apiBooth.has_error,
		error_details: apiBooth.error_details ?? undefined,
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
	const queryClient = useQueryClient();

	// Fetch booth data from API
	const {
		data: boothData,
		isLoading,
		error,
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
	const { data: subscriptionsData, refetch: refetchSubscriptions } =
		useBoothSubscriptions();

	// The subscriptions list has a 5-min staleTime, and state can change outside
	// the app entirely — a subscription cancelled at a kiosk, or bought on the
	// web. Refresh when the screen regains focus so the badges reflect reality.
	//
	// `staleOnly: false` is load-bearing: with the default stale-only filter,
	// returning to this screen within the staleTime window refetches nothing —
	// and that window is exactly when a user comes back from an out-of-app
	// action. The shared hook still skips the first focus, which is the mount
	// fetch the previous hand-rolled version duplicated.
	useRefreshOnFocus(queryKeys.payments.boothSubscriptions(), {
		staleOnly: false,
	});

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
					activation_required: sub.activation_required,
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
	const [editingBooth, setEditingBooth] = useState<Booth | null>(null);

	// Map API booths to local format
	const booths = useMemo(() => {
		if (!boothData?.booths) return [];
		return boothData.booths.map(mapApiBoothToLocal);
	}, [boothData?.booths]);

	// Per-booth critical-event fan-out for the attention badges. Gated on
	// screen focus (v5 `subscribed`): an unfocused Booths tab neither
	// fetches nor re-renders. Cache entries are shared with the per-booth
	// critical-events screen.
	const boothIds = useMemo(() => booths.map((booth) => booth.id), [booths]);
	const {
		eventsByBooth,
		truncatedByBooth,
		isError: attentionUnavailable,
	} = useBoothsCriticalEvents(boothIds, {
		subscribed: isFocused,
	});
	const lastSeenEventIdByBooth = useAttentionStore(
		(state) => state.lastSeenEventIdByBooth,
	);
	const seenHydrated = useAttentionStore((state) => state.hasHydrated);
	const attentionByBooth = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const [boothId, events] of Object.entries(eventsByBooth)) {
			const attention = countCriticalAttention(
				events,
				lastSeenEventIdByBooth[boothId],
			);
			// Before the seen-markers hydrate, only count refund-actionable
			// events so cold starts don't flash already-seen incidents.
			counts[boothId] = seenHydrated ? attention.total : attention.needsRefund;
		}
		return counts;
	}, [eventsByBooth, lastSeenEventIdByBooth, seenHydrated]);

	// Drop seen-markers for booths that no longer exist — the overview list
	// is the authoritative fleet roster.
	const pruneBoothMarkers = useAttentionStore(
		(state) => state.pruneBoothMarkers,
	);
	useEffect(() => {
		// Run whenever the roster has LOADED — including the zero-booth case,
		// where every marker is orphaned and should be pruned. `undefined`
		// (still loading / no data) must not prune.
		if (boothData?.booths) {
			pruneBoothMarkers(boothData.booths.map((booth) => booth.booth_id));
		}
	}, [boothData?.booths, pruneBoothMarkers]);

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
		await Promise.all([
			refetch(),
			refetchSubscriptions(),
			// The attention badges ride per-booth critical-events queries —
			// without this, pull-to-refresh would show fresh revenue next to
			// stale badges. Prefix matches every booth's entry.
			queryClient.refetchQueries({
				queryKey: ["booths", "criticalEvents"],
				type: "active",
			}),
		]);
	}, [refetch, refetchSubscriptions, queryClient]);

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

	// Error state
	if (error) {
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
				<ErrorState
					title="Failed to load booths"
					message={error.message || "An unexpected error occurred"}
					onRetry={() => refetch()}
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

				{/* All Booths Card */}
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
					onPress={() => setSelectedBoothId(ALL_BOOTHS_ID)}
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
					{selectedBoothId === ALL_BOOTHS_ID && (
						<View
							style={[styles.selectedBadge, { backgroundColor: BRAND_COLOR }]}
						>
							<IconSymbol name="checkmark" size={12} color="#FFFFFF" />
						</View>
					)}
				</TouchableOpacity>

				{/* Booth List */}
				<View style={styles.section}>
					<SectionHeader
						title="Your Booths"
						subtitle={`${filteredBooths.length} booth${filteredBooths.length !== 1 ? "s" : ""}`}
					/>

					{/* A failed critical-events fetch leaves a booth badge-less —
					    say so, since "no badge" otherwise reads as "no problems". */}
					{attentionUnavailable && (
						<ThemedText
							style={[styles.attentionUnavailable, { color: textSecondary }]}
						>
							Couldn&apos;t check critical events for some booths. Pull to retry.
						</ThemedText>
					)}

					{filteredBooths.map((booth) => (
						<BoothCard
							key={booth.id}
							booth={booth}
							isSelected={selectedBoothId === booth.id}
							subscriptionStatus={subscriptionMap.get(booth.id)}
							attentionCount={attentionByBooth[booth.id] ?? 0}
							attentionOverflow={
								// "N+" only when a badge shows: a truncated feed whose
								// first page needs no attention stays badge-less (the
								// paginated screen is the full-fidelity view).
								!!truncatedByBooth[booth.id] &&
								(attentionByBooth[booth.id] ?? 0) > 0
							}
							onAttentionPress={() => {
								// Select the booth too, so the dashboard the user
								// returns to matches the events they just triaged.
								setSelectedBoothId(booth.id);
								router.push(`/booths/${booth.id}/critical-events`);
							}}
							onPress={() => {
								// Set as active booth (no navigation — user can switch screens via tabs)
								setSelectedBoothId(booth.id);
							}}
							onEditPress={() => {
								// Look up raw API address to avoid passing the "No address" sentinel
								const rawBooth = boothData?.booths?.find(b => b.booth_id === booth.id);
								setEditingBooth({ ...booth, location: rawBooth?.booth_address ?? "" });
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

			{editingBooth && (
				<EditBoothModal
					visible={!!editingBooth}
					boothId={editingBooth.id}
					boothName={editingBooth.name}
					boothAddress={editingBooth.location}
					onClose={() => setEditingBooth(null)}
				/>
			)}
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
		fontSize: scaleFont(14),
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
		fontSize: scaleFont(15),
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
		fontSize: scaleFont(13),
		fontWeight: "500",
	},
	emptyState: {
		alignItems: "center",
		paddingVertical: Spacing.xxl,
		gap: Spacing.md,
	},
	attentionUnavailable: {
		fontSize: scaleFont(12),
		marginBottom: Spacing.sm,
	},
	emptyTitle: {
		fontSize: scaleFont(16),
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
		fontSize: scaleFont(14),
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
		fontSize: scaleFont(16),
	},
	allBoothsSubtitle: {
		fontSize: scaleFont(13),
		marginTop: 2,
	},
	selectedBadge: {
		width: 20,
		height: 20,
		borderRadius: 10,
		justifyContent: "center",
		alignItems: "center",
	},
});
