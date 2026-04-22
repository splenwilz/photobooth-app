/**
 * Stranded Paid Sessions Screen
 *
 * Lists the critical events for one booth that represent sessions where
 * payment was taken but the post-payment flow failed. Each row is the
 * entry point to issuing a refund out-of-band (Stripe / open till).
 *
 * Data sources:
 *   - useBoothCriticalEvents — the alert trigger (authoritative, fast)
 *   - useBoothTransactions  — amount + payment_method for the refund line
 *
 * @see docs stranded-sessions API
 */

import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
	useBoothCriticalEvents,
	useBoothTransactions,
} from "@/api/booths/queries";
import { StrandedSessionDetailsModal } from "@/components/booths";
import { ThemedText } from "@/components/themed-text";
import { ErrorState } from "@/components/ui/error-state";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	StatusColors,
	withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
	formatCriticalEventTag,
	formatCurrency,
	formatPaymentMethod,
	formatRelativeTime,
	joinCriticalEventsWithTransactions,
	type StrandedSessionRow,
} from "@/utils";

export default function StrandedSessionsScreen() {
	const { boothId } = useLocalSearchParams<{ boothId: string }>();

	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const tint = useThemeColor({}, "tint");
	const textSecondary = useThemeColor({}, "textSecondary");

	// Store only the event id; derive the live row each render from `rows`
	// so the modal sees fresh data when the list refetches under it (e.g.
	// post-refund invalidation, focus refetch, pull-to-refresh).
	const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

	// Fetch 200 transactions so we can resolve the refund amount/method for
	// critical events (doc's suggested limit). The critical-events feed is
	// authoritative; transactions is just the lookup table.
	const eventsQuery = useBoothCriticalEvents(boothId ?? null);
	const transactionsQuery = useBoothTransactions(boothId ?? null, {
		limit: 200,
		offset: 0,
	});

	const rows = useMemo(
		() =>
			joinCriticalEventsWithTransactions(
				eventsQuery.data?.events ?? [],
				transactionsQuery.data?.transactions ?? [],
			),
		[eventsQuery.data?.events, transactionsQuery.data?.transactions],
	);

	const selectedRow = useMemo(
		() => rows.find((r) => r.event.id === selectedEventId) ?? null,
		[rows, selectedEventId],
	);

	// If the selected event disappears from the list (e.g. server pruning,
	// dedupe shift), close the modal automatically.
	useEffect(() => {
		if (selectedEventId !== null && !selectedRow) {
			setSelectedEventId(null);
		}
	}, [selectedEventId, selectedRow]);

	const boothName =
		eventsQuery.data?.booth_name ?? transactionsQuery.data?.booth_name ?? "";

	const unrefundedCount = rows.filter((r) => r.event.refund === null).length;
	const refundedCount = rows.length - unrefundedCount;
	const subtitle = [
		unrefundedCount > 0
			? `${unrefundedCount} need${unrefundedCount === 1 ? "s" : ""} review`
			: null,
		refundedCount > 0
			? `${refundedCount} refunded`
			: null,
	]
		.filter(Boolean)
		.join(" · ");

	const onRefresh = useCallback(async () => {
		await Promise.all([eventsQuery.refetch(), transactionsQuery.refetch()]);
	}, [eventsQuery, transactionsQuery]);

	// The critical-events feed is authoritative (per the API doc) and now
	// carries `transaction_total_price` inline, so the screen can render
	// without the transactions lookup. Treat the transactions query as a
	// non-blocking enrichment: a failure or slow load shouldn't gate the UI.
	const isInitialLoading = eventsQuery.isLoading;
	const isRefreshing =
		(eventsQuery.isRefetching || transactionsQuery.isRefetching) &&
		!isInitialLoading;
	const error = eventsQuery.error;

	const renderItem = useCallback(
		({ item }: { item: StrandedSessionRow }) => (
			<SessionCard
				row={item}
				cardBg={cardBg}
				borderColor={borderColor}
				textSecondary={textSecondary}
				onPress={() => setSelectedEventId(item.event.id)}
			/>
		),
		[cardBg, borderColor, textSecondary],
	);

	const keyExtractor = useCallback(
		(item: StrandedSessionRow) => String(item.event.id),
		[],
	);

	return (
		<SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
					hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
					accessibilityRole="button"
					accessibilityLabel="Back"
					accessibilityHint="Returns to the previous screen"
				>
					<IconSymbol name="chevron.left" size={24} color={tint} />
				</TouchableOpacity>
				<View style={styles.headerCenter}>
					<ThemedText type="title" style={styles.headerTitle}>
						Needs Attention
					</ThemedText>
					{!!boothName && (
						<ThemedText
							style={[styles.headerSubtitle, { color: textSecondary }]}
							numberOfLines={1}
						>
							{boothName}
							{subtitle ? ` · ${subtitle}` : ""}
						</ThemedText>
					)}
				</View>
				<View style={styles.headerSpacer} />
			</View>

			{isInitialLoading ? (
				<View style={styles.centered}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
					<ThemedText style={[styles.loadingText, { color: textSecondary }]}>
						Loading sessions…
					</ThemedText>
				</View>
			) : error ? (
				<ErrorState
					title="Failed to load sessions"
					message={error.message || "An unexpected error occurred"}
					onRetry={onRefresh}
				/>
			) : (
				<FlatList
					data={rows}
					keyExtractor={keyExtractor}
					renderItem={renderItem}
					contentContainerStyle={styles.listContent}
					refreshControl={
						<RefreshControl
							refreshing={isRefreshing}
							onRefresh={onRefresh}
							tintColor={tint}
						/>
					}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<IconSymbol
								name="checkmark.circle.fill"
								size={64}
								color={StatusColors.success}
							/>
							<ThemedText type="subtitle" style={styles.emptyTitle}>
								No sessions need review
							</ThemedText>
							<ThemedText style={[styles.emptyBody, { color: textSecondary }]}>
								Stranded paid sessions will show up here. Pull to refresh.
							</ThemedText>
						</View>
					}
					showsVerticalScrollIndicator={false}
				/>
			)}

			<StrandedSessionDetailsModal
				visible={!!selectedRow}
				boothId={boothId ?? ""}
				row={selectedRow}
				onClose={() => setSelectedEventId(null)}
			/>
		</SafeAreaView>
	);
}

