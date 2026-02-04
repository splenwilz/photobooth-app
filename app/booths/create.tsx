/**
 * Create Booth Screen
 *
 * Screen for creating a new photobooth.
 * Displays booth name and address form, then shows API key and QR code on success.
 *
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 */

import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// API hooks
import { useCreateBooth } from "@/api/booths/queries";
import type { CreateBoothResponse } from "@/api/booths/types";
import { PricingPlansSelector } from "@/components/subscription";
import { FormInput } from "@/components/auth/form-input";
import { PrimaryButton } from "@/components/auth/primary-button";
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
import { useBoothStore } from "@/stores/booth-store";

interface FormData {
	name: string;
	address: string;
}

interface FormErrors {
	name?: string;
	address?: string;
}

export default function CreateBoothScreen() {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const textSecondary = useThemeColor({}, "textSecondary");
	const borderColor = useThemeColor({}, "border");
	const successColor = StatusColors.success;

	// Form state
	const [formData, setFormData] = useState<FormData>({
		name: "",
		address: "",
	});
	const [errors, setErrors] = useState<FormErrors>({});

	// Success state - shows API key, registration code, and QR code after booth creation
	const [createdBooth, setCreatedBooth] = useState<CreateBoothResponse | null>(
		null,
	);
	const [copiedField, setCopiedField] = useState<
		"id" | "apiKey" | "code" | null
	>(null);
	// Pricing modal state
	const [showPricingModal, setShowPricingModal] = useState(false);

	// API mutation hook
	const { mutate: createBooth, isPending, error: apiError } = useCreateBooth();

	// Booth store for auto-selecting created booth
	const { setSelectedBoothId } = useBoothStore();

	// Handle subscribing to the newly created booth - opens pricing modal
	const handleSubscribeToBooth = () => {
		if (!createdBooth) return;
		setShowPricingModal(true);
	};

	// Handle checkout completion from pricing selector
	// Note: PricingPlansSelector already handles setSelectedBoothId and navigation
	const handleCheckoutComplete = () => {
		setShowPricingModal(false);
	};

	// Update form field
	const updateField = (field: keyof FormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	// Validate form
	const validateForm = (): boolean => {
		const newErrors: FormErrors = {};

		if (!formData.name.trim()) {
			newErrors.name = "Booth name is required";
		} else if (formData.name.length < 2) {
			newErrors.name = "Booth name must be at least 2 characters";
		}

		if (!formData.address.trim()) {
			newErrors.address = "Address is required";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Handle booth creation
	const handleCreateBooth = () => {
		if (!validateForm()) return;

		createBooth(
			{ name: formData.name, address: formData.address },
			{
				onSuccess: (response) => {
					setCreatedBooth(response);
				},
				onError: (error) => {
					console.error("[CreateBooth] Error:", error);
				},
			},
		);
	};

	// Copy to clipboard
	const handleCopy = async (text: string, field: "id" | "apiKey" | "code") => {
		try {
			await Clipboard.setStringAsync(text);
			setCopiedField(field);
			setTimeout(() => setCopiedField(null), 2000);
		} catch {
			Alert.alert("Error", "Failed to copy to clipboard");
		}
	};

	// Navigate back to booths with the newly created booth selected
	const handleGoToBooths = () => {
		if (createdBooth) {
			setSelectedBoothId(createdBooth.id);
		}
		router.replace("/(tabs)/booths");
	};

	// Create another booth
	const handleAddAnother = () => {
		setCreatedBooth(null);
		setFormData({ name: "", address: "" });
	};

	// Navigate back
	const handleBack = () => {
		router.back();
	};

	// Success state - show booth credentials
	if (createdBooth) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor }]}>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.successContent}
					showsVerticalScrollIndicator={false}
				>
					{/* Success Icon */}
					<View
						style={[
							styles.successIcon,
							{ backgroundColor: withAlpha(successColor, 0.15) },
						]}
					>
						<IconSymbol name="checkmark" size={48} color={successColor} />
					</View>

					<ThemedText type="title" style={styles.successTitle}>
						Booth Created!
					</ThemedText>
					<ThemedText
						style={[styles.successSubtitle, { color: textSecondary }]}
					>
						Your booth &quot;{createdBooth.name}&quot; has been created successfully.
					</ThemedText>

					{/* Credentials Card */}
					<View
						style={[
							styles.credentialsCard,
							{ backgroundColor: cardBg, borderColor },
						]}
					>
						<ThemedText style={styles.credentialsTitle}>
							Connection Credentials
						</ThemedText>
						<ThemedText
							style={[styles.credentialsSubtitle, { color: textSecondary }]}
						>
							Use these to connect your physical booth
						</ThemedText>

						{/* Registration Code - Prominent display for easy entry */}
						{createdBooth.registration_code && (
							<View style={styles.registrationCodeSection}>
								<ThemedText
									style={[styles.credentialLabel, { color: textSecondary }]}
								>
									Registration Code
								</ThemedText>
								<TouchableOpacity
									style={[
										styles.registrationCodeBox,
										{
											backgroundColor: withAlpha(BRAND_COLOR, 0.15),
											borderColor: BRAND_COLOR,
										},
									]}
									onPress={() =>
										handleCopy(createdBooth.registration_code, "code")
									}
								>
									<ThemedText style={styles.registrationCodeText}>
										{createdBooth.registration_code}
									</ThemedText>
									<IconSymbol
										name={copiedField === "code" ? "checkmark" : "doc.on.doc"}
										size={20}
										color={copiedField === "code" ? successColor : BRAND_COLOR}
									/>
								</TouchableOpacity>
								<ThemedText
									style={[
										styles.registrationCodeHint,
										{ color: textSecondary },
									]}
								>
									Enter this code on your booth to connect
								</ThemedText>
							</View>
						)}

						{/* Booth ID */}
						<View style={styles.credentialRow}>
							<ThemedText
								style={[styles.credentialLabel, { color: textSecondary }]}
							>
								Booth ID
							</ThemedText>
							<TouchableOpacity
								style={[
									styles.credentialValue,
									{ backgroundColor: withAlpha(BRAND_COLOR, 0.1), borderColor },
								]}
								onPress={() => handleCopy(createdBooth.id, "id")}
							>
								<ThemedText style={styles.credentialText} numberOfLines={1}>
									{createdBooth.id}
								</ThemedText>
								<IconSymbol
									name={copiedField === "id" ? "checkmark" : "doc.on.doc"}
									size={18}
									color={copiedField === "id" ? successColor : BRAND_COLOR}
								/>
							</TouchableOpacity>
						</View>

						{/* API Key */}
						<View style={styles.credentialRow}>
							<ThemedText
								style={[styles.credentialLabel, { color: textSecondary }]}
							>
								API Key
							</ThemedText>
							<TouchableOpacity
								style={[
									styles.credentialValue,
									{ backgroundColor: withAlpha(BRAND_COLOR, 0.1), borderColor },
								]}
								onPress={() => handleCopy(createdBooth.api_key, "apiKey")}
							>
								<ThemedText style={styles.credentialText} numberOfLines={1}>
									{createdBooth.api_key.slice(0, 20)}...
								</ThemedText>
								<IconSymbol
									name={copiedField === "apiKey" ? "checkmark" : "doc.on.doc"}
									size={18}
									color={copiedField === "apiKey" ? successColor : BRAND_COLOR}
								/>
							</TouchableOpacity>
						</View>
					</View>

					{/* Next Steps - Subscribe to activate */}
					<View
						style={[
							styles.activationCard,
							{ backgroundColor: cardBg, borderColor },
						]}
					>
						<View style={styles.activationHeader}>
							<View
								style={[
									styles.activationIconContainer,
									{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
								]}
							>
								<IconSymbol name="star.fill" size={24} color={BRAND_COLOR} />
							</View>
							<View style={styles.activationTextContainer}>
								<ThemedText type="defaultSemiBold" style={styles.activationTitle}>
									Subscribe to Activate
								</ThemedText>
								<ThemedText
									style={[styles.activationSubtitle, { color: textSecondary }]}
								>
									Each booth needs its own subscription to connect and operate
								</ThemedText>
							</View>
						</View>

						<TouchableOpacity
							style={[
								styles.activationButton,
								{ backgroundColor: BRAND_COLOR },
							]}
							onPress={handleSubscribeToBooth}
						>
							<IconSymbol name="star.fill" size={20} color="white" />
							<ThemedText style={styles.activationButtonText}>
								Subscribe to This Booth
							</ThemedText>
						</TouchableOpacity>

						<ThemedText
							style={[styles.activationNote, { color: textSecondary }]}
						>
							After subscribing, you can scan the booth&apos;s QR code from Settings to complete activation.
						</ThemedText>
					</View>

					{/* Action Buttons */}
					<View style={styles.actionButtons}>
						<PrimaryButton text="Go to Booths" onPress={handleGoToBooths} />
						<TouchableOpacity
							style={[styles.secondaryButton, { borderColor }]}
							onPress={handleAddAnother}
						>
							<IconSymbol name="plus" size={18} color={BRAND_COLOR} />
							<ThemedText
								style={[styles.secondaryButtonText, { color: BRAND_COLOR }]}
							>
								Add Another Booth
							</ThemedText>
						</TouchableOpacity>
					</View>
				</ScrollView>

				{/* Pricing Plans Modal */}
				<Modal
					visible={showPricingModal}
					animationType="slide"
					presentationStyle="pageSheet"
					onRequestClose={() => setShowPricingModal(false)}
				>
					<SafeAreaView style={[styles.pricingModal, { backgroundColor: cardBg }]}>
						<PricingPlansSelector
							boothId={createdBooth.id}
							onCheckoutComplete={handleCheckoutComplete}
							onCancel={() => setShowPricingModal(false)}
						/>
					</SafeAreaView>
				</Modal>
			</SafeAreaView>
		);
	}

	// Form state - create booth form
	return (
		<SafeAreaView style={[styles.container, { backgroundColor }]}>
			<KeyboardAvoidingView
				style={styles.keyboardView}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
				{/* Header with Back Button */}
				<View style={styles.header}>
					<TouchableOpacity onPress={handleBack} style={styles.backButton}>
						<IconSymbol name="chevron.left" size={24} color={BRAND_COLOR} />
					</TouchableOpacity>
					<View style={styles.headerTextContainer}>
						<ThemedText type="title" style={styles.title}>
							Add New Booth
						</ThemedText>
						<ThemedText style={[styles.subtitle, { color: textSecondary }]}>
							Set up a new photobooth
						</ThemedText>
					</View>
				</View>

				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					{/* API Error Message */}
					{apiError && (
						<View style={styles.errorBanner}>
							<ThemedText style={styles.errorText}>
								{apiError.message ||
									"Failed to create booth. Please try again."}
							</ThemedText>
						</View>
					)}

					{/* Form */}
					<View style={styles.form}>
						<FormInput
							label="Booth Name"
							placeholder="e.g., Main Entrance Booth"
							icon="photo.stack"
							value={formData.name}
							onChangeText={(value) => updateField("name", value)}
							error={errors.name}
							autoCapitalize="words"
						/>

						<FormInput
							label="Address"
							placeholder="e.g., 123 Mall of America, Minneapolis"
							icon="location"
							value={formData.address}
							onChangeText={(value) => updateField("address", value)}
							error={errors.address}
							autoCapitalize="words"
						/>

						{/* Create Button */}
						<View style={styles.buttonSection}>
							<PrimaryButton
								text="Create Booth"
								onPress={handleCreateBooth}
								isLoading={isPending}
							/>
						</View>
					</View>

					{/* Info Card */}
					<View
						style={[
							styles.infoCard,
							{ backgroundColor: withAlpha(BRAND_COLOR, 0.1), borderColor },
						]}
					>
						<IconSymbol name="info.circle" size={20} color={BRAND_COLOR} />
						<ThemedText style={[styles.infoText, { color: textSecondary }]}>
							After creating the booth, you&apos;ll receive an API Key and registration
							code to connect your physical photobooth device.
						</ThemedText>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	pricingModal: {
		flex: 1,
		padding: Spacing.lg,
	},
	keyboardView: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		gap: Spacing.sm,
	},
	backButton: {
		padding: Spacing.xs,
	},
	headerTextContainer: {
		flex: 1,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
	},
	subtitle: {
		fontSize: 14,
		marginTop: 2,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.xxl,
	},
	successContent: {
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.xl,
		alignItems: "center",
	},
	successIcon: {
		width: 96,
		height: 96,
		borderRadius: 48,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.lg,
	},
	successTitle: {
		fontSize: 28,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: Spacing.xs,
	},
	successSubtitle: {
		fontSize: 16,
		textAlign: "center",
		marginBottom: Spacing.xl,
	},
	credentialsCard: {
		width: "100%",
		padding: Spacing.lg,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.xl,
	},
	credentialsTitle: {
		fontSize: 18,
		fontWeight: "600",
		marginBottom: Spacing.xs,
	},
	credentialsSubtitle: {
		fontSize: 14,
		marginBottom: Spacing.lg,
	},
	credentialRow: {
		marginBottom: Spacing.md,
	},
	credentialLabel: {
		fontSize: 13,
		fontWeight: "500",
		marginBottom: Spacing.xs,
	},
	credentialValue: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
	},
	credentialText: {
		flex: 1,
		fontSize: 14,
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
		marginRight: Spacing.sm,
	},
	registrationCodeSection: {
		marginBottom: Spacing.lg,
		width: "100%",
		alignItems: "center",
	},
	registrationCodeBox: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 2,
		marginTop: Spacing.xs,
		gap: Spacing.sm,
		width: "100%",
	},
	registrationCodeText: {
		fontSize: 28,
		fontWeight: "bold",
		letterSpacing: 6,
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    paddingVertical: 3,
    marginTop:4
	},
	registrationCodeHint: {
		fontSize: 12,
		marginTop: Spacing.xs,
		textAlign: "center",
	},
	actionButtons: {
		width: "100%",
		gap: Spacing.md,
	},
	secondaryButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.xs,
	},
	secondaryButtonText: {
		fontSize: 16,
		fontWeight: "600",
	},
	errorBanner: {
		backgroundColor: "rgba(255, 82, 82, 0.15)",
		borderRadius: 8,
		padding: Spacing.md,
		marginBottom: Spacing.md,
	},
	errorText: {
		color: "#FF5252",
		fontSize: 14,
		textAlign: "center",
	},
	form: {
		marginTop: Spacing.lg,
	},
	buttonSection: {
		marginTop: Spacing.lg,
	},
	infoCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginTop: Spacing.xl,
		gap: Spacing.sm,
	},
	infoText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
	},
	// Activation Section
	activationCard: {
		width: "100%",
		padding: Spacing.lg,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.xl,
	},
	activationHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		marginBottom: Spacing.md,
	},
	activationIconContainer: {
		width: 48,
		height: 48,
		borderRadius: 24,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.md,
	},
	activationTextContainer: {
		flex: 1,
	},
	activationTitle: {
		fontSize: 16,
		marginBottom: 4,
	},
	activationSubtitle: {
		fontSize: 13,
		lineHeight: 18,
	},
	activationButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		gap: Spacing.sm,
	},
	activationButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
	activationNote: {
		fontSize: 12,
		textAlign: "center",
		marginTop: Spacing.sm,
	},
});
