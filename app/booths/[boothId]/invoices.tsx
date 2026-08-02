/**
 * Payment History Screen
 *
 * Per-booth invoice list read live from Stripe, replacing the redirect to
 * Stripe's hosted portal. Reached from the subscription details sheet.
 *
 * Rules that drive what renders here, all of them easy to get wrong:
 *
 * 1. `amount_cents` is what was charged (paid) or is still owed (unpaid) — NOT
 *    Stripe's `amount_paid`, which sits at 0 on a failure and would render the
 *    exact screen a user opened because their payment failed as "$0.00".
 * 2. `paid` decides whether money was collected; `status` only explains why
 *    something is unpaid, and is always translated.
 * 3. Cursor pagination: "load older", never page numbers — Stripe's model.
 * 4. Receipt links are null until Stripe finalises an invoice, so the control
 *    is hidden rather than rendered dead.
 *
 * A 404 is NOT an empty list — see the error branch.
 *
 * @see api/docs/BOOTH_BILLING_INTEGRATION.md
 */

import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	RefreshControl,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBoothInvoices, type OwnerInvoice } from "@/api/payments";
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
	const {
		data,
		isLoading,
		isError,
		error,
		refetch,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useBoothInvoices(boothId ?? null);

	// Cursor pagination has no page count, so the list is a flat concatenation.
	//
	// Memoised: flatMap returns a NEW array every render, which made FlatList's
	// `data` prop change identity on each one and defeated its re-render
	// bailout.
	const invoices = useMemo(
		() => data?.pages.flatMap((page) => page.invoices) ?? [],
		[data?.pages],
	);

	// "Status unavailable" means the response carried a status this app does not
	// recognise, or none at all. Name the fields in dev so the mismatch is
	// diagnosable from the console instead of guessed at. Amounts and receipt
	// links are deliberately NOT logged — the links are bearer URLs.
	//
	// Keyed on the first invoice's identity, not the array: even memoised, the
	// array changes on every refetch, and depending on it logged the same record
	// repeatedly.
	const firstInvoice = invoices[0];
	useEffect(() => {
		if (!__DEV__ || !firstInvoice) return;
		console.warn(
			`[Billing] first invoice: id=${firstInvoice.id} status=${firstInvoice.status} paid=${firstInvoice.paid} paid_at=${firstInvoice.paid_at}`,
		);
		// Identity, not object reference: a refetch returns an equal-but-new
		// object and would otherwise re-log unchanged data.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [firstInvoice?.id, firstInvoice?.status, firstInvoice?.paid]);

	// iOS presents one browser at a time and errors on a second concurrent open,
	// so a double tap — or taps on two different rows — must not launch twice.
	// Cleared in `finally` rather than on unmount: this screen has no visible
	// prop to key a reset off, so the guard has to release on every outcome.
	const receiptInFlight = useRef(false);

	const openReceipt = useCallback(async (invoice: OwnerInvoice) => {
		// invoice_pdf, NOT hosted_invoice_url: the hosted page carries a "pay
		// now" affordance for an unpaid invoice, which makes it a purchasing
		// mechanism under Guideline 3.1.1(a). A PDF is just a document.
		if (!invoice.invoice_pdf || receiptInFlight.current) return;
		receiptInFlight.current = true;
		try {
			// Never logged — the link is effectively a bearer credential.
			await WebBrowser.openBrowserAsync(invoice.invoice_pdf);
		} catch {
			Alert.alert("Error", "Could not open that invoice.");
		} finally {
			receiptInFlight.current = false;
		}
	}, []);

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
							{formatInvoiceDate(item.created)}
						</ThemedText>
					</View>
					<View style={styles.rowRight}>
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
						{/* Hidden rather than dead: both links are null until Stripe
						    finalises the invoice. */}
						{item.invoice_pdf && (
							<TouchableOpacity
								accessibilityRole="button"
								accessibilityLabel={
									item.paid ? "Download receipt" : "Download invoice"
								}
								onPress={() => openReceipt(item)}
								hitSlop={8}
							>
								<ThemedText style={[styles.receiptLink, { color: BRAND_COLOR }]}>
									{item.paid ? "Receipt" : "Invoice"}
								</ThemedText>
							</TouchableOpacity>
						)}
					</View>
				</View>
			);
		},
		[cardBg, borderColor, textSecondary, openReceipt],
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
			    most alarming thing this screen could say.

			    Only blocks when there is nothing to show: a failed BACKGROUND
			    refetch keeps `data` and sets `error`, and replacing a populated
			    list with an error card hides invoices the user was already
			    reading — and the pull-to-refresh that would recover them. */}
			{isError && !isLoading && invoices.length === 0 && (
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
						{(() => {
							const status = (error as { status?: number })?.status;
							if (status === 429)
								return "Too many requests just now. Try again shortly.";
							if (status === 503)
								return "Billing is temporarily unreachable. Pull down to try again.";
							return "We couldn't load this booth's invoices. Pull down to try again.";
						})()}
					</ThemedText>
				</View>
			)}

			{!isLoading && (isError ? invoices.length > 0 : true) && (
				<FlatList
					data={invoices}
					keyExtractor={(item) => item.id}
					onEndReached={() => {
						if (hasNextPage && !isFetchingNextPage) fetchNextPage();
					}}
					onEndReachedThreshold={0.4}
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
						// Cursor pagination: "load more", never a page number.
						isFetchingNextPage ? (
							<ActivityIndicator
								style={styles.footerSpinner}
								color={BRAND_COLOR}
							/>
						) : hasNextPage ? (
							<TouchableOpacity
								accessibilityRole="button"
								style={[styles.loadMore, { borderColor }]}
								onPress={() => fetchNextPage()}
							>
								<ThemedText style={{ color: BRAND_COLOR }}>
									Load older invoices
								</ThemedText>
							</TouchableOpacity>
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
	rowRight: { alignItems: "flex-end", gap: 6 },
	receiptLink: { fontSize: scaleFont(13), fontWeight: "600" },
	loadMore: {
		marginTop: Spacing.md,
		paddingVertical: Spacing.md,
		alignItems: "center",
		borderRadius: BorderRadius.md,
		borderWidth: 1,
	},
	footerSpinner: { marginTop: Spacing.md },
	emptyTitle: { fontSize: scaleFont(16), textAlign: "center" },
	emptyBody: { fontSize: scaleFont(14), textAlign: "center", lineHeight: 20 },
	truncatedNote: {
		fontSize: scaleFont(13),
		textAlign: "center",
		paddingTop: Spacing.md,
		lineHeight: 18,
	},
});
