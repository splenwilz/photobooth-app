/**
 * Cash Box Screen
 *
 * Per-booth view of the physical cash sitting in the bill acceptors (NOT
 * revenue) plus the paginated audit history of operator "Collect" actions.
 * Reached from the Dashboard's Cash Box link row (after the revenue stats).
 *
 * Data sources:
 *   - useBoothDetail — the live cash_box snapshot (rides the overview)
 *   - useBoothCashCollectionsInfinite — the collection history
 *
 * Ordering: the server returns rows newest-first (`collected_at` desc,
 * booth-local `local_id` tie-break, stable across pages). The list renders
 * that order verbatim — do NOT re-sort client-side, and never use
 * `synced_at` (first-upgrade backfill makes it much later than the real
 * collection time).
 *
 * @see docs Cash Box API — GET /api/v1/booths/{booth_id}/cash-collections
 */

import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo } from "react";
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
	useBoothCashCollectionsInfinite,
	useBoothDetail,
} from "@/api/booths/queries";
import type { CashCollection } from "@/api/booths/types";
import { CashBoxCard, CashCollectionRow } from "@/components/booths";
import { ThemedText } from "@/components/themed-text";
import { ErrorState } from "@/components/ui/error-state";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SectionHeader } from "@/components/ui/section-header";
import { BRAND_COLOR, Spacing, scaleFont } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function CashBoxScreen() {
	const { boothId } = useLocalSearchParams<{ boothId: string }>();

	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const tint = useThemeColor({}, "tint");
	const textSecondary = useThemeColor({}, "textSecondary");

	// Live snapshot: rides the booth overview. If this query fails the
	// history below still works, so its error is non-blocking.
	const detailQuery = useBoothDetail(boothId ?? null);

	const {
		data,
		error,
		isLoading,
		isRefetching,
		refetch,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isFetchNextPageError,
	} = useBoothCashCollectionsInfinite(boothId ?? null);

	// Dedupe by id: offset pagination can re-serve the page-boundary row when
	// a new collection lands between page fetches (everything shifts down one).
	// Map keeps first insertion, so server order is preserved.
	const rows = useMemo(() => {
		const all = data?.pages.flatMap((page) => page.collections) ?? [];
		return Array.from(new Map(all.map((c) => [c.id, c])).values());
	}, [data]);

	const boothName =
		data?.pages[0]?.booth_name ?? detailQuery.data?.booth_name ?? "";
	const total = data?.pages[0]?.total;
	const subtitle =
		total !== undefined
			? `${total} collection${total === 1 ? "" : "s"}`
			: "";

	const handleLoadMore = useCallback(() => {
		// Don't auto-retry from scroll position while the error footer is
		// showing — retrying is the "Try again" button's job, and a scroll-
		// triggered fetch would race with it.
		if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
			fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

	const onRefresh = useCallback(() => {
		refetch();
		detailQuery.refetch();
	}, [refetch, detailQuery]);

	const renderItem = useCallback(
		({ item }: { item: CashCollection }) => (
			<CashCollectionRow
				collection={item}
				cardBg={cardBg}
				borderColor={borderColor}
				textSecondary={textSecondary}
			/>
		),
		[cardBg, borderColor, textSecondary],
	);

	const keyExtractor = useCallback((item: CashCollection) => item.id, []);

	// Only render the live card once the overview has loaded: an overview
	// *error* must not masquerade as the "cash tracking not available" state
	// (that copy is reserved for a real null cash_box from an older kiosk).
	// An overview failure gets its own inline note instead of silently
	// dropping the card.
	const listHeader = (
		<>
			{detailQuery.data ? (
				<View style={styles.cardContainer}>
					<CashBoxCard cashBox={detailQuery.data.cash_box} />
				</View>
			) : detailQuery.isError ? (
				<View style={styles.cardContainer}>
					<View style={styles.inlineNote}>
						<IconSymbol
							name="exclamationmark.triangle.fill"
							size={16}
							color={textSecondary}
						/>
						<ThemedText
							style={[styles.inlineNoteText, { color: textSecondary }]}
						>
							Couldn&apos;t load the cash balance. Pull to refresh.
						</ThemedText>
					</View>
				</View>
			) : null}
			<SectionHeader title="Collection History" subtitle={subtitle} />
		</>
	);

	// History failed but the balance card has data to show: keep the card and
	// surface the history error inline where the rows would be.
	const historyError = (
		<View style={styles.emptyContainer}>
			<IconSymbol
				name="exclamationmark.triangle.fill"
				size={48}
				color={textSecondary}
			/>
			<ThemedText type="subtitle" style={styles.emptyTitle}>
				Couldn&apos;t load collections
			</ThemedText>
			<ThemedText style={[styles.emptyBody, { color: textSecondary }]}>
				{error?.message || "An unexpected error occurred"}. Pull to refresh to
				try again.
			</ThemedText>
		</View>
	);

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor }]}
			edges={["top"]}
		>
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
						Cash Box
					</ThemedText>
					{!!boothName && (
						<ThemedText
							style={[styles.headerSubtitle, { color: textSecondary }]}
							numberOfLines={1}
						>
							{boothName}
						</ThemedText>
					)}
				</View>
				<View style={styles.headerSpacer} />
			</View>

			{isLoading ? (
				<View style={styles.centered}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
					<ThemedText style={[styles.loadingText, { color: textSecondary }]}>
						Loading cash box…
					</ThemedText>
				</View>
			) : error && !detailQuery.data ? (
				// Both sources failed us — nothing at all to show.
				<ErrorState
					title="Failed to load cash box"
					message={error.message || "An unexpected error occurred"}
					onRetry={onRefresh}
				/>
			) : (
				<FlatList
					data={rows}
					keyExtractor={keyExtractor}
					renderItem={renderItem}
					ListHeaderComponent={listHeader}
					contentContainerStyle={styles.listContent}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.5}
					refreshControl={
						<RefreshControl
							refreshing={isRefetching && !isFetchingNextPage}
							onRefresh={onRefresh}
							tintColor={tint}
						/>
					}
					ListFooterComponent={
						isFetchingNextPage ? (
							<View style={styles.footer}>
								<ActivityIndicator size="small" color={BRAND_COLOR} />
								<ThemedText
									style={[styles.footerText, { color: textSecondary }]}
								>
									Loading more…
								</ThemedText>
							</View>
						) : isFetchNextPageError ? (
							// A failed next-page fetch would otherwise be silent: rows
							// exist so ListEmptyComponent never shows, and the full-screen
							// error is reserved for having nothing to show at all.
							<View style={styles.footer}>
								<ThemedText
									style={[styles.footerText, { color: textSecondary }]}
								>
									Couldn&apos;t load more collections.
								</ThemedText>
								<TouchableOpacity
									onPress={() => fetchNextPage()}
									accessibilityRole="button"
									accessibilityLabel="Try loading more collections again"
									hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
								>
									<ThemedText
										type="defaultSemiBold"
										style={[styles.footerText, { color: tint }]}
									>
										Try again
									</ThemedText>
								</TouchableOpacity>
							</View>
						) : null
					}
					ListEmptyComponent={
						error ? (
							historyError
						) : (
							<View style={styles.emptyContainer}>
								<IconSymbol
									name="dollarsign.circle"
									size={64}
									color={textSecondary}
								/>
								<ThemedText type="subtitle" style={styles.emptyTitle}>
									No collections yet
								</ThemedText>
								<ThemedText
									style={[styles.emptyBody, { color: textSecondary }]}
								>
									Cash collections recorded at the booth will appear here.
									Pull to refresh.
								</ThemedText>
							</View>
						)
					}
					showsVerticalScrollIndicator={false}
				/>
			)}
		</SafeAreaView>
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
	cardContainer: {
		marginBottom: Spacing.lg,
	},
	inlineNote: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		paddingVertical: Spacing.md,
	},
	inlineNoteText: {
		flex: 1,
		fontSize: scaleFont(13),
	},
	footer: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		gap: Spacing.sm,
		paddingVertical: Spacing.md,
	},
	footerText: { fontSize: scaleFont(13) },
	emptyContainer: {
		justifyContent: "center",
		alignItems: "center",
		gap: Spacing.sm,
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.xxl,
	},
	emptyTitle: { marginTop: Spacing.sm },
	emptyBody: {
		fontSize: scaleFont(13),
		textAlign: "center",
	},
});
