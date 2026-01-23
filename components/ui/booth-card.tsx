/**
 * BoothCard Component
 *
 * Displays a single photobooth with status, location, and today's stats.
 * Used in booth list and booth selector screens.
 *
 * Used in: Booths screen, Dashboard booth selector
 *
 * @see https://reactnative.dev/docs/view - React Native View docs
 */

import type { SubscriptionStatus } from "@/api/payments/types";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  BorderRadius,
  Spacing,
  StatusColors,
  withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { Booth, BoothStatus } from "@/types/photobooth";
import type React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

/**
 * Subscription status for display in BoothCard
 */
interface BoothSubscriptionStatus {
	/** Whether booth has active subscription */
	is_active: boolean;
	/** Current subscription status or null if no subscription */
	status: SubscriptionStatus | null;
	/** Whether subscription will cancel at period end */
	cancel_at_period_end?: boolean;
}

interface BoothCardProps {
	/** Booth data */
	booth: Booth;
	/** Whether this booth is currently selected */
	isSelected?: boolean;
	/** Subscription status for this booth */
	subscriptionStatus?: BoothSubscriptionStatus;
	/** Callback when card is pressed */
	onPress?: () => void;
}

/**
 * Maps booth status to color
 * @see BoothStatus - Valid status values: online, offline, warning, error
 */
const getStatusColor = (status: BoothStatus): string => {
	switch (status) {
		case "online":
			return StatusColors.success;
		case "warning":
			return StatusColors.warning;
		case "offline":
			return StatusColors.neutral; // Neutral for offline (not actively erroring)
		case "error":
			return StatusColors.error; // Red for error state
		default:
			// Log unexpected status values for debugging
			console.warn("[BoothCard] Unknown status received:", status);
			return StatusColors.neutral;
	}
};

/**
 * Maps booth status to label
 * @see BoothStatus - Valid status values: online, offline, warning, error
 */
const getStatusLabel = (status: BoothStatus): string => {
	switch (status) {
		case "online":
			return "Online";
		case "warning":
			return "Warning";
		case "offline":
			return "Offline";
		case "error":
			return "Error";
		default:
			// Log unexpected status values for debugging
			console.warn("[BoothCard] Unknown status label for:", status);
			return "Unknown";
	}
};

/**
 * Formats currency
 */
const formatCurrency = (amount: number): string => {
	return `$${amount.toFixed(2)}`;
};

/**
 * Gets subscription badge display info
 */
const getSubscriptionDisplay = (
	subscriptionStatus?: BoothSubscriptionStatus,
): { label: string; color: string; icon: string } | null => {
	if (!subscriptionStatus) {
		return null;
	}

	if (subscriptionStatus.is_active) {
		if (subscriptionStatus.cancel_at_period_end) {
			return {
				label: "Expiring",
				color: StatusColors.warning,
				icon: "clock",
			};
		}
		return {
			label: "Subscribed",
			color: StatusColors.success,
			icon: "checkmark.circle.fill",
		};
	}

	return {
		label: "No Subscription",
		color: StatusColors.neutral,
		icon: "xmark.circle",
	};
};

