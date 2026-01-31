/**
 * TicketCard Component
 *
 * Displays a support ticket in a card format for list view.
 * Shows ticket number, subject, status, priority, and last update.
 *
 * @see /api/tickets/types.ts - TicketListItem
 */

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	StatusColors,
	withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { TicketListItem, TicketPriority, TicketStatus } from "@/api/tickets/types";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface TicketCardProps {
	/** Ticket data */
	ticket: TicketListItem;
	/** Press handler */
	onPress: () => void;
}

/**
 * Get status display info
 */
function getStatusInfo(status: TicketStatus): {
	label: string;
	color: string;
	icon: string;
} {
	switch (status) {
		case "open":
			return { label: "Open", color: StatusColors.info, icon: "envelope.open" };
		case "pending":
			return { label: "Pending", color: StatusColors.warning, icon: "clock" };
		case "in_progress":
			return {
				label: "In Progress",
				color: BRAND_COLOR,
				icon: "person.fill.checkmark",
			};
		case "resolved":
			return {
				label: "Resolved",
				color: StatusColors.success,
				icon: "checkmark.circle",
			};
		case "closed":
			return {
				label: "Closed",
				color: StatusColors.neutral,
				icon: "xmark.circle",
			};
		default:
			return { label: status, color: StatusColors.neutral, icon: "circle" };
	}
}

/**
 * Get priority display info
 */
function getPriorityInfo(priority: TicketPriority): {
	label: string;
	color: string;
} {
	switch (priority) {
		case "critical":
			return { label: "Critical", color: StatusColors.error };
		case "high":
			return { label: "High", color: StatusColors.warning };
		case "medium":
			return { label: "Medium", color: BRAND_COLOR };
		case "low":
			return { label: "Low", color: StatusColors.neutral };
		default:
			return { label: priority, color: StatusColors.neutral };
	}
}

/**
 * Format relative time from ISO date string
 */
function formatRelativeTime(dateStr: string | null): string {
	if (!dateStr) return "";

	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;

	return date.toLocaleDateString();
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onPress }) => {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	const statusInfo = getStatusInfo(ticket.status);
	const priorityInfo = getPriorityInfo(ticket.priority);

	return (
		<TouchableOpacity
			style={[styles.card, { backgroundColor: cardBg, borderColor }]}
			onPress={onPress}
			activeOpacity={0.7}
		>
			{/* Header Row */}
			<View style={styles.header}>
				<View style={styles.ticketInfo}>
					<ThemedText style={[styles.ticketNumber, { color: textSecondary }]}>
						{ticket.ticket_number}
					</ThemedText>
					{ticket.booth_name && (
						<View style={styles.boothBadge}>
							<IconSymbol
								name="photo.stack"
								size={12}
								color={textSecondary}
							/>
							<ThemedText
								style={[styles.boothName, { color: textSecondary }]}
								numberOfLines={1}
							>
								{ticket.booth_name}
							</ThemedText>
						</View>
					)}
				</View>
				<View
					style={[
						styles.statusBadge,
						{ backgroundColor: withAlpha(statusInfo.color, 0.15) },
					]}
				>
					<IconSymbol
						name={statusInfo.icon as any}
						size={12}
						color={statusInfo.color}
					/>
					<ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
						{statusInfo.label}
					</ThemedText>
				</View>
			</View>

			{/* Subject */}
			<ThemedText type="defaultSemiBold" style={styles.subject} numberOfLines={2}>
				{ticket.subject}
			</ThemedText>

			{/* Footer Row */}
			<View style={styles.footer}>
				{/* Priority Badge */}
				<View
					style={[
						styles.priorityBadge,
						{ backgroundColor: withAlpha(priorityInfo.color, 0.15) },
					]}
				>
					<View
						style={[styles.priorityDot, { backgroundColor: priorityInfo.color }]}
					/>
					<ThemedText
						style={[styles.priorityText, { color: priorityInfo.color }]}
					>
						{priorityInfo.label}
					</ThemedText>
				</View>

				{/* Message Count & Time */}
				<View style={styles.meta}>
					<View style={styles.metaItem}>
						<IconSymbol name="bubble.left" size={12} color={textSecondary} />
						<ThemedText style={[styles.metaText, { color: textSecondary }]}>
							{ticket.message_count}
						</ThemedText>
					</View>
					<ThemedText style={[styles.metaText, { color: textSecondary }]}>
						{formatRelativeTime(ticket.last_message_at ?? ticket.created_at)}
					</ThemedText>
				</View>
			</View>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	card: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: Spacing.xs,
	},
	ticketInfo: {
		flex: 1,
		marginRight: Spacing.sm,
	},
	ticketNumber: {
		fontSize: 12,
		fontWeight: "500",
	},
	boothBadge: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 2,
		gap: 4,
	},
	boothName: {
		fontSize: 11,
		maxWidth: 120,
	},
	statusBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.sm,
		gap: 4,
	},
	statusText: {
		fontSize: 11,
		fontWeight: "600",
	},
	subject: {
		fontSize: 15,
		lineHeight: 20,
		marginBottom: Spacing.sm,
	},
	footer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	priorityBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.sm,
		gap: 6,
	},
	priorityDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	priorityText: {
		fontSize: 11,
		fontWeight: "500",
	},
	meta: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	metaItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	metaText: {
		fontSize: 11,
	},
});
