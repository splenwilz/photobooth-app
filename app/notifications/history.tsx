/**
 * Notification History Screen
 *
 * Shows the user's email notification log — every email sent, failed, or skipped.
 * Supports pagination with a "Load More" button.
 *
 * @see GET /api/v1/notifications/history
 */

import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	RefreshControl,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useNotificationHistory } from "@/api/notifications/queries";
import type {
	NotificationHistoryItem,
	NotificationStatus,
} from "@/api/notifications/types";
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

const PAGE_SIZE = 20;

/** Status badge color mapping */
const STATUS_COLORS: Record<NotificationStatus, string> = {
	sent: StatusColors.success,
	failed: StatusColors.error,
	skipped: "#8B949E", // neutral gray
};

/** Status display labels */
const STATUS_LABELS: Record<NotificationStatus, string> = {
	sent: "Sent",
	failed: "Failed",
	skipped: "Skipped",
};

/** Format ISO timestamp to readable date */
function formatTimestamp(iso: string): string {
	const date = new Date(iso);
	return date.toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

/** Single history item row */
function HistoryItemRow({ item }: { item: NotificationHistoryItem }) {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const statusColor = STATUS_COLORS[item.status];

	return (
		<View style={[styles.historyItem, { backgroundColor: cardBg, borderColor }]}>
			{/* Status indicator */}
			<View
				style={[
					styles.statusDot,
					{ backgroundColor: statusColor },
				]}
			/>

			<View style={styles.historyContent}>
				{/* Subject */}
				<ThemedText type="defaultSemiBold" style={styles.historySubject} numberOfLines={2}>
					{item.subject}
				</ThemedText>

				{/* Metadata row */}
				<View style={styles.historyMeta}>
					<View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.15) }]}>
						<ThemedText style={[styles.statusText, { color: statusColor }]}>
							{STATUS_LABELS[item.status]}
						</ThemedText>
					</View>
					<ThemedText style={[styles.historyTimestamp, { color: textSecondary }]}>
						{formatTimestamp(item.created_at)}
					</ThemedText>
				</View>

				{/* Recipient */}
				<ThemedText style={[styles.historyRecipient, { color: textSecondary }]} numberOfLines={1}>
					{item.recipient_email}
				</ThemedText>
			</View>
		</View>
	);
}

export default function NotificationHistoryScreen() {
	const backgroundColor = useThemeColor({}, "background");
	const textSecondary = useThemeColor({}, "textSecondary");

	const [offset, setOffset] = useState(0);
	const [allItems, setAllItems] = useState<NotificationHistoryItem[]>([]);

	const { data, isLoading, error, refetch, isRefetching } =
		useNotificationHistory({ limit: PAGE_SIZE, offset });

	// Update items when data changes — truncate to offset before appending
	// to prevent duplicates if React Query background-refetches a page
	useEffect(() => {
		if (data?.items) {
			if (offset === 0) {
				setAllItems(data.items);
			} else {
				setAllItems((prev) => [...prev.slice(0, offset), ...data.items]);
			}
		}
	}, [data?.items, offset]);

	const hasMore = useMemo(() => {
		return data?.total ? allItems.length < data.total : false;
	}, [allItems.length, data?.total]);

	const handleLoadMore = useCallback(() => {
		setOffset((prev) => prev + PAGE_SIZE);
	}, []);

	const handleRefresh = useCallback(() => {
		if (offset === 0) {
			// Already on first page — just refetch it
			refetch();
		} else {
			// Reset to first page — query key change triggers fetch automatically
			setOffset(0);
		}
	}, [offset, refetch]);

	// Loading state (initial load only)
	if (isLoading && offset === 0) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader
					title="Notification History"
					showBackButton
					onBackPress={() => router.back()}
				/>
				<View style={styles.centerContent}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
				</View>
			</SafeAreaView>
		);
	}

	// Error state
	if (error && offset === 0) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader
					title="Notification History"
					showBackButton
					onBackPress={() => router.back()}
				/>
				<View style={styles.centerContent}>
					<IconSymbol
						name="exclamationmark.triangle"
						size={48}
						color={StatusColors.warning}
					/>
					<ThemedText style={[styles.errorText, { color: textSecondary }]}>
						Failed to load notification history
					</ThemedText>
					<TouchableOpacity
						style={[styles.retryButton, { backgroundColor: BRAND_COLOR }]}
						onPress={() => refetch()}
						activeOpacity={0.7}
					>
						<ThemedText style={styles.retryButtonText}>Retry</ThemedText>
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
				title="Notification History"
				showBackButton
				onBackPress={() => router.back()}
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
				{allItems.length === 0 ? (
					/* Empty state */
					<View style={styles.emptyState}>
						<IconSymbol name="envelope" size={48} color={textSecondary} />
						<ThemedText
							style={[styles.emptyText, { color: textSecondary }]}
						>
							No notification history yet
						</ThemedText>
						<ThemedText
							style={[styles.emptySubtext, { color: textSecondary }]}
						>
							Emails you receive will appear here
						</ThemedText>
					</View>
				) : (
					<>
						{/* Total count */}
						<ThemedText
							style={[styles.totalCount, { color: textSecondary }]}
						>
							{data?.total ?? 0} notification{(data?.total ?? 0) !== 1 ? "s" : ""}
						</ThemedText>

						{/* History items */}
						{allItems.map((item) => (
							<HistoryItemRow key={item.id} item={item} />
						))}

						{/* Load more button */}
						{hasMore && (
							<TouchableOpacity
								style={[
									styles.loadMoreButton,
									{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
								]}
								onPress={handleLoadMore}
								activeOpacity={0.7}
								disabled={isLoading}
							>
								{isLoading ? (
									<ActivityIndicator size="small" color={BRAND_COLOR} />
								) : (
									<ThemedText
										style={[styles.loadMoreText, { color: BRAND_COLOR }]}
									>
										Load More
									</ThemedText>
								)}
							</TouchableOpacity>
						)}
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
	content: {
		flex: 1,
		paddingHorizontal: Spacing.lg,
	},
	centerContent: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: Spacing.md,
	},
	errorText: {
		fontSize: 16,
		marginTop: Spacing.sm,
	},
	retryButton: {
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		marginTop: Spacing.sm,
	},
	retryButtonText: {
		color: "white",
		fontSize: 14,
		fontWeight: "600",
	},
	totalCount: {
		fontSize: 13,
		marginTop: Spacing.lg,
		marginBottom: Spacing.sm,
	},
	historyItem: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
		gap: Spacing.sm,
	},
	statusDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		marginTop: 5,
	},
	historyContent: {
		flex: 1,
	},
	historySubject: {
		fontSize: 14,
		lineHeight: 20,
	},
	historyMeta: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		marginTop: Spacing.xs,
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
	historyTimestamp: {
		fontSize: 12,
	},
	historyRecipient: {
		fontSize: 12,
		marginTop: Spacing.xs,
	},
	emptyState: {
		alignItems: "center",
		justifyContent: "center",
		paddingTop: Spacing.xxl * 2,
		gap: Spacing.sm,
	},
	emptyText: {
		fontSize: 16,
		fontWeight: "600",
		marginTop: Spacing.sm,
	},
	emptySubtext: {
		fontSize: 14,
	},
	loadMoreButton: {
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.md,
		marginTop: Spacing.sm,
	},
	loadMoreText: {
		fontSize: 14,
		fontWeight: "600",
	},
});
