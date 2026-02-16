/**
 * Credits History Screen
 *
 * Displays a paginated list of credit transactions with filters.
 *
 * Features:
 * - Filter by transaction type, source, and date range via modal
 * - Floating filter button
 * - Swipe-to-delete transactions
 * - Clear all history option
 * - Pull-to-refresh
 * - Current balance display
 *
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 * @see api/credits - Credits API hooks
 */

import { useBoothCredits, useCreditsHistory, useDeleteCreditsHistory } from "@/api/credits";
import type {
	CreditTransaction,
	CreditTransactionType,
	CreditsHistoryParams,
} from "@/api/credits/types";
import {
	HistoryFilterModal,
	SwipeableTransaction,
	type FilterState,
} from "@/components/credits";
import { CustomHeader } from "@/components/custom-header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	StatusColors,
	withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ALL_BOOTHS_ID, useBoothStore } from "@/stores/booth-store";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	RefreshControl,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Get date range for filter
 */
function getDateRange(
	filter: "all" | "today" | "7days" | "30days",
): { from?: string; to?: string } {
	if (filter === "all") return {};

	const now = new Date();
	const to = now.toISOString();

	switch (filter) {
		case "today": {
			const start = new Date(now);
			start.setHours(0, 0, 0, 0);
			return { from: start.toISOString(), to };
		}
		case "7days": {
			const start = new Date(now);
			start.setDate(start.getDate() - 7);
			return { from: start.toISOString(), to };
		}
		case "30days": {
			const start = new Date(now);
			start.setDate(start.getDate() - 30);
			return { from: start.toISOString(), to };
		}
		default:
			return {};
	}
}

/**
 * Get icon for transaction type
 */
function getTransactionIcon(type: CreditTransactionType): string {
	switch (type) {
		case "Add":
			return "plus.circle.fill";
		case "Deduct":
			return "minus.circle.fill";
		case "Reset":
			return "arrow.counterclockwise.circle.fill";
		default:
			return "circle.fill";
	}
}

/**
 * Get color for transaction type
 */
function getTransactionColor(type: CreditTransactionType): string {
	switch (type) {
		case "Add":
			return StatusColors.success;
		case "Deduct":
			return StatusColors.warning;
		case "Reset":
			return BRAND_COLOR;
		default:
			return StatusColors.neutral;
	}
}

/**
 * Format amount with sign based on transaction type
 */
function formatAmount(amount: number, type: CreditTransactionType): string {
	if (type === "Add") {
		return `+${amount.toLocaleString()}`;
	}
	if (type === "Reset") {
		return amount.toLocaleString();
	}
	return `-${amount.toLocaleString()}`;
}

/**
 * Get display name for source
 */
function getSourceDisplayName(source: string): string {
	const names: Record<string, string> = {
		cloud: "Mobile App",
		booth_admin: "Booth Admin",
		booth_pcb: "PCB Payment",
		booth_system: "System",
		mobile_app: "Mobile App",
		system: "System",
		booth: "Booth",
	};
	return names[source] || source.replace(/_/g, " ");
}

/**
 * Credits History Screen Component
 */
