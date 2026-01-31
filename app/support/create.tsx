/**
 * Create Support Ticket Screen
 *
 * Form for creating a new support ticket.
 * Supports optional booth selection and priority level.
 *
 * @see /api/tickets/queries.ts - useCreateTicket
 */

import { router } from "expo-router";
import React, { useState } from "react";
import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBoothOverview } from "@/api/booths";
import { useCreateTicket } from "@/api/tickets";
import type { TicketPriority } from "@/api/tickets/types";
import { CreateTicketRequestSchema } from "@/api/tickets/types";
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

/**
 * Priority options
 */
const PRIORITY_OPTIONS: {
	value: TicketPriority;
	label: string;
	description: string;
	color: string;
}[] = [
	{
		value: "low",
		label: "Low",
		description: "General questions",
		color: StatusColors.neutral,
	},
	{
		value: "medium",
		label: "Medium",
		description: "Non-urgent issues",
		color: BRAND_COLOR,
	},
	{
		value: "high",
		label: "High",
		description: "Service affected",
		color: StatusColors.warning,
	},
	{
		value: "critical",
		label: "Critical",
		description: "Booth down",
		color: StatusColors.error,
	},
];

interface FormData {
	subject: string;
	message: string;
	priority: TicketPriority;
	booth_id: string | null;
}

interface FormErrors {
	subject?: string;
	message?: string;
}

