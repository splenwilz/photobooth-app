/**
 * CashCollectionRow Component
 *
 * One row in the cash-collections history list: a single operator "Collect"
 * action synced from the booth.
 *
 * Rendering contracts (see Cash Box API docs):
 * - bill1_amount/bill2_amount are null on rows recorded before per-acceptor
 *   tracking existed — the split line is omitted entirely, never shown as $0.
 * - collected_by_name is resolved on the booth at collection time; null means
 *   the admin was later deleted or nobody was logged in → "Collector unknown".
 * - Times come from collected_at only. synced_at is deliberately unused:
 *   first-upgrade backfill makes it much later than the real collection time.
 *
 * @see app/booths/[boothId]/cash-box.tsx - Cash Box screen
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import type { CashCollection } from "@/api/booths/types";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BRAND_COLOR,
	BorderRadius,
	Spacing,
	scaleFont,
	withAlpha,
} from "@/constants/theme";
import { formatCurrency, formatRelativeTime } from "@/utils";

interface CashCollectionRowProps {
	collection: CashCollection;
	/** Theme colors passed from the list screen to keep rows render-cheap */
	cardBg: string;
	borderColor: string;
	textSecondary: string;
}

/** "Acceptor 1 $30.00 · Acceptor 2 $12.00", only for the non-null amounts */
function acceptorLine(collection: CashCollection): string | null {
	const parts: string[] = [];
	if (collection.bill1_amount !== null) {
		parts.push(`Acceptor 1 ${formatCurrency(collection.bill1_amount)}`);
	}
	if (collection.bill2_amount !== null) {
		parts.push(`Acceptor 2 ${formatCurrency(collection.bill2_amount)}`);
	}
	return parts.length > 0 ? parts.join(" · ") : null;
}

export function CashCollectionRow({
	collection,
	cardBg,
	borderColor,
	textSecondary,
}: CashCollectionRowProps) {
	const acceptors = acceptorLine(collection);
	// The visible and a11y strings intentionally differ in their null
	// fallbacks ("Collector unknown" vs "by unknown collector"), but both
	// derive from the same formatted values computed once here.
	const collectedBy = collection.collected_by_name
		? `by ${collection.collected_by_name}`
		: null;
	const relativeTime = collection.collected_at
		? formatRelativeTime(collection.collected_at)
		: null;

	const collectorText = collectedBy ?? "Collector unknown";
	const timeText = relativeTime ?? "Time not recorded";
	const a11yLabel = `Collected ${formatCurrency(collection.total_amount)} ${collectedBy ?? "by unknown collector"}, ${relativeTime ?? "time not recorded"}`;

	return (
		<View
			style={[styles.card, { backgroundColor: cardBg, borderColor }]}
			accessible
			accessibilityLabel={a11yLabel}
		>
			<View style={styles.row}>
				<View
					style={[
						styles.leadingIcon,
						{ backgroundColor: withAlpha(BRAND_COLOR, 0.12) },
					]}
				>
					<IconSymbol
						name="dollarsign.circle.fill"
						size={18}
						color={BRAND_COLOR}
					/>
				</View>
				<View style={styles.left}>
					<ThemedText type="defaultSemiBold" style={styles.amount}>
						{formatCurrency(collection.total_amount)}
					</ThemedText>
					<ThemedText
						style={[styles.collector, { color: textSecondary }]}
						numberOfLines={1}
					>
						{collectorText}
					</ThemedText>
					{acceptors !== null && (
						<ThemedText
							style={[styles.acceptors, { color: textSecondary }]}
							numberOfLines={1}
						>
							{acceptors}
						</ThemedText>
					)}
					{collection.note !== null && collection.note !== "" && (
						<ThemedText
							style={[styles.note, { color: textSecondary }]}
							numberOfLines={2}
						>
							{collection.note}
						</ThemedText>
					)}
				</View>
				<View style={styles.right}>
					<ThemedText style={[styles.time, { color: textSecondary }]}>
						{timeText}
					</ThemedText>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	row: {
		flexDirection: "row",
	},
	leadingIcon: {
		width: 36,
		height: 36,
		borderRadius: BorderRadius.full,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.sm,
	},
	left: {
		flex: 1,
		marginRight: Spacing.sm,
	},
	amount: {
		fontSize: scaleFont(19),
	},
	collector: {
		fontSize: scaleFont(14),
		marginTop: 2,
	},
	acceptors: {
		fontSize: scaleFont(13),
		marginTop: Spacing.xs,
	},
	note: {
		fontSize: scaleFont(13),
		fontStyle: "italic",
		marginTop: Spacing.xs,
	},
	right: {
		alignItems: "flex-end",
	},
	time: {
		fontSize: scaleFont(13),
	},
});
