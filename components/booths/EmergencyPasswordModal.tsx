/**
 * EmergencyPasswordModal Component
 *
 * Bottom sheet modal for booth owners to request a self-service emergency password.
 * The password is emailed to the owner's registered email and is NOT shown in the app.
 *
 * @see app/(tabs)/settings.tsx - Used in Settings screen
 * @see POST /api/v1/booths/{booth_id}/emergency-password - API endpoint
 */

import React, { useState, useRef, useEffect } from "react";
import {
	Modal,
	StyleSheet,
	TouchableOpacity,
	View,
	ActivityIndicator,
	TextInput,
	ScrollView,
	Keyboard,
	Platform,
	Alert,
	type TextInput as TextInputType,
	Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { useRequestEmergencyPassword } from "@/api/booths";

interface EmergencyPasswordModalProps {
	/** Whether the modal is visible */
	visible: boolean;
	/** Booth ID to generate emergency password for (required for API) */
	boothId: string | null;
	/** Booth name for display */
	boothName: string;
	/** Callback when modal is closed */
	onClose: () => void;
}

/** Available validity durations in minutes */
const VALIDITY_OPTIONS = [
	{ value: 5, label: "5 min" },
	{ value: 10, label: "10 min" },
	{ value: 15, label: "15 min" },
	{ value: 30, label: "30 min" },
];

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;

const SCREEN_HEIGHT = Dimensions.get("window").height;

/**
 * EmergencyPasswordModal - Bottom sheet for requesting emergency password
 */
export function EmergencyPasswordModal({
	visible,
	boothId,
	boothName,
	onClose,
}: EmergencyPasswordModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");

	// API mutation
	const emergencyPasswordMutation = useRequestEmergencyPassword();

	// Safe area insets
	const insets = useSafeAreaInsets();

	// Refs
	const scrollViewRef = useRef<ScrollView>(null);
	const reasonInputRef = useRef<TextInputType>(null);

	// Form state
	const [reason, setReason] = useState("");
	const [selectedValidity, setSelectedValidity] = useState(15);
	const [isProcessing, setIsProcessing] = useState(false);
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	// Listen for keyboard show/hide
	useEffect(() => {
		const keyboardWillShow = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
			(e) => {
				setKeyboardHeight(e.endCoordinates.height);
				setTimeout(() => {
					scrollViewRef.current?.scrollToEnd({ animated: true });
				}, 100);
			},
		);
		const keyboardWillHide = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
			() => {
				setKeyboardHeight(0);
			},
		);

		return () => {
			keyboardWillShow.remove();
			keyboardWillHide.remove();
		};
	}, []);

	// Validation
	const isReasonValid = reason.trim().length >= MIN_REASON_LENGTH;
	const isValid = isReasonValid && !!boothId;

	const handleSubmit = async () => {
		if (!isValid || !boothId) return;

		Keyboard.dismiss();
		setIsProcessing(true);

		try {
			const data = await emergencyPasswordMutation.mutateAsync({
				boothId,
				reason: reason.trim(),
				validity_minutes: selectedValidity,
			});

			setIsProcessing(false);
			handleClose();

			Alert.alert(
				"Password Sent",
				`An emergency password has been sent to ${data.emailed_to}. It expires in ${data.validity_minutes} minutes.`,
				[{ text: "OK" }],
			);
		} catch (error: any) {
			setIsProcessing(false);

			// Handle specific error cases
			const message =
				error?.message || "Failed to generate emergency password.";
			Alert.alert("Request Failed", message, [{ text: "OK" }]);
		}
	};

	const handleClose = () => {
		if (!isProcessing) {
			Keyboard.dismiss();
			onClose();
			setReason("");
			setSelectedValidity(15);
		}
	};

	// Calculate bottom padding based on keyboard
	const bottomPadding =
		keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, Spacing.lg);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={handleClose}
		>
			{/* Backdrop */}
			<View style={styles.overlay}>
				<TouchableOpacity
					style={styles.backdrop}
					activeOpacity={1}
					onPress={handleClose}
				/>

				{/* Sheet */}
				<View
					style={[
						styles.sheet,
						{
							backgroundColor,
							paddingBottom: bottomPadding,
							maxHeight: SCREEN_HEIGHT * 0.85,
						},
					]}
				>
					{/* Header */}
					<View style={styles.header}>
						<View style={styles.handle} />
						<View style={styles.headerRow}>
							<ThemedText type="subtitle">Emergency Password</ThemedText>
							<TouchableOpacity
								onPress={handleClose}
								disabled={isProcessing}
								hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
							>
								<IconSymbol
									name="xmark.circle.fill"
									size={28}
									color={textSecondary}
								/>
							</TouchableOpacity>
						</View>
						<ThemedText
							style={[styles.headerSubtitle, { color: textSecondary }]}
						>
							Generate a one-time password for {boothName}
						</ThemedText>
					</View>

					{/* Scrollable Content */}
					<ScrollView
						ref={scrollViewRef}
						style={styles.scrollContent}
						contentContainerStyle={styles.scrollContentContainer}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						bounces={true}
					>
						{/* Info Card */}
						<View
							style={[
								styles.infoCard,
								{
									backgroundColor: withAlpha(BRAND_COLOR, 0.1),
									borderColor: BRAND_COLOR,
								},
							]}
						>
							<IconSymbol
								name="envelope"
								size={20}
								color={BRAND_COLOR}
							/>
							<ThemedText
								style={[styles.infoText, { color: textSecondary }]}
							>
								The password will be sent to your registered email address. It
								will not be displayed in the app.
							</ThemedText>
						</View>

						{/* Reason Input */}
						<View style={styles.fieldGroup}>
							<ThemedText
								type="defaultSemiBold"
								style={styles.fieldLabel}
							>
								Reason
							</ThemedText>
							<View
								style={[
									styles.textAreaContainer,
									{
										backgroundColor: cardBg,
										borderColor: reason.length > 0 && !isReasonValid
											? StatusColors.error
											: borderColor,
									},
								]}
							>
								<TextInput
									ref={reasonInputRef}
									style={[styles.textArea, { color: textColor }]}
									value={reason}
									onChangeText={setReason}
									placeholder="Why do you need emergency access? (min 10 characters)"
									placeholderTextColor={textSecondary}
									multiline
									numberOfLines={3}
									maxLength={MAX_REASON_LENGTH}
									editable={!isProcessing}
									textAlignVertical="top"
									onFocus={() => {
										setTimeout(() => {
											scrollViewRef.current?.scrollToEnd({ animated: true });
										}, 100);
									}}
								/>
							</View>
							<ThemedText
								style={[
									styles.charCount,
									{
										color:
											reason.length > 0 && reason.trim().length < MIN_REASON_LENGTH
												? StatusColors.error
												: textSecondary,
									},
								]}
							>
								{reason.trim().length}/{MAX_REASON_LENGTH}
							</ThemedText>
						</View>

						{/* Validity Duration */}
						<View style={styles.fieldGroup}>
							<ThemedText
								type="defaultSemiBold"
								style={styles.fieldLabel}
							>
								Password Validity
							</ThemedText>
							<View style={styles.validityOptions}>
								{VALIDITY_OPTIONS.map((option) => {
									const isSelected = selectedValidity === option.value;
									return (
										<TouchableOpacity
											key={option.value}
											style={[
												styles.validityChip,
												{
													backgroundColor: isSelected
														? BRAND_COLOR
														: cardBg,
													borderColor: isSelected
														? BRAND_COLOR
														: borderColor,
												},
											]}
											onPress={() => setSelectedValidity(option.value)}
											disabled={isProcessing}
											activeOpacity={0.7}
										>
											<ThemedText
												style={[
													styles.validityChipText,
													{
														color: isSelected ? "white" : textColor,
													},
												]}
											>
												{option.label}
											</ThemedText>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>

						{/* Warning */}
						<View
							style={[
								styles.warningCard,
								{
									backgroundColor: withAlpha(StatusColors.warning, 0.1),
									borderColor: StatusColors.warning,
								},
							]}
						>
							<IconSymbol
								name="exclamationmark.triangle"
								size={18}
								color={StatusColors.warning}
							/>
							<ThemedText
								style={[styles.warningText, { color: textSecondary }]}
							>
								Maximum 3 active emergency passwords per booth. The password is
								single-use and expires after {selectedValidity} minutes.
							</ThemedText>
						</View>

						{/* Submit Button */}
						<View style={styles.buttonContainer}>
							<TouchableOpacity
								style={[
									styles.submitButton,
									{
										backgroundColor: isValid ? BRAND_COLOR : borderColor,
										opacity: isValid && !isProcessing ? 1 : 0.6,
									},
								]}
								onPress={handleSubmit}
								disabled={!isValid || isProcessing}
								activeOpacity={0.8}
							>
								{isProcessing ? (
									<ActivityIndicator color="white" />
								) : (
									<ThemedText style={styles.submitButtonText}>
										Send Emergency Password
									</ThemedText>
								)}
							</TouchableOpacity>
						</View>
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "flex-end",
	},
	backdrop: {
		flex: 1,
	},
	sheet: {
		borderTopLeftRadius: BorderRadius.xl,
		borderTopRightRadius: BorderRadius.xl,
	},
	header: {
		padding: Spacing.lg,
		alignItems: "center",
	},
	handle: {
		width: 40,
		height: 4,
		backgroundColor: "#ccc",
		borderRadius: 2,
		marginBottom: Spacing.md,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		width: "100%",
		marginBottom: Spacing.xs,
	},
	headerSubtitle: {
		fontSize: 14,
		alignSelf: "flex-start",
	},
	scrollContent: {
		flexShrink: 1,
	},
	scrollContentContainer: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.md,
	},
	infoCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.sm,
		marginBottom: Spacing.lg,
	},
	infoText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
	},
	fieldGroup: {
		marginBottom: Spacing.lg,
	},
	fieldLabel: {
		fontSize: 14,
		marginBottom: Spacing.sm,
	},
	textAreaContainer: {
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		padding: Spacing.md,
		minHeight: 90,
	},
	textArea: {
		fontSize: 15,
		lineHeight: 20,
		minHeight: 60,
	},
	charCount: {
		fontSize: 12,
		textAlign: "right",
		marginTop: Spacing.xs,
	},
	validityOptions: {
		flexDirection: "row",
		gap: Spacing.sm,
	},
	validityChip: {
		flex: 1,
		paddingVertical: Spacing.sm + 2,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	validityChipText: {
		fontSize: 14,
		fontWeight: "600",
	},
	warningCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.sm,
		marginBottom: Spacing.lg,
	},
	warningText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
	},
	buttonContainer: {
		marginTop: Spacing.xs,
	},
	submitButton: {
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 50,
	},
	submitButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
});
