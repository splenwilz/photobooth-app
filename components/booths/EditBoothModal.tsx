/**
 * EditBoothModal Component
 *
 * Full-screen modal for editing booth name and address.
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

	const updateBoothSettingsMutation = useUpdateBoothSettings();

	const [name, setName] = useState("");
	const [address, setAddress] = useState("");

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

	const hasNameChange = name.trim() !== initialName.trim();
	const hasAddressChange = address.trim() !== initialAddress.trim();
	const hasAnyChange = hasNameChange || hasAddressChange;
	const isProcessing = updateBoothSettingsMutation.isPending;

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
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={handleClose}
		>
			<SafeAreaView style={[styles.container, { backgroundColor }]}>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity
						onPress={handleClose}
						disabled={isProcessing}
						hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
					>
						<IconSymbol name="xmark" size={22} color={textSecondary} />
					</TouchableOpacity>
					<ThemedText type="subtitle" style={styles.headerTitle}>
						Edit Booth
					</ThemedText>
					<TouchableOpacity
						onPress={handleSave}
						disabled={!hasAnyChange || isProcessing}
					>
						<ThemedText
							style={[
								styles.saveText,
								{
									color: hasAnyChange ? BRAND_COLOR : textSecondary,
									opacity: isProcessing ? 0.5 : 1,
								},
							]}
						>
							{isProcessing ? "Saving..." : "Save"}
						</ThemedText>
					</TouchableOpacity>
				</View>

				{/* Form */}
				<KeyboardAvoidingView
					style={styles.flex}
					behavior={Platform.OS === "ios" ? "padding" : "height"}
				>
					<ScrollView
						style={styles.flex}
						contentContainerStyle={styles.formContent}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
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
									autoFocus
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
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	flex: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	headerTitle: {
		fontSize: 18,
	},
	saveText: {
		fontSize: 16,
		fontWeight: "600",
	},
	formContent: {
		paddingHorizontal: Spacing.lg,
		paddingTop: Spacing.lg,
	},
	fieldContainer: {
		marginBottom: Spacing.lg,
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
});
