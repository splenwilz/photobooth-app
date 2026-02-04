/**
 * Plan Card Component
 *
 * Displays a single pricing plan with features, price, and selection state.
 * Used in pricing plan selection screens.
 */

import type { PricingPlan } from "@/api/pricing";
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
import { StyleSheet, TouchableOpacity, View } from "react-native";
import type { BillingInterval } from "./BillingIntervalToggle";

interface PlanCardProps {
	/** The pricing plan to display */
	plan: PricingPlan;
	/** Whether this plan is currently selected */
	isSelected: boolean;
	/** Whether this is the user's current plan */
	isCurrentPlan: boolean;
	/** Monthly or annual billing */
	billingInterval: BillingInterval;
	/** Called when plan is selected */
	onSelect: (plan: PricingPlan) => void;
	/** Whether selection is disabled */
	disabled?: boolean;
}

export function PlanCard({
	plan,
	isSelected,
	isCurrentPlan,
	billingInterval,
	onSelect,
	disabled = false,
}: PlanCardProps) {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textColor = useThemeColor({}, "text");
	const textSecondary = useThemeColor({}, "textSecondary");

	const isAnnual = billingInterval === "year";
	const showAnnualPrice = isAnnual && plan.has_annual_option;

	// Determine which price to display
	const displayPrice = showAnnualPrice
		? plan.annual_price_display
		: plan.price_display;

	// Border color when selected
	const activeBorderColor = isSelected ? BRAND_COLOR : borderColor;

	return (
		<TouchableOpacity
			style={[
				styles.card,
				{
					backgroundColor: cardBg,
					borderColor: activeBorderColor,
					borderWidth: isSelected ? 2 : 1,
				},
			]}
			onPress={() => onSelect(plan)}
			disabled={disabled}
			activeOpacity={0.7}
		>
			{/* Header with name and badges */}
			<View style={styles.header}>
				<View style={styles.nameRow}>
					<ThemedText type="defaultSemiBold" style={styles.planName}>
						{plan.name}
					</ThemedText>
					{isCurrentPlan && (
						<View style={styles.currentBadge}>
							<ThemedText style={styles.currentBadgeText}>
								Current
							</ThemedText>
						</View>
					)}
				</View>
				{isSelected && (
					<View
						style={[
							styles.checkCircle,
							{ backgroundColor: BRAND_COLOR },
						]}
					>
						<IconSymbol name="checkmark" size={14} color="white" />
					</View>
				)}
			</View>

			{/* Description */}
			<ThemedText style={[styles.description, { color: textSecondary }]}>
				{plan.description}
			</ThemedText>

			{/* Price */}
			<View style={styles.priceContainer}>
				<ThemedText type="title" style={styles.price}>
					{displayPrice}
				</ThemedText>
				{showAnnualPrice && plan.annual_savings_display && (
					<View style={styles.savingsBadge}>
						<ThemedText style={styles.savingsText}>
							{plan.annual_savings_display}
						</ThemedText>
					</View>
				)}
			</View>

			{/* Features */}
			<View style={styles.features}>
				{plan.features.map((feature, index) => (
					<View key={index} style={styles.featureRow}>
						<IconSymbol
							name="checkmark.circle.fill"
							size={16}
							color={StatusColors.success}
						/>
						<ThemedText style={[styles.featureText, { color: textColor }]}>
							{feature}
						</ThemedText>
					</View>
				))}
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		marginBottom: Spacing.sm,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: Spacing.xs,
	},
	nameRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	planName: {
		fontSize: 18,
	},
	currentBadge: {
		backgroundColor: withAlpha(BRAND_COLOR, 0.15),
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: BorderRadius.sm,
	},
	currentBadgeText: {
		color: BRAND_COLOR,
		fontSize: 11,
		fontWeight: "600",
	},
	checkCircle: {
		width: 24,
		height: 24,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
	},
	description: {
		fontSize: 13,
		marginBottom: Spacing.sm,
	},
	priceContainer: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: Spacing.sm,
		marginBottom: Spacing.md,
	},
	price: {
		fontSize: 24,
		fontWeight: "700",
	},
	savingsBadge: {
		backgroundColor: StatusColors.success,
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: BorderRadius.sm,
	},
	savingsText: {
		color: "white",
		fontSize: 11,
		fontWeight: "600",
	},
	features: {
		gap: Spacing.xs,
	},
	featureRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	featureText: {
		fontSize: 13,
	},
});
