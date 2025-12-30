/**
 * Credits History Screen
 *
 * Displays a paginated list of credit commands (add credits).
 *
 * Features:
 * - Filter by command status (All/Delivered/Completed/Pending)
 * - Pull-to-refresh
 * - Current balance display
 * - Real API data from /api/v1/booths/{booth_id}/credits/history
 *
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 * @see api/credits - Credits API hooks
 */

import { useBoothCredits, useCreditsHistory } from "@/api/credits";
import type { CreditCommandStatus } from "@/api/credits/types";
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
import { formatRelativeTime } from "@/utils";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
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

type FilterType = "all" | CreditCommandStatus;

/**
 * Get icon for command status
 */
function getStatusIcon(status: CreditCommandStatus): string {
	switch (status) {
		case "completed":
			return "checkmark.circle.fill";
		case "delivered":
			return "arrow.up.circle.fill";
		case "pending":
			return "clock.fill";
		case "failed":
			return "xmark.circle.fill";
		default:
			return "circle.fill";
	}
}

/**
 * Get color for command status
 */
function getStatusColor(status: CreditCommandStatus): string {
	switch (status) {
		case "completed":
			return StatusColors.success;
		case "delivered":
			return BRAND_COLOR;
		case "pending":
			return StatusColors.warning;
		case "failed":
			return StatusColors.error;
		default:
			return StatusColors.neutral;
	}
}

/**
 * Get label for command status
 */
