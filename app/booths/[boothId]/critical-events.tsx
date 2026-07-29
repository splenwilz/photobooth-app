/**
 * Critical Events Screen ("Needs Attention")
 *
 * Lists ALL critical events for one booth, newest first:
 * - Transaction events (stranded paid sessions, bad payments): each row is
 *   the entry point to recording an out-of-band refund.
 * - Operational events (print stuck, printer recovery exhausted, …): each
 *   row is an incident report; viewing this screen marks them seen, which
 *   clears their share of the attention badges.
 *
 * Data sources:
 *   - useBoothCriticalEvents — the alert trigger (authoritative, fast)
 *   - useBoothTransactions  — amount + payment_method for the refund line
 *
 * @see GET /api/v1/booths/{booth_id}/critical-events
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
	useBoothCriticalEventsInfinite,
	useBoothTransactions,
} from "@/api/booths/queries";
import { CriticalEventDetailsModal } from "@/components/booths";
import { ThemedText } from "@/components/themed-text";
import { ErrorState } from "@/components/ui/error-state";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	StatusColors,
	withAlpha,
	scaleFont,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAttentionStore } from "@/stores/attention-store";
import {
	criticalEventGuidance,
	formatCriticalEventTag,
	formatCurrency,
	formatPaymentMethod,
	formatRelativeTime,
	isTransactionEvent,
	joinCriticalEventsWithTransactions,
	type CriticalEventRow,
} from "@/utils";

export default function CriticalEventsScreen() {
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

	// Paginated feed: the screen must reach events beyond the first page —
	// the badge hooks read only page 1 as a preview, but an unrefunded
	// stranded session pushed past the page boundary still needs a way to
	// be found and refunded here.
	const eventsQuery = useBoothCriticalEventsInfinite(boothId ?? null);
	// Fetch 200 transactions so we can resolve the refund amount/method for
	// critical events (doc's suggested limit). The critical-events feed is
	// authoritative; transactions is just the lookup table.
	const transactionsQuery = useBoothTransactions(boothId ?? null, {
		limit: 200,
		offset: 0,
	});

	const events = useMemo(
		() => eventsQuery.data?.pages.flatMap((page) => page.events),
		[eventsQuery.data?.pages],
	);

	const rows = useMemo(
		() =>
			joinCriticalEventsWithTransactions(
				events ?? [],
				transactionsQuery.data?.transactions ?? [],
			),
		[events, transactionsQuery.data?.transactions],
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
		eventsQuery.data?.pages[0]?.booth_name ??
		transactionsQuery.data?.booth_name ??
		"";

	// Viewing this screen IS the read-receipt for operational events: record
	// the newest event id so the attention badges stop counting them. The
	// marker covers every LOADED page (ids aren't page-ordered — the feed
	// sorts by occurred_at); events beyond the loaded pages were never
	// badge-counted (badges read page 1 only), so this can't hide anything
	// the operator was told about.
	const markBoothEventsSeen = useAttentionStore(
		(state) => state.markBoothEventsSeen,
	);
	// Gate on !error to mirror the render branch: when a refetch failed, the
	// screen shows ErrorState over the cached data — the operator did NOT see
	// the list, so the (monotonic, irreversible) marker must not advance.
	const eventsVisible = !eventsQuery.error;
	useEffect(() => {
		if (!boothId || !eventsVisible || !events?.length) return;
		markBoothEventsSeen(
			boothId,
			Math.max(...events.map((event) => event.id)),
		);
	}, [boothId, events, eventsVisible, markBoothEventsSeen]);

	const transactionRows = rows.filter((r) => isTransactionEvent(r.event));
	const needsReviewCount = transactionRows.filter(
		(r) => r.event.refund === null,
	).length;
	const refundedCount = transactionRows.length - needsReviewCount;
	const incidentCount = rows.length - transactionRows.length;
	const subtitle = [
		needsReviewCount > 0
			? `${needsReviewCount} need${needsReviewCount === 1 ? "s" : ""} review`
			: null,
		incidentCount > 0
			? `${incidentCount} incident${incidentCount === 1 ? "" : "s"}`
			: null,
		refundedCount > 0 ? `${refundedCount} refunded` : null,
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
		({ item }: { item: CriticalEventRow }) => (
			<EventCard
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
		(item: CriticalEventRow) => String(item.event.id),
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
						Loading events…
					</ThemedText>
				</View>
			) : error ? (
				<ErrorState
					title="Failed to load events"
					message={error.message || "An unexpected error occurred"}
					onRetry={onRefresh}
				/>
			) : (
				<FlatList
					testID="critical-events-list"
					data={rows}
					keyExtractor={keyExtractor}
					renderItem={renderItem}
					contentContainerStyle={styles.listContent}
					onEndReached={() => {
						if (eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage) {
							eventsQuery.fetchNextPage();
						}
					}}
					onEndReachedThreshold={0.5}
					ListFooterComponent={
						eventsQuery.isFetchingNextPage ? (
							<ActivityIndicator
								style={styles.footerSpinner}
								color={BRAND_COLOR}
							/>
						) : null
					}
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
								Nothing needs attention
							</ThemedText>
							<ThemedText style={[styles.emptyBody, { color: textSecondary }]}>
								Stranded sessions and booth incidents will show up here.
								Pull to refresh.
							</ThemedText>
						</View>
					}
					showsVerticalScrollIndicator={false}
				/>
			)}

			<CriticalEventDetailsModal
				visible={!!selectedRow}
				boothId={boothId ?? ""}
				row={selectedRow}
				onClose={() => setSelectedEventId(null)}
			/>
		</SafeAreaView>
	);
}

interface EventCardProps {
	row: CriticalEventRow;
	cardBg: string;
	borderColor: string;
	textSecondary: string;
	onPress: () => void;
}

function EventCard(props: EventCardProps) {
	return isTransactionEvent(props.row.event) ? (
		<TransactionEventCard {...props} />
	) : (
		<OperationalEventCard {...props} />
	);
}

/**
 * Operational incident row: no transaction, no refund workflow. The
 * `details` text is the payload; PRINTER_RECOVERY_FAILED additionally gets
 * the on-site guidance line.
 */
