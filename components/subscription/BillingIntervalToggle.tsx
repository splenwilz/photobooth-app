/**
 * Billing Interval Toggle Component
 *
 * Toggle switch for selecting monthly vs annual billing.
 * Shows savings percentage when annual is selected.
 */

import { ThemedText } from "@/components/themed-text";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	StatusColors,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export type BillingInterval = "month" | "year";

interface BillingIntervalToggleProps {
	/** Current selected interval */
	value: BillingInterval;
	/** Called when interval changes */
	onChange: (interval: BillingInterval) => void;
	/** Savings percentage for annual billing (e.g., 20 for 20% off) */
	savingsPercent?: number;
	/** Whether toggle is disabled */
	disabled?: boolean;
}

export function BillingIntervalToggle({
	value,
	onChange,
	savingsPercent,
	disabled = false,
}: BillingIntervalToggleProps) {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	const isMonthly = value === "month";
	const isAnnual = value === "year";

	return (
		<View style={styles.container}>
			<View
				style={[
					styles.toggleContainer,
					{ backgroundColor: cardBg, borderColor },
				]}
			>
				<TouchableOpacity
					style={[
						styles.toggleOption,
						isMonthly && styles.toggleOptionActive,
						isMonthly && { backgroundColor: BRAND_COLOR },
					]}
					onPress={() => onChange("month")}
					disabled={disabled}
					activeOpacity={0.7}
				>
					<ThemedText
						style={[
							styles.toggleText,
							isMonthly
								? styles.toggleTextActive
								: { color: textSecondary },
						]}
					>
						Monthly
					</ThemedText>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.toggleOption,
						isAnnual && styles.toggleOptionActive,
						isAnnual && { backgroundColor: BRAND_COLOR },
					]}
					onPress={() => onChange("year")}
					disabled={disabled}
					activeOpacity={0.7}
				>
					<ThemedText
						style={[
							styles.toggleText,
							isAnnual
								? styles.toggleTextActive
								: { color: textSecondary },
						]}
					>
						Annual
					</ThemedText>
					{savingsPercent && savingsPercent > 0 && (
						<View style={styles.savingsBadge}>
							<ThemedText style={styles.savingsText}>
								-{savingsPercent}%
							</ThemedText>
						</View>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
	},
	toggleContainer: {
		flexDirection: "row",
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		padding: 4,
	},
	toggleOption: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.sm,
		paddingHorizontal: Spacing.lg,
		borderRadius: BorderRadius.md,
		gap: Spacing.xs,
	},
	toggleOptionActive: {
		// backgroundColor set dynamically
	},
	toggleText: {
		fontSize: 14,
		fontWeight: "600",
	},
	toggleTextActive: {
		color: "white",
	},
	savingsBadge: {
		backgroundColor: StatusColors.success,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: BorderRadius.sm,
	},
	savingsText: {
		color: "white",
		fontSize: 10,
		fontWeight: "700",
	},
});
