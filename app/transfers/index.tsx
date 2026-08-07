/**
 * Booth Transfers List Screen (buyer side)
 *
 * Booth transfer offers addressed to the signed-in user, newest first.
 * Pending rows link to the review screen; rows past their expiry render as
 * expired (the server stamps the status lazily).
 *
 * Mirrors the web dashboard's /dashboard/transfers page — keep in sync.
 *
 * @see GET /api/v1/transfers
 * @see api/transfers/queries.ts - useMyTransfers
 */

import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { BoothTransfer } from "@/api/transfers";
import {
	displayStatus,
	formatTimeRemaining,
	transferErrorMessage,
	useMyTransfers,
} from "@/api/transfers";
import { ThemedText } from "@/components/themed-text";
import { TransferStatusBadge } from "@/components/transfers";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	scaleFont,
	withAlpha,
} from "@/constants/theme";
import { useMinuteTick } from "@/hooks/use-minute-tick";
import { useThemeColor } from "@/hooks/use-theme-color";

function formatDate(iso: string): string {
	const date = new Date(iso);
	return Number.isNaN(date.getTime())
		? ""
		: date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
}

export default function TransfersScreen() {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	const { data: transfers, isLoading, error, refetch } = useMyTransfers();

	// Minute-level tick keeps countdowns honest while the screen sits open
	// (refreshes on foreground too).
	const now = useMinuteTick();

	const handleBack = () => {
		// Deep-link/cold-start entries have no back stack — fall back to the
		// Booths tab instead of a dead back button.
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace("/(tabs)/booths");
		}
	};

	const [isManualRefreshing, setIsManualRefreshing] = useState(false);
	const onRefresh = useCallback(async () => {
		setIsManualRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsManualRefreshing(false);
		}
	}, [refetch]);

	const renderTransfer = useCallback(
		({ item }: { item: BoothTransfer }) => {
			const status = displayStatus(item, now);
			const remaining =
				status === "pending"
					? formatTimeRemaining(item.expires_at, now)
					: null;
			return (
				<TouchableOpacity
					style={[
						styles.transferCard,
						{ backgroundColor: cardBg, borderColor },
					]}
					onPress={() => router.push(`/transfers/${item.id}`)}
				>
					<View style={styles.transferCardBody}>
						<View style={styles.transferTitleRow}>
							<ThemedText style={styles.transferName} numberOfLines={1}>
								{item.booth_name}
							</ThemedText>
							<TransferStatusBadge status={status} />
						</View>
						<ThemedText
							style={[styles.transferMeta, { color: textSecondary }]}
						>
							Offered {formatDate(item.created_at)}
							{remaining ? ` · expires in ${remaining}` : ""}
						</ThemedText>
					</View>
					<IconSymbol name="chevron.right" size={18} color={textSecondary} />
				</TouchableOpacity>
			);
		},
		[cardBg, borderColor, textSecondary, now],
	);

	return (
		<SafeAreaView style={[styles.container, { backgroundColor }]}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={handleBack} style={styles.backButton}>
					<IconSymbol name="chevron.left" size={24} color={BRAND_COLOR} />
				</TouchableOpacity>
				<View style={styles.headerTextContainer}>
					<ThemedText type="title" style={styles.title}>
						Booth Transfers
					</ThemedText>
					<ThemedText style={[styles.subtitle, { color: textSecondary }]}>
						Booths other operators have offered to you
					</ThemedText>
				</View>
			</View>

			{isLoading && !transfers ? (
				<View style={styles.centerContent}>
					<ActivityIndicator color={BRAND_COLOR} size="large" />
				</View>
			) : error ? (
				<View style={styles.centerContent}>
					<ThemedText style={styles.errorTitle}>
						Failed to load transfers
					</ThemedText>
					<ThemedText style={[styles.errorMessage, { color: textSecondary }]}>
						{/* Mapped copy, never error.message: the client stringifies
						    object error bodies and raw JSON is not user-facing */}
						{transferErrorMessage(error)}
					</ThemedText>
					<TouchableOpacity
						style={[styles.retryButton, { backgroundColor: BRAND_COLOR }]}
						onPress={() => refetch()}
					>
						<ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
					</TouchableOpacity>
				</View>
			) : (
				<FlatList
					data={transfers ?? []}
					keyExtractor={(item) => item.id}
					renderItem={renderTransfer}
					contentContainerStyle={styles.listContent}
					refreshControl={
						<RefreshControl
							refreshing={isManualRefreshing}
							onRefresh={onRefresh}
							tintColor={BRAND_COLOR}
						/>
					}
					ListEmptyComponent={
						<View style={styles.emptyState}>
							<View
								style={[
									styles.emptyIcon,
									{ backgroundColor: withAlpha(BRAND_COLOR, 0.1) },
								]}
							>
								<IconSymbol
									name="arrow.left.arrow.right"
									size={40}
									color={BRAND_COLOR}
								/>
							</View>
							<ThemedText type="subtitle" style={styles.emptyTitle}>
								No Transfer Offers
							</ThemedText>
							<ThemedText
								style={[styles.emptySubtitle, { color: textSecondary }]}
							>
								When someone offers you a booth, it will show up here and in
								your email.
							</ThemedText>
						</View>
					}
				/>
			)}
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
		gap: Spacing.sm,
	},
	backButton: {
		padding: Spacing.xs,
		marginLeft: -Spacing.xs,
	},
	headerTextContainer: {
		flex: 1,
	},
	title: {
		fontSize: scaleFont(24),
	},
	subtitle: {
		fontSize: scaleFont(13),
		marginTop: 2,
	},
	centerContent: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: Spacing.xl,
	},
	errorTitle: {
		fontSize: scaleFont(16),
		fontWeight: "600",
		marginBottom: Spacing.xs,
	},
	errorMessage: {
		fontSize: scaleFont(14),
		textAlign: "center",
		marginBottom: Spacing.lg,
	},
	retryButton: {
		borderRadius: BorderRadius.lg,
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.sm,
	},
	retryButtonText: {
		color: "#FFFFFF",
		fontSize: scaleFont(15),
		fontWeight: "600",
	},
	listContent: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.xl,
		gap: Spacing.sm,
		flexGrow: 1,
	},
	transferCard: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: BorderRadius.xl,
		padding: Spacing.md,
		gap: Spacing.sm,
	},
	transferCardBody: {
		flex: 1,
		gap: 4,
	},
	transferTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	transferName: {
		fontSize: scaleFont(16),
		fontWeight: "600",
		flexShrink: 1,
	},
	transferMeta: {
		fontSize: scaleFont(13),
	},
	emptyState: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: Spacing.xl,
	},
	emptyIcon: {
		width: 80,
		height: 80,
		borderRadius: BorderRadius.full,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: Spacing.md,
	},
	emptyTitle: {
		marginBottom: Spacing.xs,
	},
	emptySubtitle: {
		fontSize: scaleFont(14),
		textAlign: "center",
	},
});
