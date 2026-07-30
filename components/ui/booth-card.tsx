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
import { getStatusDisplay } from "@/components/subscription/subscription-status";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  BorderRadius,
  Spacing,
  StatusColors,
  withAlpha,
  scaleFont,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { Booth, BoothStatus } from "@/types/photobooth";
import type React from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

/**
 * Subscription display info for BoothCard
 * Named differently from BoothSubscriptionStatus in api/booths/types.ts to avoid confusion
 */
interface BoothCardSubscriptionInfo {
	/** Whether booth has active subscription */
	is_active: boolean;
	/** Current subscription status or null if no subscription */
	status: SubscriptionStatus | null;
	/** Whether subscription will cancel at period end */
	cancel_at_period_end?: boolean;
	/**
	 * Booth is paid but has no hardware identity on file, so it will not run.
	 * Distinct from a billing problem — shown so the fleet view stops reporting
	 * such a booth as simply healthy.
	 */
	activation_required?: boolean;
}

interface BoothCardProps {
	/** Booth data */
	booth: Booth;
	/** Whether this booth is currently selected */
	isSelected?: boolean;
	/** Subscription status for this booth */
	subscriptionStatus?: BoothCardSubscriptionInfo;
	/** Callback when card is pressed */
	onPress?: () => void;
	/** Callback when edit button is pressed */
	onEditPress?: () => void;
	/**
	 * Critical events needing attention (unrefunded stranded sessions +
	 * unseen operational incidents). Zero/undefined renders no badge.
	 */
	attentionCount?: number;
	/**
	 * True when the server holds more events than the counted page — the
	 * badge then renders "N+" to signal a lower bound.
	 */
	attentionOverflow?: boolean;
	/** Callback when the attention badge is pressed (opens critical events) */
	onAttentionPress?: () => void;
}

/**
 * Maps booth connectivity status to color
 * @see BoothStatus - Valid status values: online, offline, warning
 */
const getStatusColor = (status: BoothStatus): string => {
	switch (status) {
		case "online":
			return StatusColors.success;
		case "warning":
			return StatusColors.warning;
		case "offline":
			return StatusColors.neutral;
		default:
			console.warn("[BoothCard] Unknown status received:", status);
			return StatusColors.neutral;
	}
};

/**
 * Maps booth connectivity status to label
 * @see BoothStatus - Valid status values: online, offline, warning
 */
