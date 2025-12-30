/**
 * BreakdownCard Component
 *
 * Displays a list of items with percentages and progress bars.
 * Used for revenue breakdown by product type or payment method.
 *
 * Uses brand color with decreasing opacity for visual hierarchy.
 *
 * @example
 * ```tsx
 * <BreakdownCard
 *   items={[{ name: "photo_4x6", value: 100, percentage: 80 }]}
 *   formatLabel={formatProductName}
 *   emptyMessage="No data available"
 * />
 * ```
 *
 * @see app/(tabs)/analytics.tsx - Used for revenue breakdown sections
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { BorderRadius, BRAND_COLOR, Spacing, withAlpha } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { formatCurrency } from "@/utils";

export interface BreakdownItem {
	name: string;
	value: number;
	percentage: number;
}

interface BreakdownCardProps {
	/** List of items to display */
	items: BreakdownItem[];
	/** Function to format the item name for display */
	formatLabel: (name: string) => string;
	/** Message to show when items array is empty */
	emptyMessage?: string;
	/** Opacity decrement per item (default: 0.2) */
	opacityStep?: number;
}

/**
 * BreakdownCard - Displays items with progress bars
 *
 * Each item shows:
 * - Colored dot + label on the left
 * - Currency value on the right
 * - Progress bar below
 * - Percentage below the bar
 */
export function BreakdownCard({
	items,
	formatLabel,
	emptyMessage = "No data available",
	opacityStep = 0.2,
}: BreakdownCardProps) {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	if (items.length === 0) {
		return (
			<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
				<ThemedText style={{ color: textSecondary, textAlign: "center" }}>
					{emptyMessage}
				</ThemedText>
			</View>
		);
	}

	return (
		<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
			{items.map((item, index) => {
				// Use progressively lighter opacity for each item
				const opacity = 1 - index * opacityStep;
				const itemColor = withAlpha(BRAND_COLOR, Math.max(0.4, opacity));

				return (
					<View key={item.name} style={styles.item}>
						<View style={styles.header}>
							<View style={styles.labelRow}>
								<View style={[styles.dot, { backgroundColor: itemColor }]} />
								<ThemedText style={styles.label}>
									{formatLabel(item.name)}
								</ThemedText>
							</View>
							<ThemedText type="defaultSemiBold">
								{formatCurrency(item.value)}
							</ThemedText>
						</View>
						<View style={styles.barTrack}>
							<View
								style={[
									styles.barFill,
									{
										width: `${item.percentage}%`,
										backgroundColor: itemColor,
									},
								]}
							/>
						</View>
						<ThemedText style={[styles.percent, { color: textSecondary }]}>
							{item.percentage}%
						</ThemedText>
					</View>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.md,
	},
	item: {
		gap: Spacing.xs,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	labelRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	dot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	label: {
		fontSize: 14,
	},
	barTrack: {
		height: 8,
		backgroundColor: "rgba(150, 150, 150, 0.2)",
		borderRadius: 4,
		overflow: "hidden",
	},
	barFill: {
		height: "100%",
		borderRadius: 4,
	},
	percent: {
		fontSize: 11,
		textAlign: "right",
	},
});