function getStatusLabel(status: CreditCommandStatus): string {
	switch (status) {
		case "completed":
			return "Completed";
		case "delivered":
			return "Delivered";
		case "pending":
			return "Pending";
		case "failed":
			return "Failed";
		default:
			return status;
	}
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

	const [filterType, setFilterType] = useState<FilterType>("all");

	// Get selected booth from global store
	const selectedBoothId = useBoothStore((s) => s.selectedBoothId);
	// For history, we need a specific booth, not "all booths"
	const effectiveBoothId =
		selectedBoothId === ALL_BOOTHS_ID ? null : selectedBoothId;

	// Fetch credit balance
	const { data: creditsData, isLoading: isLoadingCredits } =
		useBoothCredits(effectiveBoothId);

	// Fetch credits history
	const {
		data: historyData,
		isLoading: isLoadingHistory,
		refetch: refetchHistory,
		isRefetching,
	} = useCreditsHistory(effectiveBoothId, { limit: 50, offset: 0 });

	// Filter commands by status
	const filteredCommands = useMemo(() => {
		const commands = historyData?.commands ?? [];
		if (filterType === "all") return commands;
		return commands.filter((item) => item.status === filterType);
	}, [historyData?.commands, filterType]);

	// Handle refresh
	const handleRefresh = async () => {
		await refetchHistory();
	};

	// Filter options based on available statuses
	const filterOptions: { value: FilterType; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "delivered", label: "Delivered" },
		{ value: "completed", label: "Completed" },
		{ value: "pending", label: "Pending" },
	];

	const isLoading = isLoadingCredits || isLoadingHistory;
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
		<SafeAreaView
			style={[styles.container, { backgroundColor }]}
			edges={["top"]}
		>
			<CustomHeader
				title={`Credit History`}
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
						<ThemedText style={styles.balanceLabel}>Current Balance</ThemedText>
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

				{/* Filter Pills */}
				<View style={styles.filterRow}>
					{filterOptions.map((option) => {
						const isActive = filterType === option.value;
						return (
							<TouchableOpacity
								key={option.value}
								style={[
									styles.filterPill,
									{
										backgroundColor: isActive ? BRAND_COLOR : cardBg,
										borderColor: isActive ? BRAND_COLOR : borderColor,
									},
								]}
								onPress={() => setFilterType(option.value)}
								activeOpacity={0.7}
							>
								<ThemedText
									style={[
										styles.filterText,
										{ color: isActive ? "white" : textSecondary },
									]}
								>
									{option.label}
								</ThemedText>
							</TouchableOpacity>
						);
					})}
				</View>

				{/* Loading State */}
				{isLoading && (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={BRAND_COLOR} />
					</View>
				)}

				{/* Command List */}
				{!isLoading && (
					<View style={styles.transactionList}>
						{filteredCommands.length === 0 ? (
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
									No credit commands found
								</ThemedText>
							</View>
						) : (
							filteredCommands.map((item) => {
								const statusColor = getStatusColor(item.status);
								const statusIcon = getStatusIcon(item.status);
								const statusLabel = getStatusLabel(item.status);

								return (
									<View
										key={item.id}
										style={[
											styles.transactionCard,
											{ backgroundColor: cardBg, borderColor },
										]}
									>
										<View
											style={[
												styles.transactionIcon,
												{ backgroundColor: withAlpha(statusColor, 0.15) },
											]}
										>
											<IconSymbol
												name={statusIcon}
												size={20}
												color={statusColor}
											/>
										</View>

										<View style={styles.transactionContent}>
											<View style={styles.transactionHeader}>
												<ThemedText type="defaultSemiBold">
													+{item.amount.toLocaleString()} credits
												</ThemedText>
												<View
													style={[
														styles.statusBadge,
														{ backgroundColor: withAlpha(statusColor, 0.15) },
													]}
												>
													<ThemedText
														style={[styles.statusText, { color: statusColor }]}
													>
														{statusLabel}
													</ThemedText>
												</View>
											</View>
											<View style={styles.transactionFooter}>
												<ThemedText
													style={[
														styles.transactionNote,
														{ color: textSecondary },
													]}
													numberOfLines={1}
												>
													{item.reason || "No reason provided"}
												</ThemedText>
												<ThemedText
													style={[
														styles.transactionTime,
														{ color: textSecondary },
													]}
												>
													{formatRelativeTime(item.created_at)}
												</ThemedText>
											</View>
											{item.delivered_at && (
												<View style={styles.deliveryInfo}>
													<ThemedText
														style={[
															styles.deliveryText,
															{ color: textSecondary },
														]}
													>
														Delivered: {formatRelativeTime(item.delivered_at)}
													</ThemedText>
												</View>
											)}
										</View>
									</View>
								);
							})
						)}

						{/* Total count */}
						{historyData && historyData.total > 0 && (
							<ThemedText style={[styles.totalText, { color: textSecondary }]}>
								Showing {filteredCommands.length} of {historyData.total}{" "}
								commands
							</ThemedText>
						)}
					</View>
				)}
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
		marginBottom: Spacing.lg,
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
	filterRow: {
		flexDirection: "row",
		gap: Spacing.sm,
		marginBottom: Spacing.lg,
	},
	filterPill: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.full,
		borderWidth: 1,
	},
	filterText: {
		fontSize: 13,
		fontWeight: "500",
	},
	transactionList: {
		gap: Spacing.sm,
	},
	transactionCard: {
		flexDirection: "row",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.md,
	},
	transactionIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	transactionContent: {
		flex: 1,
	},
	transactionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 4,
	},
	transactionFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: Spacing.xs,
	},
	transactionNote: {
		fontSize: 12,
		flex: 1,
	},
	transactionTime: {
		fontSize: 11,
		marginLeft: Spacing.sm,
	},
	statusBadge: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: BorderRadius.sm,
	},
	statusText: {
		fontSize: 11,
		fontWeight: "600",
	},
	deliveryInfo: {
		marginTop: Spacing.xs,
		paddingTop: Spacing.xs,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: "rgba(150,150,150,0.2)",
	},
	deliveryText: {
		fontSize: 11,
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
	loadingContainer: {
		padding: Spacing.xl,
		alignItems: "center",
	},
	totalText: {
		textAlign: "center",
		fontSize: 12,
		marginTop: Spacing.md,
	},
});
