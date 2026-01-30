/**
 * HardwareSummaryCard Component
 *
 * Displays aggregated hardware status counts for "All Booths" mode.
 * Shows printer and payment controller status across all booths.
 *
 * Used in Dashboard when viewing all booths overview.
 *
 * @see app/(tabs)/index.tsx - Dashboard screen
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import type { DashboardHardwareSummary } from "@/api/booths/types";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { BorderRadius, BRAND_COLOR, Spacing, StatusColors } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface HardwareSummaryCardProps {
	/** Hardware summary data from dashboard overview API */
	hardwareSummary: DashboardHardwareSummary;
}

/** Status item with dot, label, and count */
interface StatusItemProps {
	color: string;
	label: string;
	count: number;
	textSecondary: string;
}

function StatusItem({ color, label, count, textSecondary }: StatusItemProps) {
	return (
		<View style={styles.summaryItem}>
			<View style={[styles.summaryDot, { backgroundColor: color }]} />
			<ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>
				{label}
			</ThemedText>
			<ThemedText type="defaultSemiBold">{count}</ThemedText>
		</View>
	);
}

/** Summary card for a hardware type (printers or payment controllers) */
interface SummaryCardProps {
	icon: IconSymbolName;
	title: string;
	items: { color: string; label: string; count: number }[];
	cardBg: string;
	borderColor: string;
	textSecondary: string;
}

function SummaryCard({
	icon,
	title,
	items,
	cardBg,
	borderColor,
	textSecondary,
}: SummaryCardProps) {
	return (
		<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
			<View style={styles.header}>
				<IconSymbol name={icon} size={20} color={BRAND_COLOR} />
				<ThemedText type="defaultSemiBold">{title}</ThemedText>
			</View>
			<View style={styles.row}>
				{items.map((item) => (
					<StatusItem
						key={item.label}
						color={item.color}
						label={item.label}
						count={item.count}
						textSecondary={textSecondary}
					/>
				))}
			</View>
		</View>
	);
}

/**
 * HardwareSummaryCard - Aggregated hardware status for all booths
 *
 * Displays:
 * - Printers: Online / Error / Offline counts
 * - Payment Controllers: Connected / Disconnected / Not Configured counts
 */
export function HardwareSummaryCard({ hardwareSummary }: HardwareSummaryCardProps) {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	return (
		<>
			{/* Printers Summary */}
			<SummaryCard
				icon="printer"
				title="Printers"
				cardBg={cardBg}
				borderColor={borderColor}
				textSecondary={textSecondary}
				items={[
					{ color: StatusColors.success, label: "Online", count: hardwareSummary.printers.online },
					{ color: StatusColors.error, label: "Error", count: hardwareSummary.printers.error },
					{ color: StatusColors.neutral, label: "Offline", count: hardwareSummary.printers.offline },
				]}
			/>

			{/* Payment Controllers Summary */}
			<SummaryCard
				icon="creditcard"
				title="Payment Controllers"
				cardBg={cardBg}
				borderColor={borderColor}
				textSecondary={textSecondary}
				items={[
					{ color: StatusColors.success, label: "Connected", count: hardwareSummary.payment_controllers.connected },
					{ color: StatusColors.warning, label: "Disconnected", count: hardwareSummary.payment_controllers.disconnected },
					{ color: StatusColors.neutral, label: "Not Configured", count: hardwareSummary.payment_controllers.not_configured },
				]}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		marginBottom: Spacing.md,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-around",
	},
	summaryItem: {
		alignItems: "center",
		gap: 4,
	},
	summaryDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	summaryLabel: {
		fontSize: 11,
	},
});

