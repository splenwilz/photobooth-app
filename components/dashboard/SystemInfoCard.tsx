/**
 * SystemInfoCard Component
 *
 * Displays system information for a single booth.
 * Shows uptime, app version, and resource usage (CPU/Memory/Disk).
 *
 * Only shown in single booth mode on the Dashboard.
 *
 * @see app/(tabs)/index.tsx - Dashboard screen
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import type { BoothSystem } from "@/api/booths/types";
import { ThemedText } from "@/components/themed-text";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface SystemInfoCardProps {
	/** System data from booth detail API */
	system: BoothSystem | undefined;
}

/** Single info item with label and value */
interface InfoItemProps {
	label: string;
	value: string;
	textSecondary: string;
}

function InfoItem({ label, value, textSecondary }: InfoItemProps) {
	return (
		<View style={styles.infoItem}>
			<ThemedText style={[styles.infoLabel, { color: textSecondary }]}>
				{label}
			</ThemedText>
			<ThemedText type="defaultSemiBold">{value}</ThemedText>
		</View>
	);
}

/**
 * SystemInfoCard - System metrics for a single booth
 *
 * Row 1: Booth Uptime | System Uptime | App Version
 * Row 2: CPU % | Memory % | Disk %
 */
export function SystemInfoCard({ system }: SystemInfoCardProps) {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	return (
		<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
			{/* Row 1: Uptime and Version */}
			<View style={styles.row}>
				<InfoItem
					label="Booth Uptime"
					value={system?.app_uptime_formatted ?? "N/A"}
					textSecondary={textSecondary}
				/>
				<InfoItem
					label="System Uptime"
					value={system?.system_uptime_formatted ?? "N/A"}
					textSecondary={textSecondary}
				/>
				<InfoItem
					label="App Version"
					value={`v${system?.app_version ?? "?"}`}
					textSecondary={textSecondary}
				/>
			</View>

			{/* Row 2: Resource Usage */}
			<View style={styles.row}>
				<InfoItem
					label="CPU"
					value={`${system?.cpu_percent?.toFixed(1) ?? 0}%`}
					textSecondary={textSecondary}
				/>
				<InfoItem
					label="Memory"
					value={`${system?.memory_percent?.toFixed(1) ?? 0}%`}
					textSecondary={textSecondary}
				/>
				<InfoItem
					label="Disk"
					value={`${system?.disk_percent?.toFixed(1) ?? 0}%`}
					textSecondary={textSecondary}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: Spacing.sm,
	},
	infoItem: {
		flex: 1,
		alignItems: "center",
	},
	infoLabel: {
		fontSize: 11,
		marginBottom: 2,
	},
});

