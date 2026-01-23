/**
 * Activation Success Modal
 *
 * Displays success information after booth activation.
 * Shows the license key and fingerprint.
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
import * as Clipboard from "expo-clipboard";
import {
	Alert,
	Modal,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";

interface ActivationSuccessModalProps {
	visible: boolean;
	onClose: () => void;
	licenseKey: string | null;
	fingerprintShort: string;
	message: string;
}

export function ActivationSuccessModal({
	visible,
	onClose,
	licenseKey,
	fingerprintShort,
	message,
}: ActivationSuccessModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	const handleCopyLicenseKey = async () => {
		if (licenseKey) {
			await Clipboard.setStringAsync(licenseKey);
			Alert.alert("Copied", "License key copied to clipboard");
		}
	};

	return (
		<Modal
			visible={visible}
			animationType="fade"
			transparent
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<View style={[styles.container, { backgroundColor }]}>
					{/* Success Icon */}
					<View
						style={[
							styles.iconContainer,
							{ backgroundColor: withAlpha(StatusColors.success, 0.15) },
						]}
					>
						<IconSymbol
							name="checkmark.circle.fill"
							size={64}
							color={StatusColors.success}
						/>
					</View>

					{/* Title */}
					<ThemedText type="title" style={styles.title}>
						Booth Activated!
					</ThemedText>

					{/* Message */}
					<ThemedText style={[styles.message, { color: textSecondary }]}>
						{message}
					</ThemedText>

					{/* Details Card */}
					<View style={[styles.detailsCard, { backgroundColor: cardBg, borderColor }]}>
						{/* Fingerprint */}
						<View style={styles.detailRow}>
							<ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
								Booth ID
							</ThemedText>
							<ThemedText style={styles.detailValue} numberOfLines={1}>
								{fingerprintShort}
							</ThemedText>
						</View>

						{/* License Key */}
						{licenseKey && (
							<>
								<View style={[styles.divider, { backgroundColor: borderColor }]} />
								<View style={styles.detailRow}>
									<ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
										License Key
									</ThemedText>
									<TouchableOpacity
										style={styles.licenseKeyRow}
										onPress={handleCopyLicenseKey}
									>
										<ThemedText style={styles.licenseKey}>
											{licenseKey}
										</ThemedText>
										<IconSymbol
											name="doc.on.doc"
											size={16}
											color={BRAND_COLOR}
										/>
									</TouchableOpacity>
								</View>
							</>
						)}
					</View>

					{/* Note */}
					<View style={[styles.noteCard, { backgroundColor: withAlpha(BRAND_COLOR, 0.1) }]}>
						<IconSymbol name="info.circle" size={18} color={BRAND_COLOR} />
						<ThemedText style={[styles.noteText, { color: textSecondary }]}>
							Your booth is now connected and ready to use. The license key has been automatically applied.
						</ThemedText>
					</View>

					{/* Done Button */}
					<TouchableOpacity
						style={[styles.doneButton, { backgroundColor: BRAND_COLOR }]}
						onPress={onClose}
					>
						<ThemedText style={styles.doneButtonText}>Done</ThemedText>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing.lg,
	},
	container: {
		width: "100%",
		maxWidth: 360,
		borderRadius: BorderRadius.xl,
		padding: Spacing.xl,
		alignItems: "center",
	},
	iconContainer: {
		width: 100,
		height: 100,
		borderRadius: 50,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.lg,
	},
	title: {
		fontSize: 24,
		textAlign: "center",
		marginBottom: Spacing.sm,
	},
	message: {
		fontSize: 14,
		textAlign: "center",
		marginBottom: Spacing.lg,
		lineHeight: 20,
	},
	detailsCard: {
		width: "100%",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.md,
	},
	detailRow: {
		paddingVertical: Spacing.xs,
	},
	detailLabel: {
		fontSize: 12,
		marginBottom: 4,
	},
	detailValue: {
		fontSize: 14,
		fontWeight: "600",
	},
	divider: {
		height: 1,
		marginVertical: Spacing.sm,
	},
	licenseKeyRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	licenseKey: {
		fontSize: 16,
		fontWeight: "700",
		fontFamily: "monospace",
		letterSpacing: 1,
	},
	noteCard: {
		width: "100%",
		flexDirection: "row",
		alignItems: "flex-start",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		marginBottom: Spacing.lg,
		gap: Spacing.sm,
	},
	noteText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
	},
	doneButton: {
		width: "100%",
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		alignItems: "center",
	},
	doneButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
});
