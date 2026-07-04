/**
 * CashBoxCard Component
 *
 * Shows the physical cash currently sitting in a booth's bill acceptors —
 * deliberately framed as "cash in machine", NOT revenue. A booth can have
 * high cash revenue and an empty cash box (just collected), or a full box
 * against zero revenue today.
 *
 * Rendering contracts (see Cash Box API docs):
 * - cashBox null/undefined → "not available" (older kiosk never reported);
 *   never render this as $0 — a real $0 means "box is empty".
 * - bill1 + bill2 >= expected_total; a positive gap is cash-till refunds.
 *   Shown informatively, never as an error or discrepancy.
 * - Balance is presented "as of updated_at" (heartbeat ~30s); stale
 *   snapshots are flagged as possibly offline.
 *
 * Rendered as the live-balance header of the per-booth Cash Box screen.
 *
 * @see app/booths/[boothId]/cash-box.tsx - Cash Box screen
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import type { CashBox } from "@/api/booths/types";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BRAND_COLOR,
	BorderRadius,
	Spacing,
	StatusColors,
	scaleFont,
	withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
	formatCurrency,
	formatRelativeTime,
	getCashBoxFreshness,
	getCashBoxRefundGap,
} from "@/utils";

interface CashBoxCardProps {
	/**
	 * cash_box from the booth detail overview. Null when the booth has never
	 * sent a cash-box heartbeat (kiosk predates the feature); undefined while
	 * loading or against an older backend without the field.
	 */
	cashBox: CashBox | null | undefined;
}

/** Single acceptor column with label and inserted amount */
function AcceptorItem({
	label,
	amount,
	textSecondary,
}: {
	label: string;
	amount: number;
	textSecondary: string;
}) {
	return (
		<View style={styles.acceptorItem}>
			<ThemedText style={[styles.acceptorLabel, { color: textSecondary }]}>
				{label}
			</ThemedText>
			<ThemedText type="defaultSemiBold" style={styles.acceptorValue}>
				{formatCurrency(amount)}
			</ThemedText>
		</View>
	);
}

/**
 * Compose the "Last collected …" line, omitting nullable fragments
 * (never rendering "null" or a placeholder $0).
 */
function lastCollectionLine(lastCollection: CashBox["last_collection"]): string {
	if (!lastCollection) return "No collections yet";

	let line = `Last collected ${formatCurrency(lastCollection.total_amount)}`;
	if (lastCollection.collected_at) {
		line += ` · ${formatRelativeTime(lastCollection.collected_at)}`;
	}
	if (lastCollection.collected_by_name) {
		line += ` by ${lastCollection.collected_by_name}`;
	}
	return line;
}

