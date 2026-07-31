/**
 * Payment History Screen
 *
 * Per-booth invoice list, read from our own database rather than by redirecting
 * the owner to Stripe's hosted portal. Reached from the subscription details
 * sheet.
 *
 * Three contract rules drive what renders here, all of them easy to get wrong:
 *
 * 1. `amount_cents` is what was charged (paid) or is still owed (unpaid) — NOT
 *    Stripe's `amount_paid`, which sits at 0 on a failure and would render the
 *    exact screen a user opened because their payment failed as "$0.00".
 * 2. `paid` decides whether money was collected; `status` only explains why
 *    something is unpaid, and is always translated.
 * 3. `truncated` must be surfaced. Showing a partial list as complete is how a
 *    "where did my invoice go" ticket starts.
 *
 * A 404 is NOT an empty list — see the error branch.
 *
 * @see api/docs/BOOTH_BILLING_INTEGRATION.md
 */

import { router, useLocalSearchParams } from "expo-router";
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

import {
	DEFAULT_INVOICE_LIMIT,
	useBoothInvoices,
	type OwnerInvoice,
} from "@/api/payments";
import {
	describeInvoice,
	formatInvoiceAmount,
	type InvoiceTone,
} from "@/components/subscription/invoice-display";
import { ThemedText } from "@/components/themed-text";
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

function toneColor(tone: InvoiceTone): string {
	switch (tone) {
		case "success":
			return StatusColors.success;
		case "warning":
			return StatusColors.warning;
		case "error":
			return StatusColors.error;
		case "info":
			return BRAND_COLOR;
		default:
			return StatusColors.neutral;
	}
}

function formatInvoiceDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export default function InvoicesScreen() {
	const { boothId } = useLocalSearchParams<{ boothId: string }>();
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	const [isRefreshing, setIsRefreshing] = useState(false);
	const { data, isLoading, isError, error, refetch } = useBoothInvoices(
		boothId ?? null,
	);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

	const renderInvoice = useCallback(
		({ item }: { item: OwnerInvoice }) => {
			const { label, tone } = describeInvoice(item);
			const color = toneColor(tone);
			return (
				<View style={[styles.row, { backgroundColor: cardBg, borderColor }]}>
					<View style={styles.rowMain}>
						<ThemedText type="defaultSemiBold" style={styles.amount}>
							{formatInvoiceAmount(item.amount_cents, item.currency)}
						</ThemedText>
						<ThemedText style={[styles.date, { color: textSecondary }]}>
							{formatInvoiceDate(item.created_at)}
						</ThemedText>
					</View>
					<View
						style={[
							styles.statusPill,
							{ backgroundColor: withAlpha(color, 0.15) },
						]}
					>
						<ThemedText style={[styles.statusText, { color }]}>
							{label}
						</ThemedText>
					</View>
				</View>
			);
		},
		[cardBg, borderColor, textSecondary],
	);

	return (
		<SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
			<View style={[styles.header, { borderColor }]}>
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityLabel="Go back"
					onPress={() => router.back()}
					hitSlop={10}
				>
					<IconSymbol name="chevron.left" size={22} color={textSecondary} />
				</TouchableOpacity>
				<ThemedText type="subtitle">Payment history</ThemedText>
				<View style={styles.headerSpacer} />
			</View>

			{isLoading && (
				<View style={styles.centered}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
				</View>
			)}

			{/* A 404 here means the booth is not ours, does not exist, or the route
			    is not deployed yet — deliberately indistinguishable, and NEVER "no
			    invoices". Rendering the empty state for it would tell an owner
			    they have never been charged, which for a paying customer is the
			    most alarming thing this screen could say. */}
			{isError && !isLoading && (
				<View style={styles.centered}>
					<IconSymbol
						name="exclamationmark.triangle"
						size={40}
						color={StatusColors.neutral}
					/>
					<ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
						Payment history is unavailable
					</ThemedText>
					<ThemedText style={[styles.emptyBody, { color: textSecondary }]}>
						{(error as { status?: number })?.status === 429
							? "Too many requests just now. Try again shortly."
							: "We couldn't load this booth's invoices. Pull down to try again."}
					</ThemedText>
				</View>
			)}

			{!isLoading && !isError && (
				<FlatList
					data={data?.invoices ?? []}
					keyExtractor={(item) => item.stripe_invoice_id}
					renderItem={renderInvoice}
					contentContainerStyle={styles.listContent}
					refreshControl={
						<RefreshControl
							refreshing={isRefreshing}
							onRefresh={handleRefresh}
							tintColor={BRAND_COLOR}
						/>
					}
					ListEmptyComponent={
						// Reached only on a successful 200 with an empty array.
						<View style={styles.centered}>
							<IconSymbol
								name="doc.text"
								size={40}
								color={withAlpha(BRAND_COLOR, 0.6)}
							/>
							<ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
								No invoices yet
							</ThemedText>
							<ThemedText style={[styles.emptyBody, { color: textSecondary }]}>
								Invoices appear here once this booth has been billed.
							</ThemedText>
						</View>
					}
					ListFooterComponent={
						data?.truncated ? (
							<ThemedText
								style={[styles.truncatedNote, { color: textSecondary }]}
							>
								Showing the most recent {DEFAULT_INVOICE_LIMIT}. Older invoices
								are in your billing portal.
							</ThemedText>
						) : null
					}
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
		justifyContent: "space-between",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderBottomWidth: 1,
	},
	headerSpacer: { width: 22 },
	centered: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.xxl,
		paddingHorizontal: Spacing.lg,
		gap: Spacing.sm,
	},
	listContent: { padding: Spacing.lg, gap: Spacing.sm },
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.sm,
	},
	rowMain: { flex: 1, gap: 2 },
	amount: { fontSize: scaleFont(16) },
	date: { fontSize: scaleFont(13) },
	statusPill: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.lg,
		flexShrink: 1,
	},
	statusText: { fontSize: scaleFont(12), fontWeight: "700" },
	emptyTitle: { fontSize: scaleFont(16), textAlign: "center" },
	emptyBody: { fontSize: scaleFont(14), textAlign: "center", lineHeight: 20 },
	truncatedNote: {
		fontSize: scaleFont(13),
		textAlign: "center",
		paddingTop: Spacing.md,
		lineHeight: 18,
	},
});
