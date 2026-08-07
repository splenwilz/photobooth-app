/**
 * Status badge for booth transfers. Pending rows past their expiry render as
 * expired (the server stamps the status lazily) — pass a status already run
 * through `displayStatus` for that behavior.
 *
 * Mirrors the web dashboard's TransferStatusBadge — keep in sync.
 */

import React from "react";
import { StyleSheet, View } from "react-native";

import type { TransferStatus } from "@/api/transfers";
import { ThemedText } from "@/components/themed-text";
import { BorderRadius, scaleFont } from "@/constants/theme";

const BADGES: Record<TransferStatus, { label: string; bg: string; fg: string }> =
	{
		pending: { label: "Pending", bg: "rgba(245, 158, 11, 0.15)", fg: "#B45309" },
		completed: {
			label: "Completed",
			bg: "rgba(34, 197, 94, 0.15)",
			fg: "#15803D",
		},
		settled: { label: "Settled", bg: "rgba(34, 197, 94, 0.15)", fg: "#15803D" },
		cancelled: {
			label: "Withdrawn",
			bg: "rgba(113, 113, 122, 0.15)",
			fg: "#71717A",
		},
		declined: { label: "Declined", bg: "rgba(239, 68, 68, 0.15)", fg: "#DC2626" },
		expired: {
			label: "Expired",
			bg: "rgba(113, 113, 122, 0.15)",
			fg: "#71717A",
		},
	};

const FALLBACK_BADGE = {
	label: "Unknown",
	bg: "rgba(113, 113, 122, 0.15)",
	fg: "#71717A",
};

export function TransferStatusBadge({ status }: { status: TransferStatus }) {
	// Defensive: an unrecognized status from a newer backend still renders.
	// Own-property guard so a prototype-member string (e.g. "constructor")
	// can't walk the chain past the fallback.
	const badge = Object.hasOwn(BADGES, status) ? BADGES[status] : FALLBACK_BADGE;
	return (
		<View style={[styles.badge, { backgroundColor: badge.bg }]}>
			<ThemedText style={[styles.label, { color: badge.fg }]}>
				{badge.label}
			</ThemedText>
		</View>
	);
}

const styles = StyleSheet.create({
	badge: {
		borderRadius: BorderRadius.full,
		paddingHorizontal: 8,
		paddingVertical: 2,
		alignSelf: "flex-start",
	},
	label: {
		fontSize: scaleFont(12),
		fontWeight: "500",
		lineHeight: scaleFont(16),
	},
});