export default function CreateTicketScreen() {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");

	// Form state
	const [formData, setFormData] = useState<FormData>({
		subject: "",
		message: "",
		priority: "medium",
		booth_id: null,
	});
	const [errors, setErrors] = useState<FormErrors>({});

	// API hooks
	const { mutate: createTicket, isPending, error: apiError } = useCreateTicket();
	const { data: boothsData } = useBoothOverview();

	// Navigation
	const handleBack = () => {
		router.back();
	};

	// Update form field
	const updateField = <K extends keyof FormData>(
		field: K,
		value: FormData[K],
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field as keyof FormErrors]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	// Validate form using Zod schema
	const validateForm = (): boolean => {
		const result = CreateTicketRequestSchema.safeParse({
			subject: formData.subject,
			message: formData.message,
			priority: formData.priority,
			booth_id: formData.booth_id ?? undefined,
		});

		if (!result.success) {
			const newErrors: FormErrors = {};
			for (const error of result.error.errors) {
				const field = error.path[0] as keyof FormErrors;
				if (field === "subject" || field === "message") {
					newErrors[field] = error.message;
				}
			}
			setErrors(newErrors);
			return false;
		}

		return true;
	};

	// Handle form submission
	const handleSubmit = () => {
		if (!validateForm()) return;

		createTicket(
			{
				subject: formData.subject,
				message: formData.message,
				priority: formData.priority,
				booth_id: formData.booth_id ?? undefined,
			},
			{
				onSuccess: (ticket) => {
					Alert.alert(
						"Ticket Created",
						`Your ticket ${ticket.ticket_number} has been submitted. Our support team will respond shortly.`,
						[
							{
								text: "View Ticket",
								onPress: () => router.replace(`/support/${ticket.id}`),
							},
							{
								text: "OK",
								onPress: () => router.back(),
							},
						],
					);
				},
				onError: (error) => {
					console.error("[CreateTicket] Error:", error);
				},
			},
		);
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor }]}>
			<KeyboardAvoidingView
				style={styles.keyboardView}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity onPress={handleBack} style={styles.backButton}>
						<IconSymbol name="chevron.left" size={24} color={BRAND_COLOR} />
					</TouchableOpacity>
					<View style={styles.headerTextContainer}>
						<ThemedText type="title" style={styles.title}>
							New Ticket
						</ThemedText>
						<ThemedText style={[styles.subtitle, { color: textSecondary }]}>
							Describe your issue or question
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
								{apiError.message || "Failed to create ticket. Please try again."}
							</ThemedText>
						</View>
					)}

					{/* Subject Input */}
					<FormInput
						label="Subject"
						placeholder="Brief description of your issue"
						icon="text.alignleft"
						value={formData.subject}
						onChangeText={(value) => updateField("subject", value)}
						error={errors.subject}
						maxLength={200}
					/>

					{/* Message Input */}
					<View style={styles.textAreaContainer}>
						<ThemedText style={[styles.label, { color: textSecondary }]}>
							Message
						</ThemedText>
						<View
							style={[
								styles.textArea,
								{
									backgroundColor: cardBg,
									borderColor: errors.message ? StatusColors.error : borderColor,
								},
							]}
						>
							<TextInput
								style={[styles.textAreaInput, { color: textColor }]}
								placeholder="Describe your issue in detail..."
								placeholderTextColor={textSecondary}
								value={formData.message}
								onChangeText={(value) => updateField("message", value)}
								multiline
								numberOfLines={6}
								textAlignVertical="top"
							/>
						</View>
						{errors.message && (
							<ThemedText style={[styles.errorMessage, { color: StatusColors.error }]}>
								{errors.message}
							</ThemedText>
						)}
					</View>

					{/* Priority Selection */}
					<View style={styles.section}>
						<ThemedText style={[styles.label, { color: textSecondary }]}>
							Priority
						</ThemedText>
						<View style={styles.priorityGrid}>
							{PRIORITY_OPTIONS.map((option) => {
								const isSelected = formData.priority === option.value;
								return (
									<TouchableOpacity
										key={option.value}
										style={[
											styles.priorityOption,
											{
												backgroundColor: isSelected
													? withAlpha(option.color, 0.15)
													: cardBg,
												borderColor: isSelected ? option.color : borderColor,
											},
										]}
										onPress={() => updateField("priority", option.value)}
									>
										<View
											style={[
												styles.priorityDot,
												{ backgroundColor: option.color },
											]}
										/>
										<View style={styles.priorityContent}>
											<ThemedText
												type="defaultSemiBold"
												style={styles.priorityLabel}
											>
												{option.label}
											</ThemedText>
											<ThemedText
												style={[
													styles.priorityDescription,
													{ color: textSecondary },
												]}
											>
												{option.description}
											</ThemedText>
										</View>
										{isSelected && (
											<IconSymbol
												name="checkmark.circle.fill"
												size={20}
												color={option.color}
											/>
										)}
									</TouchableOpacity>
								);
							})}
						</View>
					</View>

					{/* Booth Selection (Optional) */}
					{boothsData?.booths && boothsData.booths.length > 0 && (
						<View style={styles.section}>
							<ThemedText style={[styles.label, { color: textSecondary }]}>
								Related Booth (Optional)
							</ThemedText>
							<View style={styles.boothGrid}>
								{/* No booth option */}
								<TouchableOpacity
									style={[
										styles.boothOption,
										{
											backgroundColor:
												formData.booth_id === null
													? withAlpha(BRAND_COLOR, 0.15)
													: cardBg,
											borderColor:
												formData.booth_id === null ? BRAND_COLOR : borderColor,
										},
									]}
									onPress={() => updateField("booth_id", null)}
								>
									<IconSymbol
										name="questionmark.circle"
										size={20}
										color={formData.booth_id === null ? BRAND_COLOR : textSecondary}
									/>
									<ThemedText
										style={[
											styles.boothName,
											{
												color:
													formData.booth_id === null ? BRAND_COLOR : textColor,
											},
										]}
									>
										General Question
									</ThemedText>
								</TouchableOpacity>

								{/* Booth options */}
								{boothsData.booths.map((booth) => {
									const isSelected = formData.booth_id === booth.booth_id;
									return (
										<TouchableOpacity
											key={booth.booth_id}
											style={[
												styles.boothOption,
												{
													backgroundColor: isSelected
														? withAlpha(BRAND_COLOR, 0.15)
														: cardBg,
													borderColor: isSelected ? BRAND_COLOR : borderColor,
												},
											]}
											onPress={() => updateField("booth_id", booth.booth_id)}
										>
											<IconSymbol
												name="photo.stack"
												size={20}
												color={isSelected ? BRAND_COLOR : textSecondary}
											/>
											<ThemedText
												style={[
													styles.boothName,
													{ color: isSelected ? BRAND_COLOR : textColor },
												]}
												numberOfLines={1}
											>
												{booth.booth_name}
											</ThemedText>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>
					)}

					{/* Submit Button */}
					<View style={styles.buttonSection}>
						<PrimaryButton
							text="Submit Ticket"
							onPress={handleSubmit}
							isLoading={isPending}
						/>
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
							Our support team typically responds within 24 hours. For critical
							issues affecting your booth operation, please mark the priority as
							Critical.
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
	errorBanner: {
		backgroundColor: "rgba(255, 82, 82, 0.15)",
		borderRadius: BorderRadius.md,
		padding: Spacing.md,
		marginBottom: Spacing.md,
	},
	errorText: {
		color: StatusColors.error,
		fontSize: 14,
		textAlign: "center",
	},
	section: {
		marginBottom: Spacing.lg,
	},
	label: {
		fontSize: 14,
		fontWeight: "500",
		marginBottom: Spacing.xs,
	},
	textAreaContainer: {
		marginBottom: Spacing.md,
	},
	textArea: {
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		padding: Spacing.md,
		minHeight: 140,
	},
	textAreaInput: {
		fontSize: 16,
		lineHeight: 22,
	},
	errorMessage: {
		fontSize: 12,
		marginTop: Spacing.xs,
	},
	priorityGrid: {
		gap: Spacing.xs,
	},
	priorityOption: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.sm,
	},
	priorityDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	priorityContent: {
		flex: 1,
	},
	priorityLabel: {
		fontSize: 14,
	},
	priorityDescription: {
		fontSize: 12,
		marginTop: 2,
	},
	boothGrid: {
		gap: Spacing.xs,
	},
	boothOption: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.sm,
	},
	boothName: {
		flex: 1,
		fontSize: 14,
	},
	buttonSection: {
		marginTop: Spacing.lg,
		marginBottom: Spacing.lg,
	},
	infoCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.sm,
	},
	infoText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
	},
});
