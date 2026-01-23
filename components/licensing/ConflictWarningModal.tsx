/**
 * Conflict Warning Modal
 *
 * Shows warnings about conflicts that will occur during activation.
 * User must confirm to proceed with activation.
 */

import type { ActivationConflict } from "@/api/licensing/types";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	Spacing,
	StatusColors,
	withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
	ActivityIndicator,
	Modal,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";

interface ConflictWarningModalProps {
	/** Whether modal is visible */
	visible: boolean;
	/** Callback when modal is closed/canceled */
	onClose: () => void;
	/** Callback when user confirms and wants to proceed */
	onConfirm: () => void;
	/** Target booth name for display */
	boothName: string;
	/** List of conflicts to display */
	conflicts: ActivationConflict[];
	/** Whether activation is in progress */
	isActivating?: boolean;
}

/**
 * Get icon for conflict type
 */
function getConflictIcon(conflictType: string): string {
	switch (conflictType) {
		case "fingerprint_bound_elsewhere":
			return "link.badge.plus";
		case "booth_has_other_device_data":
			return "trash.circle";
		default:
			return "exclamationmark.triangle";
	}
}

export function ConflictWarningModal({
	visible,
	onClose,
	onConfirm,
	boothName,
	conflicts,
	isActivating = false,
}: ConflictWarningModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	return (
		<Modal
			visible={visible}
			animationType="fade"
			transparent
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<View style={[styles.container, { backgroundColor }]}>
					{/* Header */}
					<View style={styles.header}>
						<View
							style={[
								styles.warningIcon,
								{ backgroundColor: withAlpha(StatusColors.warning, 0.15) },
							]}
						>
							<IconSymbol
								name="exclamationmark.triangle.fill"
								size={32}
								color={StatusColors.warning}
							/>
						</View>
						<ThemedText type="subtitle" style={styles.title}>
							Warning
						</ThemedText>
						<ThemedText style={[styles.subtitle, { color: textSecondary }]}>
							Activating &quot;{boothName}&quot; will make the following
							changes:
						</ThemedText>
					</View>

					{/* Conflicts List */}
					<ScrollView style={styles.conflictList} bounces={false}>
						{conflicts.map((conflict, index) => (
							<View
								key={`${conflict.conflict_type}-${index}`}
								style={[
									styles.conflictItem,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<View
									style={[
										styles.conflictIcon,
										{ backgroundColor: withAlpha(StatusColors.warning, 0.15) },
									]}
								>
									<IconSymbol
										name={getConflictIcon(conflict.conflict_type) as any}
										size={20}
										color={StatusColors.warning}
									/>
								</View>
								<ThemedText style={styles.conflictText}>
									{conflict.message}
								</ThemedText>
							</View>
						))}
					</ScrollView>

					{/* Warning Note */}
					<View
						style={[
							styles.warningNote,
							{ backgroundColor: withAlpha(StatusColors.error, 0.1) },
						]}
					>
						<IconSymbol
							name="exclamationmark.circle"
							size={16}
							color={StatusColors.error}
						/>
						<ThemedText
							style={[styles.warningNoteText, { color: StatusColors.error }]}
						>
							This action cannot be undone.
						</ThemedText>
					</View>

					{/* Actions */}
					<View style={styles.actions}>
						<TouchableOpacity
							style={[styles.button, styles.cancelButton, { borderColor }]}
							onPress={onClose}
							disabled={isActivating}
						>
							<ThemedText style={[styles.buttonText, { color: textSecondary }]}>
								Cancel
							</ThemedText>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.button,
								styles.confirmButton,
								{ backgroundColor: StatusColors.warning },
							]}
							onPress={onConfirm}
							disabled={isActivating}
						>
							{isActivating ? (
								<ActivityIndicator size="small" color="white" />
							) : (
								<>
									<IconSymbol name="checkmark" size={18} color="white" />
									<ThemedText style={styles.confirmButtonText}>
										Confirm
									</ThemedText>
								</>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing.lg,
	},
	container: {
		width: "100%",
		maxWidth: 400,
		borderRadius: BorderRadius.xl,
		overflow: "hidden",
	},
	header: {
		alignItems: "center",
		padding: Spacing.lg,
		paddingBottom: Spacing.md,
	},
	warningIcon: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.md,
	},
	title: {
		fontSize: 20,
		textAlign: "center",
		marginBottom: Spacing.xs,
	},
	subtitle: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
	},
	conflictList: {
		maxHeight: 200,
		paddingHorizontal: Spacing.lg,
	},
	conflictItem: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		marginBottom: Spacing.sm,
		gap: Spacing.sm,
	},
	conflictIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: "center",
		alignItems: "center",
		flexShrink: 0,
	},
	conflictText: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
	},
	warningNote: {
		flexDirection: "row",
		alignItems: "center",
		marginHorizontal: Spacing.lg,
		marginTop: Spacing.sm,
		padding: Spacing.sm,
		borderRadius: BorderRadius.md,
		gap: Spacing.xs,
	},
	warningNoteText: {
		fontSize: 13,
		fontWeight: "500",
	},
	actions: {
		flexDirection: "row",
		padding: Spacing.lg,
		gap: Spacing.sm,
	},
	button: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		gap: Spacing.xs,
	},
	cancelButton: {
		backgroundColor: "transparent",
		borderWidth: 1,
	},
	confirmButton: {},
	buttonText: {
		fontSize: 16,
		fontWeight: "600",
	},
	confirmButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
});
