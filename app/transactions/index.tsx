/**
 * All Transactions Screen
 *
 * Full list of transactions with infinite scroll pagination.
 * Uses FlatList for efficient rendering of large lists.
 *
 * @see https://tanstack.com/query/latest/docs/react/guides/infinite-queries
 * @see GET /api/v1/analytics/revenue/dashboard - API endpoint with pagination
 */

import React, { useMemo, useCallback } from "react";
import {
	StyleSheet,
	View,
	FlatList,
	ActivityIndicator,
	TouchableOpacity,
	RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	Spacing,
	BorderRadius,
	BRAND_COLOR,
	StatusColors,
	withAlpha,
} from "@/constants/theme";

// API hook for infinite scroll
import { useTransactionsInfinite } from "@/api/analytics/queries";
import type { RecentTransaction } from "@/api/analytics/types";

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
 * Get payment status display and color
 */
function getPaymentStatusConfig(status: RecentTransaction["payment_status"]): {
	label: string;
	color: string;
} {
	switch (status) {
		case "completed":
			return { label: "Paid", color: StatusColors.success };
		case "pending":
			return { label: "Pending", color: StatusColors.warning };
		case "failed":
			return { label: "Failed", color: StatusColors.error };
		default:
			return { label: status, color: StatusColors.warning };
	}
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
	return `$${amount.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

/**
 * Format date and time
 */
function formatDateTime(timestamp: string): { date: string; time: string } {
	const dateObj = new Date(timestamp);
	return {
		date: dateObj.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		}),
		time: dateObj.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
		}),
	};
}

/**
 * Transaction card component
 */
const TransactionCard: React.FC<{
	transaction: RecentTransaction;
	cardBg: string;
	borderColor: string;
	textSecondary: string;
}> = ({ transaction, cardBg, borderColor, textSecondary }) => {
	const printStatusConfig = getPrintStatusConfig(transaction.print_status);
	const paymentStatusConfig = getPaymentStatusConfig(transaction.payment_status);
	const { date, time } = formatDateTime(transaction.timestamp);

	return (
		<View style={[styles.transactionCard, { backgroundColor: cardBg, borderColor }]}>
			<View style={styles.transactionHeader}>
				<View style={styles.transactionTitleRow}>
					<ThemedText type="defaultSemiBold" style={styles.transactionProduct}>
						{formatProductName(transaction.product)}
					</ThemedText>
					<ThemedText type="defaultSemiBold" style={{ color: BRAND_COLOR }}>
						{formatCurrency(transaction.amount)}
					</ThemedText>
				</View>
				<View style={styles.transactionSubtitleRow}>
					<ThemedText style={[styles.transactionDetails, { color: textSecondary }]}>
						{transaction.booth_name}
					</ThemedText>
					<ThemedText style={[styles.transactionTime, { color: textSecondary }]}>
						{date} • {time}
					</ThemedText>
				</View>
			</View>

			<View style={styles.transactionBody}>
				<View style={styles.detailRow}>
					<ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
						Template
					</ThemedText>
					<ThemedText style={styles.detailValue}>{transaction.template}</ThemedText>
				</View>
				<View style={styles.detailRow}>
					<ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
						Copies
					</ThemedText>
					<ThemedText style={styles.detailValue}>{transaction.copies}</ThemedText>
				</View>
				<View style={styles.detailRow}>
					<ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
						Payment
					</ThemedText>
					<ThemedText style={styles.detailValue}>
						{formatPaymentMethod(transaction.payment_method)}
					</ThemedText>
				</View>
			</View>

			<View style={styles.transactionMeta}>
				<View
					style={[
						styles.statusBadge,
						{ backgroundColor: withAlpha(paymentStatusConfig.color, 0.15) },
					]}
				>
					<ThemedText
						style={[styles.statusText, { color: paymentStatusConfig.color }]}
					>
						{paymentStatusConfig.label}
					</ThemedText>
				</View>
				<View
					style={[
						styles.statusBadge,
						{ backgroundColor: withAlpha(printStatusConfig.color, 0.15) },
					]}
				>
					<ThemedText
						style={[styles.statusText, { color: printStatusConfig.color }]}
					>
						{printStatusConfig.label}
					</ThemedText>
				</View>
			</View>
		</View>
	);
};

/**
 * All Transactions Screen Component
 */
export default function TransactionsScreen() {
	const backgroundColor = useThemeColor({}, "background");
	const tint = useThemeColor({}, "tint");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	// Fetch transactions with infinite scroll
	const {
		data,
		isLoading,
		error,
		refetch,
		isRefetching,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useTransactionsInfinite();

	// Flatten all pages into single transactions array
	const transactions = useMemo(() => {
		return data?.pages.flatMap((page) => page.recent_transactions.data) ?? [];
	}, [data]);

	// Total count from first page's pagination
	const totalCount = data?.pages[0]?.recent_transactions.pagination.total ?? 0;

	// Handle load more when user scrolls to bottom
	const handleLoadMore = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	// Render transaction item
	const renderItem = useCallback(
		({ item }: { item: RecentTransaction }) => (
			<TransactionCard
				transaction={item}
				cardBg={cardBg}
				borderColor={borderColor}
				textSecondary={textSecondary}
			/>
		),
		[cardBg, borderColor, textSecondary]
	);

	// Render footer with loading indicator
	const renderFooter = useCallback(() => {
		if (!isFetchingNextPage) return null;
		return (
			<View style={styles.footerLoader}>
				<ActivityIndicator size="small" color={BRAND_COLOR} />
				<ThemedText style={[styles.footerText, { color: textSecondary }]}>
					Loading more...
				</ThemedText>
			</View>
		);
	}, [isFetchingNextPage, textSecondary]);

	// Render empty state
	const renderEmpty = useCallback(() => {
		if (isLoading) return null;
		return (
			<View style={styles.emptyContainer}>
				<IconSymbol name="doc.text" size={64} color={textSecondary} />
				<ThemedText style={[styles.emptyTitle, { color: textSecondary }]}>
					No transactions yet
				</ThemedText>
				<ThemedText style={[styles.emptySubtitle, { color: textSecondary }]}>
					Transactions will appear here once customers start using your booths.
				</ThemedText>
			</View>
		);
	}, [isLoading, textSecondary]);

	// Loading state
	if (isLoading) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<IconSymbol name="chevron.left" size={24} color={tint} />
					</TouchableOpacity>
					<ThemedText type="title" style={styles.headerTitle}>
						All Transactions
					</ThemedText>
					<View style={styles.headerSpacer} />
				</View>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
					<ThemedText style={[styles.loadingText, { color: textSecondary }]}>
						Loading transactions...
					</ThemedText>
				</View>
			</SafeAreaView>
		);
	}

	// Error state
	if (error) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<IconSymbol name="chevron.left" size={24} color={tint} />
					</TouchableOpacity>
					<ThemedText type="title" style={styles.headerTitle}>
						All Transactions
					</ThemedText>
					<View style={styles.headerSpacer} />
				</View>
				<View style={styles.errorContainer}>
					<IconSymbol
						name="exclamationmark.triangle.fill"
						size={48}
						color={StatusColors.error}
					/>
					<ThemedText style={styles.errorTitle}>
						Failed to load transactions
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
		<SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<IconSymbol name="chevron.left" size={24} color={tint} />
				</TouchableOpacity>
				<View style={styles.headerCenter}>
					<ThemedText type="title" style={styles.headerTitle}>
						All Transactions
					</ThemedText>
					<ThemedText style={[styles.headerSubtitle, { color: textSecondary }]}>
						{totalCount} total
					</ThemedText>
				</View>
				<View style={styles.headerSpacer} />
			</View>

			{/* Transactions List */}
			<FlatList
				data={transactions}
				keyExtractor={(item) => item.id}
				renderItem={renderItem}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
				onEndReached={handleLoadMore}
				onEndReachedThreshold={0.5}
				ListFooterComponent={renderFooter}
				ListEmptyComponent={renderEmpty}
				refreshControl={
					<RefreshControl
						refreshing={isRefetching && !isFetchingNextPage}
						onRefresh={refetch}
						tintColor={tint}
					/>
				}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	backButton: {
		padding: Spacing.xs,
		marginRight: Spacing.sm,
	},
	headerCenter: {
		flex: 1,
	},
	headerTitle: {
		fontSize: 20,
	},
	headerSubtitle: {
		fontSize: 13,
		marginTop: 2,
	},
	headerSpacer: {
		width: 40,
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
	listContent: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.xxl,
	},
	transactionCard: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	transactionHeader: {
		marginBottom: Spacing.sm,
	},
	transactionTitleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	transactionProduct: {
		fontSize: 16,
	},
	transactionSubtitleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 4,
	},
	transactionDetails: {
		fontSize: 13,
	},
	transactionTime: {
		fontSize: 12,
	},
	transactionBody: {
		paddingVertical: Spacing.sm,
		borderTopWidth: 1,
		borderTopColor: "rgba(255,255,255,0.1)",
		borderBottomWidth: 1,
		borderBottomColor: "rgba(255,255,255,0.1)",
		marginBottom: Spacing.sm,
	},
	detailRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 4,
	},
	detailLabel: {
		fontSize: 13,
	},
	detailValue: {
		fontSize: 13,
	},
	transactionMeta: {
		flexDirection: "row",
		gap: Spacing.xs,
	},
	statusBadge: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: BorderRadius.sm,
	},
	statusText: {
		fontSize: 12,
		fontWeight: "500",
	},
	footerLoader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.lg,
		gap: Spacing.sm,
	},
	footerText: {
		fontSize: 14,
	},
	emptyContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.xxl * 2,
		paddingHorizontal: Spacing.xl,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "600",
		marginTop: Spacing.lg,
	},
	emptySubtitle: {
		fontSize: 14,
		textAlign: "center",
		marginTop: Spacing.sm,
	},
});