const getStatusLabel = (status: BoothStatus): string => {
	switch (status) {
		case "online":
			return "Online";
		case "warning":
			return "Warning";
		case "offline":
			return "Offline";
		default:
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
	subscriptionStatus?: BoothCardSubscriptionInfo,
): { label: string; color: string; icon: string } | null => {
	if (!subscriptionStatus) {
		return null;
	}

	if (subscriptionStatus.is_active) {
		// Cancelling outranks activation: "stops billing soon" is the more urgent
		// signal, and both badges are warning-coloured so there would be no cue
		// that anything else had changed.
		if (subscriptionStatus.cancel_at_period_end) {
			return {
				label: "Expiring",
				color: StatusColors.warning,
				icon: "clock",
			};
		}
		// Paid but unrunnable outranks the plain "Subscribed" badge: a booth that
		// cannot start is the misleading case this field was added to fix.
		if (subscriptionStatus.activation_required) {
			return {
				label: "Not activated",
				color: StatusColors.warning,
				icon: "exclamationmark.triangle",
			};
		}
		return {
			label: "Subscribed",
			color: StatusColors.success,
			icon: "checkmark.circle.fill",
		};
	}

	// Lapsed states carry real information — rendering them all as
	// "No Subscription" made the fleet list contradict Settings for the same
	// booth. Shares the status map with the card and the details sheet.
	if (subscriptionStatus.status) {
		const { text, color } = getStatusDisplay(subscriptionStatus.status);
		return { label: text, color, icon: "exclamationmark.circle" };
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
	onEditPress,
	attentionCount = 0,
	attentionOverflow = false,
	onAttentionPress,
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
					<View style={styles.nameRow}>
						<ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>
							{booth.name}
						</ThemedText>
						{onEditPress && (
							<TouchableOpacity
								onPress={(e) => {
									e.stopPropagation();
									onEditPress();
								}}
								hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
								style={styles.editButton}
								accessibilityLabel="Edit booth"
								accessibilityHint="Opens editor for booth name and address"
								accessibilityRole="button"
							>
								<IconSymbol name="pencil" size={14} color={textSecondary} />
							</TouchableOpacity>
						)}
					</View>
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

				{/* Status Badges Container */}
				<View style={styles.badgesContainer}>
					{/* Attention Badge - critical events needing the operator.
					    Button semantics only when actually tappable — a
					    non-interactive badge must not announce as a button. */}
					{attentionCount > 0 &&
						(() => {
							const label = attentionOverflow
								? `At least ${attentionCount} critical events need attention`
								: attentionCount === 1
									? "1 critical event needs attention"
									: `${attentionCount} critical events need attention`;
							const content = (
								<>
									<IconSymbol
										name="exclamationmark.triangle.fill"
										size={11}
										color="white"
									/>
									<ThemedText style={styles.attentionText}>
										{attentionOverflow ? `${attentionCount}+` : attentionCount}
									</ThemedText>
								</>
							);
							return onAttentionPress ? (
								<TouchableOpacity
									style={[
										styles.attentionBadge,
										{ backgroundColor: StatusColors.error },
									]}
									onPress={onAttentionPress}
									hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
									accessibilityRole="button"
									accessibilityLabel={label}
									accessibilityHint="Opens the booth's critical events"
								>
									{content}
								</TouchableOpacity>
							) : (
								<View
									style={[
										styles.attentionBadge,
										{ backgroundColor: StatusColors.error },
									]}
									accessible
									accessibilityRole="text"
									accessibilityLabel={label}
								>
									{content}
								</View>
							);
						})()}

					{/* Hardware Error Badge - Tappable for details */}
					{booth.has_error && (
						<View
							onStartShouldSetResponder={() => true}
							onResponderRelease={() => {
								Alert.alert(
									"Hardware Error",
									booth.error_details || "Unknown error occurred",
									[{ text: "OK" }],
								);
							}}
						>
							<View
								style={[
									styles.errorBadge,
									{ backgroundColor: withAlpha(StatusColors.error, 0.15) },
								]}
							>
								<IconSymbol
									name="exclamationmark.triangle.fill"
									size={12}
									color={StatusColors.error}
								/>
								<ThemedText style={[styles.statusText, { color: StatusColors.error }]}>
									Error
								</ThemedText>
							</View>
						</View>
					)}

					{/* Connectivity Status Badge */}
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
			</View>

			{/* Error Details Row - Shows truncated error when has_error */}
			{booth.has_error && booth.error_details && (
				<View
					style={[
						styles.errorDetailsRow,
						{ backgroundColor: withAlpha(StatusColors.error, 0.08) },
					]}
				>
					<IconSymbol
						name="exclamationmark.circle"
						size={14}
						color={StatusColors.error}
					/>
					<ThemedText
						style={[styles.errorDetailsText, { color: StatusColors.error }]}
						numberOfLines={1}
					>
						{booth.error_details}
					</ThemedText>
				</View>
			)}

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
	nameRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs,
	},
	name: {
		fontSize: scaleFont(16),
		marginBottom: 4,
		flexShrink: 1,
	},
	editButton: {
		padding: 4,
		marginBottom: 4,
	},
	locationRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	location: {
		fontSize: scaleFont(12),
		flex: 1,
	},
	badgesContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	statusBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.full,
	},
	errorBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.full,
		gap: 4,
	},
	attentionBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.full,
		gap: 4,
	},
	attentionText: {
		fontSize: scaleFont(12),
		fontWeight: "700",
		color: "white",
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: 6,
	},
	statusText: {
		fontSize: scaleFont(12),
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
		fontSize: scaleFont(11),
		marginBottom: 2,
	},
	statValue: {
		fontSize: scaleFont(14),
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
		fontSize: scaleFont(11),
		fontWeight: "500",
	},
	errorDetailsRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.sm,
		paddingVertical: Spacing.xs,
		borderRadius: BorderRadius.md,
		marginBottom: Spacing.sm,
		gap: 6,
	},
	errorDetailsText: {
		flex: 1,
		fontSize: scaleFont(12),
		fontWeight: "500",
	},
});