function OperationalEventCard({
	row,
	cardBg,
	borderColor,
	textSecondary,
	onPress,
}: EventCardProps) {
	const { event } = row;
	const guidance = criticalEventGuidance(event.tag);
	const tagLabel = formatCriticalEventTag(event.tag);
	// details can be a 500-char exception dump — keep the row label short for
	// screen readers; the modal carries the full text.
	const a11yDetails =
		event.details.length > 120
			? `${event.details.slice(0, 120)}…`
			: event.details;

	return (
		<TouchableOpacity
			style={[styles.card, { backgroundColor: cardBg, borderColor }]}
			onPress={onPress}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityLabel={`${tagLabel} incident, ${a11yDetails}`}
		>
			<View style={styles.cardRow}>
				<View style={styles.cardLeft}>
					<View
						style={[
							styles.tagBadge,
							{ backgroundColor: withAlpha(StatusColors.error, 0.12) },
						]}
					>
						<IconSymbol
							name="wrench.and.screwdriver.fill"
							size={11}
							color={StatusColors.error}
						/>
						<ThemedText
							style={[styles.tagText, { color: StatusColors.error }]}
							numberOfLines={1}
						>
							{tagLabel}
						</ThemedText>
					</View>
					<ThemedText style={styles.detailsText} numberOfLines={3}>
						{event.details || "No details reported."}
					</ThemedText>
					{guidance && (
						<ThemedText
							style={[styles.guidanceText, { color: StatusColors.error }]}
						>
							{guidance}
						</ThemedText>
					)}
					<ThemedText style={[styles.relativeTime, { color: textSecondary }]}>
						{formatRelativeTime(event.occurred_at)}
					</ThemedText>
				</View>
				<View style={styles.cardRight}>
					<IconSymbol name="chevron.right" size={16} color={textSecondary} />
				</View>
			</View>
		</TouchableOpacity>
	);
}

function TransactionEventCard({
	row,
	cardBg,
	borderColor,
	textSecondary,
	onPress,
}: EventCardProps) {
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
	headerTitle: { fontSize: scaleFont(20) },
	headerSubtitle: { fontSize: scaleFont(13), marginTop: 2 },
	headerSpacer: { width: 40 },
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: Spacing.md,
	},
	loadingText: { fontSize: scaleFont(14) },
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
		fontSize: scaleFont(10),
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},
	codeText: { fontSize: scaleFont(14) },
	relativeTime: { fontSize: scaleFont(12) },
	amountText: { fontSize: scaleFont(13) },
	detailsText: { fontSize: scaleFont(13), lineHeight: 18 },
	footerSpinner: { paddingVertical: Spacing.md },
	guidanceText: {
		fontSize: scaleFont(12),
		lineHeight: 17,
		fontWeight: "600",
	},
	refundedBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.full,
		gap: 4,
	},
	refundedText: {
		fontSize: scaleFont(12),
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
	emptyTitle: { fontSize: scaleFont(18), textAlign: "center" },
	emptyBody: {
		fontSize: scaleFont(14),
		textAlign: "center",
		lineHeight: 20,
	},
});