export default function CreditsHistoryScreen() {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const isFocused = useIsFocused();

	// Filter modal state
	const [showFilterModal, setShowFilterModal] = useState(false);
	const [filters, setFilters] = useState<FilterState>({
		transactionFilter: "all",
		sourceFilter: "all",
		dateFilter: "all",
	});

	// Get selected booth from global store
	const selectedBoothId = useBoothStore((s) => s.selectedBoothId);
	const effectiveBoothId =
		selectedBoothId === ALL_BOOTHS_ID ? null : selectedBoothId;

	// Delete mutation
	const deleteHistory = useDeleteCreditsHistory();

	// Build API params from filters
	const apiParams = useMemo<CreditsHistoryParams>(() => {
		const params: CreditsHistoryParams = {
			limit: 20,
			offset: 0,
		};

		if (filters.transactionFilter !== "all") {
			params.transaction_type = filters.transactionFilter;
		}

		if (filters.sourceFilter !== "all") {
			params.source = filters.sourceFilter;
		}

		const dateRange = getDateRange(filters.dateFilter);
		if (dateRange.from) params.date_from = dateRange.from;
		if (dateRange.to) params.date_to = dateRange.to;

		return params;
	}, [filters]);

	// Pagination state
	const PAGE_SIZE = 20;
	const [allTransactions, setAllTransactions] = useState<CreditTransaction[]>(
		[],
	);
	const [totalCount, setTotalCount] = useState(0);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [reachedEnd, setReachedEnd] = useState(false);

	// Fetch credit balance
	const {
		data: creditsData,
		isLoading: isLoadingCredits,
		refetch: refetchCredits,
	} = useBoothCredits(effectiveBoothId);

	// Fetch first page of credits history with filters
	const {
		data: historyData,
		isLoading: isLoadingHistory,
		refetch: refetchHistory,
		isRefetching,
	} = useCreditsHistory(effectiveBoothId, apiParams);

	// Initialize with first page data
	useEffect(() => {
		if (historyData?.transactions) {
			setAllTransactions(historyData.transactions);
			setTotalCount(historyData.total);
		}
	}, [historyData]);

	// Reset when booth or filters change
	useEffect(() => {
		setAllTransactions([]);
		setTotalCount(0);
		setReachedEnd(false);
	}, [effectiveBoothId, filters]);

	// Check if there are more items to load
	const hasNextPage =
		!reachedEnd && allTransactions.length < totalCount && totalCount > 0;

	// Check if any filter is active
	const hasActiveFilters =
		filters.transactionFilter !== "all" ||
		filters.sourceFilter !== "all" ||
		filters.dateFilter !== "all";

	// Count active filters
	const activeFilterCount = [
		filters.transactionFilter !== "all",
		filters.sourceFilter !== "all",
		filters.dateFilter !== "all",
	].filter(Boolean).length;

	// Load more handler
	const handleLoadMore = useCallback(async () => {
		if (isLoadingMore || !hasNextPage || !effectiveBoothId) return;

		setIsLoadingMore(true);
		try {
			const { getCreditsHistory } = await import("@/api/credits/services");
			const nextPage = await getCreditsHistory(effectiveBoothId, {
				...apiParams,
				limit: PAGE_SIZE,
				offset: allTransactions.length,
			});

			if (nextPage?.transactions) {
				const existingIds = new Set(allTransactions.map((t) => t.id));
				const newTransactions = nextPage.transactions.filter(
					(t) => !existingIds.has(t.id),
				);

				if (newTransactions.length === 0) {
					setReachedEnd(true);
				} else {
					setAllTransactions((prev) => [...prev, ...newTransactions]);
				}
				setTotalCount(nextPage.total);
			}
		} catch (error) {
			console.error("[CreditsHistory] Load more error:", error);
		} finally {
			setIsLoadingMore(false);
		}
	}, [
		isLoadingMore,
		hasNextPage,
		effectiveBoothId,
		allTransactions,
		apiParams,
	]);

	// Handle refresh - skip if no booth selected to avoid /booths/null/ API calls
	const handleRefresh = useCallback(async () => {
		if (!effectiveBoothId) return;

		setAllTransactions([]);
		setTotalCount(0);
		setReachedEnd(false);

		const [historyResult] = await Promise.all([
			refetchHistory(),
			refetchCredits(),
		]);

		if (historyResult.data?.transactions) {
			setAllTransactions(historyResult.data.transactions);
			setTotalCount(historyResult.data.total);
		}
	}, [effectiveBoothId, refetchHistory, refetchCredits]);

	// Handle filter apply
	const handleApplyFilters = useCallback((newFilters: FilterState) => {
		setFilters(newFilters);
	}, []);

	// Handle delete single transaction
	const handleDeleteTransaction = useCallback(
		(transactionId: string) => {
			if (!effectiveBoothId) return;

			Alert.alert(
				"Delete Transaction",
				"Are you sure you want to delete this transaction? This action cannot be undone.",
				[
					{ text: "Cancel", style: "cancel" },
					{
						text: "Delete",
						style: "destructive",
						onPress: () => {
							deleteHistory.mutate(
								{
									boothId: effectiveBoothId,
									params: { transaction_id: transactionId },
								},
								{
									onSuccess: () => {
										// Remove from local state immediately
										setAllTransactions((prev) =>
											prev.filter((t) => t.id !== transactionId),
										);
										setTotalCount((prev) => Math.max(0, prev - 1));
									},
									onError: (error) => {
										Alert.alert(
											"Error",
											"Failed to delete transaction. Please try again.",
										);
										console.error("[CreditsHistory] Delete error:", error);
									},
								},
							);
						},
					},
				],
			);
		},
		[effectiveBoothId, deleteHistory],
	);

	// Handle clear all history
	const handleClearAllHistory = useCallback(() => {
		if (!effectiveBoothId) return;

		Alert.alert(
			"Clear All History",
			"Are you sure you want to delete ALL credit history for this booth? This action cannot be undone!",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Clear All",
					style: "destructive",
					onPress: () => {
						Alert.alert(
							"Confirm Clear All",
							"This will permanently delete all transaction records. Are you absolutely sure?",
							[
								{ text: "Cancel", style: "cancel" },
								{
									text: "Yes, Clear All",
									style: "destructive",
									onPress: () => {
										deleteHistory.mutate(
											{
												boothId: effectiveBoothId,
												// No params = delete all
											},
											{
												onSuccess: (data) => {
													setAllTransactions([]);
													setTotalCount(0);
													Alert.alert(
														"History Cleared",
														`Successfully deleted ${data.deleted_count} transactions.`,
													);
												},
												onError: (error) => {
													Alert.alert(
														"Error",
														"Failed to clear history. Please try again.",
													);
													console.error(
														"[CreditsHistory] Clear all error:",
														error,
													);
												},
											},
										);
									},
								},
							],
						);
					},
				},
			],
		);
	}, [effectiveBoothId, deleteHistory]);

	// Only show full loading state on initial load
	const isInitialLoading =
		(isLoadingCredits || isLoadingHistory) && allTransactions.length === 0;
	const creditsBalance = creditsData?.credit_balance ?? 0;

	// Show message if no booth selected
	if (!effectiveBoothId) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader
					title="Credit History"
					showBackButton
					onBackPress={() => router.back()}
				/>
				<View style={styles.centerContent}>
					<IconSymbol name="photo.stack" size={48} color={textSecondary} />
					<ThemedText
						style={[
							styles.emptyText,
							{ color: textSecondary, marginTop: Spacing.md },
						]}
					>
						Select a specific booth to view credit history
					</ThemedText>
					<TouchableOpacity
						style={[styles.selectBoothButton, { backgroundColor: BRAND_COLOR }]}
						onPress={() => router.push("/(tabs)/booths")}
					>
						<ThemedText style={styles.selectBoothButtonText}>
							Select Booth
						</ThemedText>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader
					title="Credit History"
					showBackButton
					onBackPress={() => router.back()}
				/>

				<ScrollView
					style={styles.content}
					contentContainerStyle={styles.contentContainer}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={isFocused && isRefetching}
							onRefresh={handleRefresh}
							tintColor={BRAND_COLOR}
						/>
					}
				>
					{/* Current Balance Card */}
					<View style={[styles.balanceCard, { backgroundColor: BRAND_COLOR }]}>
						<View style={styles.balanceContent}>
							<ThemedText style={styles.balanceLabel}>
								Current Balance
							</ThemedText>
							<View style={styles.balanceRow}>
								{isLoadingCredits ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									<ThemedText style={styles.balanceValue}>
										{creditsBalance.toLocaleString()}
									</ThemedText>
								)}
								<ThemedText style={styles.balanceUnit}>credits</ThemedText>
							</View>
						</View>
						<IconSymbol
							name="creditcard.fill"
							size={48}
							color="rgba(255,255,255,0.3)"
						/>
					</View>

					{/* Clear All Button */}
					{allTransactions.length > 0 && (
						<TouchableOpacity
							style={[
								styles.clearAllButton,
								{ borderColor: StatusColors.error },
							]}
							onPress={handleClearAllHistory}
							disabled={deleteHistory.isPending}
							activeOpacity={0.7}
						>
							<IconSymbol name="trash" size={16} color={StatusColors.error} />
							<ThemedText
								style={[styles.clearAllButtonText, { color: StatusColors.error }]}
							>
								Clear All History
							</ThemedText>
						</TouchableOpacity>
					)}

					{/* Active Filters Badge */}
					{hasActiveFilters && (
						<View
							style={[
								styles.activeFiltersBadge,
								{
									backgroundColor: withAlpha(BRAND_COLOR, 0.1),
									borderColor: BRAND_COLOR,
								},
							]}
						>
							<IconSymbol
								name="line.3.horizontal.decrease.circle.fill"
								size={16}
								color={BRAND_COLOR}
							/>
							<ThemedText
								style={[styles.activeFiltersText, { color: BRAND_COLOR }]}
							>
								{activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}{" "}
								active
							</ThemedText>
							<TouchableOpacity
								onPress={() =>
									setFilters({
										transactionFilter: "all",
										sourceFilter: "all",
										dateFilter: "all",
									})
								}
								hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
							>
								<IconSymbol
									name="xmark.circle.fill"
									size={18}
									color={BRAND_COLOR}
								/>
							</TouchableOpacity>
						</View>
					)}

					{/* Swipe hint */}
					{allTransactions.length > 0 && !hasActiveFilters && (
						<ThemedText style={[styles.swipeHint, { color: textSecondary }]}>
							Swipe left on a transaction to delete
						</ThemedText>
					)}

					{/* Loading State */}
					{isInitialLoading && (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size="large" color={BRAND_COLOR} />
						</View>
					)}

					{/* Deleting indicator */}
					{deleteHistory.isPending && (
						<View
							style={[
								styles.deletingBanner,
								{ backgroundColor: withAlpha(StatusColors.error, 0.1) },
							]}
						>
							<ActivityIndicator size="small" color={StatusColors.error} />
							<ThemedText
								style={[styles.deletingText, { color: StatusColors.error }]}
							>
								Deleting...
							</ThemedText>
						</View>
					)}

					{/* Transaction List */}
					{!isInitialLoading && (
						<View style={styles.transactionList}>
							{allTransactions.length === 0 ? (
								<View
									style={[
										styles.emptyCard,
										{ backgroundColor: cardBg, borderColor },
									]}
								>
									<IconSymbol name="tray" size={40} color={textSecondary} />
									<ThemedText
										style={[styles.emptyText, { color: textSecondary }]}
									>
										{hasActiveFilters
											? "No transactions match your filters"
											: "No transactions found"}
									</ThemedText>
									{hasActiveFilters && (
										<TouchableOpacity
											style={[
												styles.clearFiltersButton,
												{ backgroundColor: withAlpha(BRAND_COLOR, 0.1) },
											]}
											onPress={() =>
												setFilters({
													transactionFilter: "all",
													sourceFilter: "all",
													dateFilter: "all",
												})
											}
										>
											<ThemedText
												style={[styles.clearFiltersText, { color: BRAND_COLOR }]}
											>
												Clear Filters
											</ThemedText>
										</TouchableOpacity>
									)}
								</View>
							) : (
								allTransactions.map((item) => (
									<SwipeableTransaction
										key={item.id}
										item={item}
										onDelete={handleDeleteTransaction}
										getTransactionIcon={getTransactionIcon}
										getTransactionColor={getTransactionColor}
										formatAmount={formatAmount}
										getSourceDisplayName={getSourceDisplayName}
									/>
								))
							)}

							{/* Load More Button */}
							{hasNextPage && (
								<TouchableOpacity
									style={[
										styles.loadMoreButton,
										{ backgroundColor: cardBg, borderColor },
									]}
									onPress={handleLoadMore}
									disabled={isLoadingMore}
									activeOpacity={0.7}
								>
									{isLoadingMore ? (
										<ActivityIndicator size="small" color={BRAND_COLOR} />
									) : (
										<>
											<IconSymbol
												name="arrow.down"
												size={16}
												color={BRAND_COLOR}
											/>
											<ThemedText
												style={[styles.loadMoreText, { color: BRAND_COLOR }]}
											>
												Load More
											</ThemedText>
										</>
									)}
								</TouchableOpacity>
							)}

							{/* Total count */}
							{allTransactions.length > 0 && (
								<ThemedText
									style={[styles.totalText, { color: textSecondary }]}
								>
									{reachedEnd || allTransactions.length >= totalCount
										? `${allTransactions.length} transactions`
										: `Showing ${allTransactions.length} of ${totalCount} transactions`}
								</ThemedText>
							)}
						</View>
					)}

					{/* Bottom padding for FAB */}
					<View style={{ height: 80 }} />
				</ScrollView>

				{/* Floating Filter Button */}
				<TouchableOpacity
					style={[styles.fab, { backgroundColor: BRAND_COLOR }]}
					onPress={() => setShowFilterModal(true)}
					activeOpacity={0.8}
				>
					<IconSymbol
						name="line.3.horizontal.decrease.circle"
						size={24}
						color="white"
					/>
					{hasActiveFilters && (
						<View style={styles.fabBadge}>
							<ThemedText style={styles.fabBadgeText}>
								{activeFilterCount}
							</ThemedText>
						</View>
					)}
				</TouchableOpacity>

				{/* Filter Modal */}
				<HistoryFilterModal
					visible={showFilterModal}
					filters={filters}
					onClose={() => setShowFilterModal(false)}
					onApply={handleApplyFilters}
				/>
			</SafeAreaView>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: Spacing.lg,
		paddingBottom: Spacing.xl,
	},
	balanceCard: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: Spacing.lg,
		borderRadius: BorderRadius.lg,
		marginBottom: Spacing.md,
	},
	balanceContent: {
		flex: 1,
	},
	balanceLabel: {
		color: "rgba(255,255,255,0.8)",
		fontSize: 14,
		marginBottom: Spacing.xs,
	},
	balanceRow: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: Spacing.xs,
	},
	balanceValue: {
		color: "white",
		fontSize: 36,
		fontWeight: "700",
		lineHeight: 40,
	},
	balanceUnit: {
		color: "rgba(255,255,255,0.8)",
		fontSize: 16,
	},
	// Clear all button
	clearAllButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.sm,
		paddingHorizontal: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		marginBottom: Spacing.md,
		gap: Spacing.xs,
	},
	clearAllButtonText: {
		fontSize: 14,
		fontWeight: "500",
	},
	// Active filters badge
	activeFiltersBadge: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.sm,
		paddingHorizontal: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		marginBottom: Spacing.md,
		gap: Spacing.xs,
	},
	activeFiltersText: {
		flex: 1,
		fontSize: 13,
		fontWeight: "500",
	},
	swipeHint: {
		fontSize: 12,
		textAlign: "center",
		marginBottom: Spacing.sm,
	},
	deletingBanner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing.sm,
		borderRadius: BorderRadius.md,
		marginBottom: Spacing.md,
		gap: Spacing.xs,
	},
	deletingText: {
		fontSize: 13,
		fontWeight: "500",
	},
	// Transaction list
	transactionList: {
		gap: Spacing.sm,
	},
	emptyCard: {
		padding: Spacing.xl,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.sm,
	},
	emptyText: {
		fontSize: 14,
		textAlign: "center",
	},
	centerContent: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing.xl,
	},
	selectBoothButton: {
		marginTop: Spacing.lg,
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.md,
	},
	selectBoothButtonText: {
		color: "white",
		fontWeight: "600",
		fontSize: 14,
	},
	clearFiltersButton: {
		marginTop: Spacing.md,
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
	},
	clearFiltersText: {
		fontSize: 14,
		fontWeight: "500",
	},
	loadingContainer: {
		padding: Spacing.xl,
		alignItems: "center",
	},
	totalText: {
		textAlign: "center",
		fontSize: 12,
		marginTop: Spacing.md,
	},
	loadMoreButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.xs,
		marginTop: Spacing.sm,
	},
	loadMoreText: {
		fontSize: 14,
		fontWeight: "600",
	},
	// Floating Action Button
	fab: {
		position: "absolute",
		bottom: Spacing.xl,
		right: Spacing.lg,
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 6,
		elevation: 8,
	},
	fabBadge: {
		position: "absolute",
		top: -2,
		right: -2,
		backgroundColor: StatusColors.error,
		width: 20,
		height: 20,
		borderRadius: 10,
		justifyContent: "center",
		alignItems: "center",
	},
	fabBadgeText: {
		color: "white",
		fontSize: 11,
		fontWeight: "bold",
	},
});