interface SessionCardProps {
	row: StrandedSessionRow;
	cardBg: string;
	borderColor: string;
	textSecondary: string;
	onPress: () => void;
}

function SessionCard({
	row,
	cardBg,
	borderColor,
	textSecondary,
	onPress,
}: SessionCardProps) {
	const { event, transaction } = row;

	// Prefer the server-joined refund on the event, but fall back to the
	// transaction's own refund_amount if the event hasn't been re-enriched
	// yet (the two queries refetch independently).
	const refundedAmount =
		event.refund?.refund_amount ?? transaction?.refund_amount ?? null;
	const isRefunded = refundedAmount !== null;

	// Prefer the server-joined amount; fall back to the transaction lookup if
	// the event ever lacks it (older rows, or sync lag).
	const amount =
		event.transaction_total_price ?? transaction?.total_price ?? null;

	let rightContent: React.ReactNode;
	if (isRefunded && refundedAmount !== null) {
		rightContent = (
			<View
				style={[
					styles.refundedBadge,
					{ backgroundColor: withAlpha(StatusColors.success, 0.12) },
				]}
			>
				<IconSymbol
					name="checkmark.circle.fill"
					size={12}
					color={StatusColors.success}
				/>
				<ThemedText
					style={[styles.refundedText, { color: StatusColors.success }]}
				>
					Refunded {formatCurrency(refundedAmount)}
				</ThemedText>
			</View>
		);
	} else if (amount !== null) {
		const methodLine = transaction
			? ` · ${formatPaymentMethod(transaction.payment_method)}`
			: "";
		rightContent = (
			<ThemedText
				type="defaultSemiBold"
				style={[styles.amountText, { color: BRAND_COLOR }]}
			>
				Refund {formatCurrency(amount)}
				{methodLine}
			</ThemedText>
		);
	} else {
		rightContent = (
			<ThemedText style={[styles.amountText, { color: textSecondary }]}>
				Amount pending sync
			</ThemedText>
		);
	}

	const a11yLabel = (() => {
		const code = event.transaction_code ?? "no reference code";
		if (isRefunded && refundedAmount !== null) {
			return `Refunded ${formatCurrency(refundedAmount)} for ${code}`;
		}
		if (amount !== null) {
			return `Refund ${formatCurrency(amount)} needed for ${code}`;
		}
		return `Refund needed for ${code} (amount pending sync)`;
	})();

	return (
		<TouchableOpacity
			style={[
				styles.card,
				{
					backgroundColor: cardBg,
					borderColor,
					opacity: isRefunded ? 0.7 : 1,
				},
			]}
			onPress={onPress}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityLabel={a11yLabel}
		>
			<View style={styles.cardRow}>
				<View style={styles.cardLeft}>
					{!isRefunded && (
						<View
							style={[
								styles.tagBadge,
								{ backgroundColor: withAlpha(StatusColors.error, 0.12) },
							]}
						>
							<IconSymbol
								name="exclamationmark.triangle.fill"
								size={11}
								color={StatusColors.error}
							/>
							<ThemedText
								style={[styles.tagText, { color: StatusColors.error }]}
								numberOfLines={1}
							>
								{formatCriticalEventTag(event.tag)}
							</ThemedText>
						</View>
					)}
					<ThemedText
						type="defaultSemiBold"
						style={styles.codeText}
						numberOfLines={1}
					>
						{event.transaction_code ?? "—"}
					</ThemedText>
					<ThemedText style={[styles.relativeTime, { color: textSecondary }]}>
						{formatRelativeTime(event.occurred_at)}
					</ThemedText>
				</View>
				<View style={styles.cardRight}>
					{rightContent}
					<IconSymbol name="chevron.right" size={16} color={textSecondary} />
				</View>
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
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
	headerCenter: { flex: 1 },
	headerTitle: { fontSize: 20 },
	headerSubtitle: { fontSize: 13, marginTop: 2 },
	headerSpacer: { width: 40 },
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: Spacing.md,
	},
	loadingText: { fontSize: 14 },
	listContent: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.xxl,
		flexGrow: 1,
	},
	card: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	cardRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: Spacing.sm,
	},
	cardLeft: { flex: 1, gap: 4 },
	cardRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	tagBadge: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 3,
		borderRadius: BorderRadius.full,
		gap: 4,
		marginBottom: 2,
	},
	tagText: {
		fontSize: 10,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},
	codeText: { fontSize: 14 },
	relativeTime: { fontSize: 12 },
	amountText: { fontSize: 13 },
	refundedBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.full,
		gap: 4,
	},
	refundedText: {
		fontSize: 12,
		fontWeight: "600",
	},
	emptyContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.xxl * 2,
		gap: Spacing.md,
	},
	emptyTitle: { fontSize: 18, textAlign: "center" },
	emptyBody: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
	},
});