export function CashBoxCard({ cashBox }: CashBoxCardProps) {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	if (!cashBox) {
		return (
			<View
				style={[styles.card, { backgroundColor: cardBg, borderColor }]}
				accessible
				accessibilityLabel="Cash tracking not available for this booth"
			>
				<View style={styles.unavailableContainer}>
					<View
						style={[
							styles.unavailableIconCircle,
							{ backgroundColor: withAlpha(BRAND_COLOR, 0.1) },
						]}
					>
						<IconSymbol
							name="dollarsign.circle"
							size={32}
							color={textSecondary}
						/>
					</View>
					<ThemedText type="defaultSemiBold" style={styles.unavailableTitle}>
						Cash tracking not available
					</ThemedText>
					<ThemedText
						style={[styles.unavailableBody, { color: textSecondary }]}
					>
						This booth&apos;s software doesn&apos;t report cash box data yet.
						Update the kiosk to enable it.
					</ThemedText>
				</View>
			</View>
		);
	}

	const refundGap = getCashBoxRefundGap(cashBox);
	const freshness = getCashBoxFreshness(cashBox.updated_at);
	const collectionLine = lastCollectionLine(cashBox.last_collection);
	// "unknown" covers both a null updated_at and an unparseable one —
	// formatRelativeTime on a malformed string would render "Invalid Date".
	const reportTimeText =
		cashBox.updated_at !== null && freshness !== "unknown"
			? formatRelativeTime(cashBox.updated_at)
			: null;

	const a11yLabel = [
		`Cash box: ${formatCurrency(cashBox.expected_total)} in machine`,
		refundGap > 0
			? `${formatCurrency(refundGap)} paid out as refunds since last collection`
			: null,
		collectionLine,
		reportTimeText
			? `as of ${reportTimeText}`
			: "awaiting first report from booth",
	]
		.filter(Boolean)
		.join(", ");

	return (
		<View
			style={[styles.card, { backgroundColor: cardBg, borderColor }]}
			accessible
			accessibilityLabel={a11yLabel}
		>
			{/* Headline: physical cash, explicitly framed apart from revenue */}
			<View style={styles.headlineRow}>
				<View
					style={[
						styles.headlineIcon,
						{ backgroundColor: withAlpha(BRAND_COLOR, 0.14) },
					]}
				>
					<IconSymbol
						name="dollarsign.circle.fill"
						size={24}
						color={BRAND_COLOR}
					/>
				</View>
				<View style={styles.headlineText}>
					<ThemedText style={[styles.headlineLabel, { color: textSecondary }]}>
						Cash in machine
					</ThemedText>
					<ThemedText type="title" style={styles.headlineAmount}>
						{formatCurrency(cashBox.expected_total)}
					</ThemedText>
				</View>
			</View>
			<ThemedText style={[styles.framingNote, { color: textSecondary }]}>
				Physical bills in the cash box — not revenue
			</ThemedText>

			{/* Per-acceptor gross inserts since last collection */}
			<View
				style={[
					styles.acceptorPanel,
					{ backgroundColor: withAlpha(BRAND_COLOR, 0.06) },
				]}
			>
				<View style={styles.acceptorRow}>
					<AcceptorItem
						label="Acceptor 1"
						amount={cashBox.bill1_inserted}
						textSecondary={textSecondary}
					/>
					<View
						style={[styles.acceptorDivider, { backgroundColor: borderColor }]}
					/>
					<AcceptorItem
						label="Acceptor 2"
						amount={cashBox.bill2_inserted}
						textSecondary={textSecondary}
					/>
				</View>
				<ThemedText style={[styles.acceptorCaption, { color: textSecondary }]}>
					Inserted since last collection
				</ThemedText>
			</View>

			{/* Cash-till refunds netted against the total — informational, never an error */}
			{refundGap > 0 && (
				<View style={styles.refundRow}>
					<IconSymbol name="info.circle" size={15} color={textSecondary} />
					<ThemedText style={[styles.refundText, { color: textSecondary }]}>
						{formatCurrency(refundGap)} paid out as refunds since last
						collection
					</ThemedText>
				</View>
			)}

			{/* Footer: last collection + freshness */}
			<View style={[styles.footer, { borderTopColor: borderColor }]}>
				<View style={styles.collectionRow}>
					<IconSymbol name="clock" size={15} color={textSecondary} />
					<ThemedText
						style={[styles.collectionLine, { color: textSecondary }]}
					>
						{collectionLine}
					</ThemedText>
				</View>

				{/* Freshness: heartbeat is ~30s; stale means the booth is likely offline */}
				{reportTimeText ? (
					freshness === "stale" ? (
						<View
							style={[
								styles.stalePill,
								{
									backgroundColor: withAlpha(StatusColors.warning, 0.14),
								},
							]}
						>
							<IconSymbol
								name="exclamationmark.triangle.fill"
								size={12}
								color={StatusColors.warning}
							/>
							<ThemedText
								style={[
									styles.stalePillText,
									{ color: StatusColors.warning },
								]}
							>
								as of {reportTimeText} · booth may be offline
							</ThemedText>
						</View>
					) : (
						<ThemedText
							style={[styles.freshnessLine, { color: textSecondary }]}
						>
							as of {reportTimeText}
						</ThemedText>
					)
				) : (
					<ThemedText style={[styles.freshnessLine, { color: textSecondary }]}>
						Awaiting first report from booth
					</ThemedText>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: Spacing.lg,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	headlineRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
	},
	headlineIcon: {
		width: 44,
		height: 44,
		borderRadius: BorderRadius.md,
		justifyContent: "center",
		alignItems: "center",
	},
	headlineText: {
		flex: 1,
	},
	headlineLabel: {
		fontSize: scaleFont(13),
	},
	headlineAmount: {
		fontSize: scaleFont(32),
		lineHeight: scaleFont(38),
	},
	framingNote: {
		fontSize: scaleFont(13),
		marginTop: Spacing.xs,
		marginBottom: Spacing.md,
	},
	acceptorPanel: {
		borderRadius: BorderRadius.md,
		paddingVertical: Spacing.sm,
		paddingHorizontal: Spacing.md,
		marginBottom: Spacing.md,
	},
	acceptorRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	acceptorItem: {
		flex: 1,
		alignItems: "center",
		paddingVertical: Spacing.xs,
	},
	acceptorLabel: {
		fontSize: scaleFont(13),
		marginBottom: 4,
	},
	acceptorValue: {
		fontSize: scaleFont(18),
	},
	acceptorDivider: {
		width: 1,
		height: 36,
		marginHorizontal: Spacing.sm,
	},
	acceptorCaption: {
		fontSize: scaleFont(12),
		textAlign: "center",
		marginTop: Spacing.xs,
	},
	refundRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginBottom: Spacing.md,
	},
	refundText: {
		fontSize: scaleFont(13),
		flex: 1,
	},
	footer: {
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingTop: Spacing.md,
		gap: Spacing.sm,
	},
	collectionRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	collectionLine: {
		fontSize: scaleFont(14),
		flex: 1,
	},
	freshnessLine: {
		fontSize: scaleFont(13),
	},
	stalePill: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		gap: 6,
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.full,
	},
	stalePillText: {
		fontSize: scaleFont(13),
		fontWeight: "600",
	},
	unavailableContainer: {
		alignItems: "center",
		paddingVertical: Spacing.md,
		gap: Spacing.sm,
	},
	unavailableIconCircle: {
		width: 64,
		height: 64,
		borderRadius: BorderRadius.full,
		justifyContent: "center",
		alignItems: "center",
	},
	unavailableTitle: {
		fontSize: scaleFont(16),
		marginTop: Spacing.xs,
	},
	unavailableBody: {
		fontSize: scaleFont(13),
		textAlign: "center",
		lineHeight: scaleFont(19),
	},
});
