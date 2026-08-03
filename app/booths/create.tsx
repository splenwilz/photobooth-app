/**
 * Create Booth Screen
 *
 * Screen for creating a new photobooth.
 * Shows the booth form, then a post-creation flow: subscribe the booth
 * (US-storefront-gated CTA), then scan the QR on its screen to activate.
 *
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 */

import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// API hooks
import { useCreateBooth } from "@/api/booths/queries";
import { useBoothSubscriptionState } from "@/api/payments";
import type { CreateBoothResponse } from "@/api/booths/types";
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
  scaleFont,
} from "@/constants/theme";
import { useExternalPurchases } from "@/hooks/use-external-purchases";
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

	// Success state — drives the subscribe/scan-to-activate follow-up flow
	const [createdBooth, setCreatedBooth] = useState<CreateBoothResponse | null>(
		null,
	);

	// API mutation hook
	const { mutate: createBooth, isPending, error: apiError } = useCreateBooth();

	// Booth store for auto-selecting created booth
	const { setSelectedBoothId } = useBoothStore();

	// A newly created booth needs an active subscription before it can be
	// activated, so the post-creation flow is gated on subscription status.
	const { enabled: canPurchase, isLoading: isGateLoading } =
		useExternalPurchases();
	const { data: createdBoothSubscription } = useBoothSubscriptionState(
		createdBooth?.id ?? null,
	);
	const hasActiveSubscription = createdBoothSubscription?.is_active ?? false;

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

	// Success state — progress timeline + a single step-matched primary CTA
	if (createdBooth) {
		type StepStatus = "done" | "current" | "upcoming";

		const steps: {
			title: string;
			sub: string | null;
			status: StepStatus;
		}[] = [
			{ title: "Booth created", sub: null, status: "done" },
			{
				// Completed state wins regardless of storefront; otherwise the
				// imperative "Start a subscription" renders only where purchasing
				// is allowed (US storefront) — descriptive elsewhere
				// (anti-steering).
				title: hasActiveSubscription
					? "Subscription active"
					: canPurchase
						? "Start a subscription"
						: "Subscription required",
				sub: hasActiveSubscription
					? null
					: `"${createdBooth.name}" needs an active subscription before you can connect and activate it.`,
				status: hasActiveSubscription ? "done" : "current",
			},
			{
				title: "Scan to activate",
				sub: "Scan the QR code on your booth's screen to bring it online.",
				status: hasActiveSubscription ? "current" : "upcoming",
			},
		];

		const renderBadge = (index: number, status: StepStatus) => {
			if (status === "done") {
				return (
					<View
						style={[
							styles.stepBadge,
							{ backgroundColor: withAlpha(successColor, 0.15) },
						]}
					>
						<IconSymbol name="checkmark" size={14} color={successColor} />
					</View>
				);
			}
			if (status === "current") {
				return (
					<View style={[styles.stepBadge, { backgroundColor: BRAND_COLOR }]}>
						<ThemedText style={[styles.stepBadgeText, { color: "#fff" }]}>
							{index + 1}
						</ThemedText>
					</View>
				);
			}
			return (
				<View style={[styles.stepBadge, styles.stepBadgeUpcoming, { borderColor }]}>
					<ThemedText style={[styles.stepBadgeText, { color: textSecondary }]}>
						{index + 1}
					</ThemedText>
				</View>
			);
		};

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
						&quot;{createdBooth.name}&quot; is almost ready — two quick steps
						left.
					</ThemedText>

					{/* Progress timeline */}
					<View
						style={[
							styles.timelineCard,
							{ backgroundColor: cardBg, borderColor },
						]}
					>
						{steps.map((step, index) => (
							<View key={step.title} style={styles.stepRow}>
								<View style={styles.stepRail}>
									{renderBadge(index, step.status)}
									{index < steps.length - 1 && (
										<View
											style={[
												styles.stepConnector,
												{
													backgroundColor:
														step.status === "done"
															? withAlpha(successColor, 0.4)
															: borderColor,
												},
											]}
										/>
									)}
								</View>
								<View style={styles.stepTextWrap}>
									<ThemedText
										type="defaultSemiBold"
										style={[
											styles.stepTitle,
											step.status === "upcoming" && {
												color: textSecondary,
											},
										]}
									>
										{step.title}
									</ThemedText>
									{step.sub && (
										<ThemedText
											style={[styles.stepSub, { color: textSecondary }]}
										>
											{step.sub}
										</ThemedText>
									)}
								</View>
							</View>
						))}
					</View>
				</ScrollView>

				{/* One primary CTA matched to the current step; the rest are links */}
				<View style={styles.successFooter}>
					{hasActiveSubscription && (
						<PrimaryButton
							text="Scan QR to Activate"
							onPress={() =>
								router.push({
									pathname: "/licensing/scan",
									params: {
										boothId: createdBooth.id,
										boothName: createdBooth.name,
									},
								})
							}
						/>
					)}
					{/* Subscribe CTA — US storefront only (external purchase gate) */}
					{!hasActiveSubscription && canPurchase && (
						<PrimaryButton
							text="Choose a Plan"
							onPress={() =>
								router.push({
									pathname: "/subscribe",
									params: { boothId: createdBooth.id },
								})
							}
						/>
					)}
					{/* Wait for the gate before choosing between "Choose a Plan" and
					    "Go to Booths" — otherwise the CTA flickers on US devices. */}
					{!hasActiveSubscription && !canPurchase && !isGateLoading && (
						<PrimaryButton text="Go to Booths" onPress={handleGoToBooths} />
					)}

					<View style={styles.footerLinks}>
						{(hasActiveSubscription || canPurchase) && (
							<>
								<TouchableOpacity accessibilityRole="button" onPress={handleGoToBooths} hitSlop={8}>
									<ThemedText
										style={[styles.footerLink, { color: textSecondary }]}
									>
										Set up later
									</ThemedText>
								</TouchableOpacity>
								<ThemedText style={{ color: textSecondary }}>·</ThemedText>
							</>
						)}
						<TouchableOpacity accessibilityRole="button" onPress={handleAddAnother} hitSlop={8}>
							<ThemedText style={[styles.footerLink, { color: BRAND_COLOR }]}>
								Add another booth
							</ThemedText>
						</TouchableOpacity>
					</View>
				</View>
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
							After creating the booth, activate it by scanning the QR code on
							your physical photobooth&apos;s screen.
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
		fontSize: scaleFont(24),
		fontWeight: "bold",
	},
	subtitle: {
		fontSize: scaleFont(14),
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
		fontSize: scaleFont(28),
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: Spacing.xs,
	},
	successSubtitle: {
		fontSize: scaleFont(16),
		textAlign: "center",
		marginBottom: Spacing.xl,
	},
	errorBanner: {
		backgroundColor: "rgba(255, 82, 82, 0.15)",
		borderRadius: 8,
		padding: Spacing.md,
		marginBottom: Spacing.md,
	},
	errorText: {
		color: "#FF5252",
		fontSize: scaleFont(14),
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
		fontSize: scaleFont(13),
		lineHeight: 18,
	},
	// Next Steps card
	timelineCard: {
		width: "100%",
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		padding: Spacing.lg,
		marginTop: Spacing.lg,
	},
	stepRow: {
		flexDirection: "row",
		alignItems: "stretch",
		gap: Spacing.sm,
	},
	stepRail: {
		alignItems: "center",
		width: 28,
	},
	stepBadge: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	stepBadgeUpcoming: {
		borderWidth: 1.5,
		backgroundColor: "transparent",
	},
	stepBadgeText: {
		fontSize: scaleFont(14),
		fontWeight: "700",
	},
	stepConnector: {
		width: 2,
		flex: 1,
		minHeight: 16,
		borderRadius: 1,
		marginVertical: 4,
	},
	stepTextWrap: {
		flex: 1,
		gap: 2,
		paddingBottom: Spacing.md,
	},
	stepTitle: {
		fontSize: scaleFont(15),
		lineHeight: scaleFont(22),
	},
	stepSub: {
		fontSize: scaleFont(13),
		lineHeight: scaleFont(19),
	},
	successFooter: {
		paddingHorizontal: Spacing.lg,
		paddingTop: Spacing.sm,
		paddingBottom: Spacing.md,
		gap: Spacing.md,
	},
	footerLinks: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.sm,
	},
	footerLink: {
		fontSize: scaleFont(14),
		fontWeight: "600",
	},
});
