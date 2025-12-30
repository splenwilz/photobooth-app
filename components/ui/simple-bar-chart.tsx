/**
 * SimpleBarChart Component
 *
 * A lightweight bar chart for displaying revenue/data trends.
 * Uses brand color with opacity variations for visual interest.
 *
 * @example
 * ```tsx
 * <SimpleBarChart
 *   data={[{ date: "Mon", amount: 100 }, { date: "Tue", amount: 200 }]}
 *   maxValue={200}
 *   tint={BRAND_COLOR}
 *   textSecondary="#888"
 * />
 * ```
 *
 * @see app/(tabs)/analytics.tsx - Used for revenue charts
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Spacing, withAlpha } from "@/constants/theme";

export interface ChartDataPoint {
	date: string;
	amount: number;
}

interface SimpleBarChartProps {
	/** Data points to display as bars */
	data: ChartDataPoint[];
	/** Maximum value for scaling bars (height = amount/maxValue) */
	maxValue: number;
	/** Brand/tint color for bars */
	tint: string;
	/** Secondary text color for labels */
	textSecondary: string;
}

/**
 * Simple bar chart using brand color with opacity variations.
 *
 * Bars are scaled proportionally to maxValue.
 * Uses opacity gradients (0.6 → 1.0) for visual interest.
 */
export function SimpleBarChart({
	data,
	maxValue,
	tint,
	textSecondary,
}: SimpleBarChartProps) {
	return (
		<View style={styles.container}>
			<View style={styles.barsContainer}>
				{data.map((item, index) => {
					// Handle case where maxValue is 0 to avoid NaN
					const heightPercent =
						maxValue > 0 ? (item.amount / maxValue) * 100 : 0;
					// Use opacity variations of brand color for visual interest
					const opacity = 0.6 + (index / data.length) * 0.4;
					return (
						<View key={index} style={styles.barWrapper}>
							<View style={styles.barContainer}>
								<View
									style={[
										styles.bar,
										{
											height: `${heightPercent}%`,
											backgroundColor: withAlpha(tint, opacity),
										},
									]}
								/>
							</View>
							<ThemedText style={[styles.barLabel, { color: textSecondary }]}>
								{item.date}
							</ThemedText>
						</View>
					);
				})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		height: 160,
		marginTop: Spacing.sm,
	},
	barsContainer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "space-between",
	},
	barWrapper: {
		flex: 1,
		alignItems: "center",
	},
	barContainer: {
		flex: 1,
		width: "70%",
		justifyContent: "flex-end",
	},
	bar: {
		width: "100%",
		borderRadius: 4,
		minHeight: 4,
	},
	barLabel: {
		fontSize: 10,
		marginTop: 4,
	},
});

