/**
 * EditBoothModal Component
 *
 * Lightweight bottom sheet modal for editing booth name and address.
 * Accessible directly from the booth card on the booths screen.
 *
 * @see components/ui/booth-card.tsx - Triggered from booth card edit action
 * @see api/booths/queries.ts - useUpdateBoothSettings mutation
 */

import React, { useEffect, useRef, useState } from "react";
import {
	Alert,
	Keyboard,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useUpdateBoothSettings } from "@/api/booths";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface EditBoothModalProps {
	visible: boolean;
	boothId: string;
	boothName: string;
	boothAddress: string;
	onClose: () => void;
}

export function EditBoothModal({
	visible,
	boothId,
	boothName: initialName,
	boothAddress: initialAddress,
	onClose,
}: EditBoothModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");
	const insets = useSafeAreaInsets();
	const { height: screenHeight } = useWindowDimensions();

	const updateBoothSettingsMutation = useUpdateBoothSettings();

	const [name, setName] = useState("");
	const [address, setAddress] = useState("");
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	const hasPopulated = useRef(false);

	// Populate form when modal opens
	useEffect(() => {
		if (!visible) {
			hasPopulated.current = false;
			return;
		}
		if (hasPopulated.current) return;
		setName(initialName);
		setAddress(initialAddress);
		hasPopulated.current = true;
	}, [visible, initialName, initialAddress]);

	// Keyboard handling
	useEffect(() => {
		const showEvent =
			Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
		const hideEvent =
			Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
		const showSub = Keyboard.addListener(showEvent, (e) =>
			setKeyboardHeight(e.endCoordinates.height),
		);
		const hideSub = Keyboard.addListener(hideEvent, () =>
			setKeyboardHeight(0),
		);
		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

	const hasNameChange = name !== initialName;
	const hasAddressChange = address !== initialAddress;
	const hasAnyChange = hasNameChange || hasAddressChange;
	const isProcessing = updateBoothSettingsMutation.isPending;

	const bottomPadding = Math.max(insets.bottom, Spacing.md) + keyboardHeight;

	const handleClose = () => {
		if (!isProcessing) {
			Keyboard.dismiss();
			onClose();
		}
	};

	const handleSave = async () => {
		if (!hasAnyChange) return;
		Keyboard.dismiss();

		if (hasNameChange && !name.trim()) {
			Alert.alert("Validation Error", "Booth name cannot be empty.");
			return;
		}

		try {
			await updateBoothSettingsMutation.mutateAsync({
				boothId,
				...(hasNameChange ? { name: name.trim() } : {}),
				...(hasAddressChange ? { address: address.trim() } : {}),
			});
			Alert.alert("Saved", "Booth details have been updated.");
			onClose();
		} catch (error: unknown) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to save booth details.";
			Alert.alert("Error", message);
		}
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={handleClose}
		>
			<View style={styles.overlay}>
				<TouchableOpacity
					style={styles.backdrop}
					activeOpacity={1}
					onPress={handleClose}
				/>

				<View
					style={[
						styles.sheet,
						{
							backgroundColor,
							paddingBottom: bottomPadding,
							maxHeight: screenHeight * 0.6,
						},
					]}
				>
					{/* Header */}
					<View style={styles.header}>
						<View style={[styles.handle, { backgroundColor: borderColor }]} />
						<View style={styles.headerRow}>
							<ThemedText type="subtitle">Edit Booth</ThemedText>
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
					</View>

					{/* Form */}
					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : undefined}
						keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
					>
					<ScrollView
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
					<View style={styles.form}>
						{/* Booth Name */}
						<View style={styles.fieldContainer}>
							<ThemedText
								style={[styles.fieldLabel, { color: textSecondary }]}
							>
								Booth Name
							</ThemedText>
							<View
								style={[
									styles.inputContainer,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<IconSymbol
									name="tag"
									size={20}
									color={textSecondary}
									style={styles.inputIcon}
								/>
								<TextInput
									style={[styles.input, { color: textColor }]}
									value={name}
									onChangeText={setName}
									placeholder="Enter booth name"
									placeholderTextColor={textSecondary}
									maxLength={100}
									editable={!isProcessing}
								/>
							</View>
						</View>

						{/* Address */}
						<View style={styles.fieldContainer}>
							<ThemedText
								style={[styles.fieldLabel, { color: textSecondary }]}
							>
								Address
							</ThemedText>
							<View
								style={[
									styles.inputContainer,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<IconSymbol
									name="mappin"
									size={20}
									color={textSecondary}
									style={styles.inputIcon}
								/>
								<TextInput
									style={[styles.input, { color: textColor }]}
									value={address}
									onChangeText={setAddress}
									placeholder="Enter booth address"
									placeholderTextColor={textSecondary}
									maxLength={500}
									editable={!isProcessing}
								/>
							</View>
						</View>

						{/* Save Button */}
						{hasAnyChange && (
							<TouchableOpacity
								style={[
									styles.saveButton,
									{
										backgroundColor: BRAND_COLOR,
										opacity: isProcessing ? 0.7 : 1,
									},
								]}
								onPress={handleSave}
								disabled={isProcessing}
							>
								<ThemedText style={styles.saveButtonText}>
									{isProcessing ? "Saving..." : "Save Changes"}
								</ThemedText>
							</TouchableOpacity>
						)}
					</View>
					</ScrollView>
					</KeyboardAvoidingView>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "flex-end",
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.4)",
	},
	sheet: {
		borderTopLeftRadius: BorderRadius.xl,
		borderTopRightRadius: BorderRadius.xl,
		paddingHorizontal: Spacing.lg,
	},
	header: {
		alignItems: "center",
		paddingTop: Spacing.sm,
		paddingBottom: Spacing.md,
	},
	handle: {
		width: 36,
		height: 4,
		borderRadius: 2,
		marginBottom: Spacing.md,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		width: "100%",
	},
	form: {
		paddingBottom: Spacing.md,
	},
	fieldContainer: {
		marginBottom: Spacing.md,
	},
	fieldLabel: {
		fontSize: 13,
		fontWeight: "500",
		marginBottom: Spacing.xs,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		paddingHorizontal: Spacing.md,
		height: 48,
	},
	inputIcon: {
		marginRight: Spacing.sm,
	},
	input: {
		flex: 1,
		fontSize: 16,
		height: "100%",
	},
	saveButton: {
		height: 48,
		borderRadius: BorderRadius.lg,
		justifyContent: "center",
		alignItems: "center",
		marginTop: Spacing.sm,
	},
	saveButtonText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "600",
	},
});