export const BoothCard: React.FC<BoothCardProps> = ({
	booth,
	isSelected = false,
	subscriptionStatus,
	onPress,
}) => {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const tint = useThemeColor({}, "tint");
	const statusColor = getStatusColor(booth.status);
	const subscriptionDisplay = getSubscriptionDisplay(subscriptionStatus);

	return (
		<TouchableOpacity
			style={[
				styles.card,
				{
					backgroundColor: cardBg,
					borderColor: isSelected ? tint : borderColor,
					borderWidth: isSelected ? 2 : 1,
				},
			]}
			onPress={onPress}
			activeOpacity={0.7}
		>
			{/* Header Row */}
			<View style={styles.header}>
				<View style={styles.titleContainer}>
					<ThemedText type="defaultSemiBold" style={styles.name}>
						{booth.name}
					</ThemedText>
					<View style={styles.locationRow}>
						<IconSymbol name="location" size={12} color={textSecondary} />
						<ThemedText
							style={[styles.location, { color: textSecondary }]}
							numberOfLines={1}
						>
							{booth.location}
						</ThemedText>
					</View>
				</View>

				{/* Status Badge */}
				<View
					style={[
						styles.statusBadge,
						{ backgroundColor: withAlpha(statusColor, 0.15) },
					]}
				>
					<View style={[styles.statusDot, { backgroundColor: statusColor }]} />
					<ThemedText style={[styles.statusText, { color: statusColor }]}>
						{getStatusLabel(booth.status)}
					</ThemedText>
				</View>
			</View>

			{/* Subscription Badge */}
			{subscriptionDisplay && (
				<View style={styles.subscriptionRow}>
					<View
						style={[
							styles.subscriptionBadge,
							{ backgroundColor: withAlpha(subscriptionDisplay.color, 0.12) },
						]}
					>
						<IconSymbol
							name={subscriptionDisplay.icon as any}
							size={12}
							color={subscriptionDisplay.color}
						/>
						<ThemedText
							style={[
								styles.subscriptionText,
								{ color: subscriptionDisplay.color },
							]}
						>
							{subscriptionDisplay.label}
						</ThemedText>
					</View>
				</View>
			)}

			{/* Stats Row */}
			<View style={styles.statsRow}>
				{/* Today's Revenue */}
				<View style={styles.statItem}>
					<ThemedText style={[styles.statLabel, { color: textSecondary }]}>
						Today
					</ThemedText>
					<ThemedText type="defaultSemiBold" style={styles.statValue}>
						{formatCurrency(booth.todayRevenue)}
					</ThemedText>
				</View>

				{/* Divider */}
				<View style={[styles.divider, { backgroundColor: borderColor }]} />

				{/* Today's Transactions */}
				<View style={styles.statItem}>
					<ThemedText style={[styles.statLabel, { color: textSecondary }]}>
						Transactions
					</ThemedText>
					<ThemedText type="defaultSemiBold" style={styles.statValue}>
						{booth.todayTransactions}
					</ThemedText>
				</View>

				{/* Divider */}
				<View style={[styles.divider, { backgroundColor: borderColor }]} />

				{/* Operation Mode */}
				<View style={styles.statItem}>
					<ThemedText style={[styles.statLabel, { color: textSecondary }]}>
						Mode
					</ThemedText>
					<ThemedText
						type="defaultSemiBold"
						style={[styles.statValue, { textTransform: "capitalize" }]}
					>
						{booth.operationMode === "freeplay" ? "Free" : "Coin"}
					</ThemedText>
				</View>
			</View>

			{/* Selection indicator */}
			{isSelected && (
				<View style={[styles.selectedIndicator, { backgroundColor: tint }]}>
					<IconSymbol name="checkmark" size={12} color="white" />
				</View>
			)}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	card: {
		borderRadius: BorderRadius.lg,
		padding: Spacing.md,
		marginBottom: Spacing.sm,
		position: "relative",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: Spacing.md,
	},
	titleContainer: {
		flex: 1,
		marginRight: Spacing.sm,
	},
	name: {
		fontSize: 16,
		marginBottom: 4,
	},
	locationRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	location: {
		fontSize: 12,
		flex: 1,
	},
	statusBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.full,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: 6,
	},
	statusText: {
		fontSize: 12,
		fontWeight: "600",
	},
	statsRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	statItem: {
		flex: 1,
		alignItems: "center",
	},
	statLabel: {
		fontSize: 11,
		marginBottom: 2,
	},
	statValue: {
		fontSize: 14,
	},
	divider: {
		width: 1,
		height: 30,
		marginHorizontal: Spacing.sm,
	},
	selectedIndicator: {
		position: "absolute",
		top: Spacing.sm,
		right: Spacing.sm,
		width: 20,
		height: 20,
		borderRadius: 10,
		justifyContent: "center",
		alignItems: "center",
	},
	subscriptionRow: {
		marginBottom: Spacing.sm,
	},
	subscriptionBadge: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 3,
		borderRadius: BorderRadius.full,
		gap: 4,
	},
	subscriptionText: {
		fontSize: 11,
		fontWeight: "500",
	},
});
