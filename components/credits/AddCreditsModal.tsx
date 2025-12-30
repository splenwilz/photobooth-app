/**
 * AddCreditsModal Component
 *
 * Bottom sheet modal for admin to add credits to booth.
 * Card-based selection with radio buttons.
 * 1 credit = $1
 *
 * @see app/(tabs)/settings.tsx - Used in Settings screen
 * @see POST /api/v1/booths/{booth_id}/credits - API endpoint
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
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { QUICK_CREDIT_AMOUNTS } from "@/constants/demo-data";
import { useAddCredits } from "@/api/credits";

interface AddCreditsModalProps {
	/** Whether the modal is visible */
	visible: boolean;
	/** Booth ID to add credits to (required for API) */
	boothId: string | null;
	/** Callback when modal is closed */
	onClose: () => void;
	/** Callback when credits are successfully added */
	onSuccess?: (credits: number) => void;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

/**
 * AddCreditsModal - Bottom sheet for admin to add credits
 */
export function AddCreditsModal({
	visible,
	boothId,
	onClose,
	onSuccess,
}: AddCreditsModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");

	// API mutation for adding credits
	const addCreditsMutation = useAddCredits();
	
	// Get safe area insets
	const insets = useSafeAreaInsets();
	
	// Ref for scrolling to input
	const scrollViewRef = useRef<ScrollView>(null);
	const customInputRef = useRef<TextInputType>(null);

	const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
	const [customAmount, setCustomAmount] = useState("");
	const [isCustom, setIsCustom] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	// Listen for keyboard show/hide
	useEffect(() => {
		const keyboardWillShow = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
			(e) => {
				setKeyboardHeight(e.endCoordinates.height);
				// Scroll to bottom when keyboard shows
				setTimeout(() => {
					scrollViewRef.current?.scrollToEnd({ animated: true });
				}, 100);
			}
		);
		const keyboardWillHide = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
			() => {
				setKeyboardHeight(0);
			}
		);

		return () => {
			keyboardWillShow.remove();
			keyboardWillHide.remove();
		};
	}, []);

	// Get the final amount to add
	const getAmount = (): number => {
		if (isCustom && customAmount) {
			const parsed = parseInt(customAmount, 10);
			return isNaN(parsed) ? 0 : parsed;
		}
		return selectedAmount ?? 0;
	};

	const amount = getAmount();
	const isValid = amount > 0;

	const handleSelectAmount = (value: number) => {
		Keyboard.dismiss();
		setSelectedAmount(value);
		setIsCustom(false);
		setCustomAmount("");
	};

	const handleCustomPress = () => {
		setIsCustom(true);
		setSelectedAmount(null);
		setTimeout(() => {
			customInputRef.current?.focus();
		}, 100);
	};

	const handleAddCredits = async () => {
		if (!isValid || !boothId) return;
		
		Keyboard.dismiss();
		setIsProcessing(true);

		try {
			// Call API to add credits
			await addCreditsMutation.mutateAsync({
				boothId,
				amount,
				reason: `Added ${amount} credits via mobile app`,
			});

			setIsProcessing(false);
			onSuccess?.(amount);
			handleClose();
		} catch (error) {
			setIsProcessing(false);
			// Error handling done by parent component via onSuccess not being called
			console.error("[AddCreditsModal] Failed to add credits:", error);
		}
	};

	const handleClose = () => {
		if (!isProcessing) {
			Keyboard.dismiss();
			onClose();
			setSelectedAmount(null);
			setCustomAmount("");
			setIsCustom(false);
		}
	};

	// Calculate bottom padding based on keyboard
	const bottomPadding = keyboardHeight > 0 
		? keyboardHeight 
		: Math.max(insets.bottom, Spacing.lg);

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
							<ThemedText type="subtitle">Add Credits</ThemedText>
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
							Select amount to add to your booth
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
						{/* Credit Amount Cards */}
						<View style={styles.cards}>
							{QUICK_CREDIT_AMOUNTS.map((value) => {
								const isSelected = selectedAmount === value && !isCustom;
								return (
									<TouchableOpacity
										key={value}
										style={[
											styles.card,
											{
												backgroundColor: cardBg,
												borderColor: isSelected ? BRAND_COLOR : borderColor,
												borderWidth: isSelected ? 2 : 1,
											},
										]}
										onPress={() => handleSelectAmount(value)}
										disabled={isProcessing}
										activeOpacity={0.7}
									>
										<View style={styles.cardContent}>
											<View style={styles.cardLeft}>
												<ThemedText type="subtitle" style={styles.credits}>
													{value.toLocaleString()}
												</ThemedText>
												<ThemedText
													style={[styles.creditsLabel, { color: textSecondary }]}
												>
													credits
												</ThemedText>
											</View>
											<ThemedText
												style={[styles.dollarValue, { color: BRAND_COLOR }]}
											>
												${value.toLocaleString()}
											</ThemedText>
										</View>

										{/* Radio Button */}
										<View
											style={[
												styles.radioOuter,
												{
													borderColor: isSelected ? BRAND_COLOR : borderColor,
												},
											]}
										>
											{isSelected && (
												<View
													style={[
														styles.radioInner,
														{ backgroundColor: BRAND_COLOR },
													]}
												/>
											)}
										</View>
									</TouchableOpacity>
								);
							})}

							{/* Custom Amount Card */}
							<TouchableOpacity
								style={[
									styles.card,
									{
										backgroundColor: cardBg,
										borderColor: isCustom ? BRAND_COLOR : borderColor,
										borderWidth: isCustom ? 2 : 1,
									},
								]}
								onPress={handleCustomPress}
								disabled={isProcessing}
								activeOpacity={0.7}
							>
								<View style={styles.cardContent}>
									<View style={styles.customInputWrapper}>
										<TextInput
											ref={customInputRef}
											style={[styles.customInput, { color: textColor }]}
											value={customAmount}
											onChangeText={setCustomAmount}
											onFocus={() => {
												setIsCustom(true);
												setSelectedAmount(null);
												// Scroll to show input
												setTimeout(() => {
													scrollViewRef.current?.scrollToEnd({ animated: true });
												}, 100);
											}}
											placeholder="Custom amount"
											placeholderTextColor={textSecondary}
											keyboardType="number-pad"
											editable={!isProcessing}
											maxLength={7}
											returnKeyType="done"
											onSubmitEditing={Keyboard.dismiss}
										/>
										{isCustom && customAmount && (
											<ThemedText
												style={[styles.customDollar, { color: BRAND_COLOR }]}
											>
												${parseInt(customAmount, 10).toLocaleString() || 0}
											</ThemedText>
										)}
									</View>
								</View>

								{/* Radio Button */}
								<View
									style={[
										styles.radioOuter,
										{
											borderColor: isCustom ? BRAND_COLOR : borderColor,
										},
									]}
								>
									{isCustom && (
										<View
											style={[
												styles.radioInner,
												{ backgroundColor: BRAND_COLOR },
											]}
										/>
									)}
								</View>
							</TouchableOpacity>
						</View>

						{/* Add Button inside scroll for keyboard visibility */}
						<View style={styles.buttonContainer}>
							<TouchableOpacity
								style={[
									styles.addButton,
									{
										backgroundColor: isValid ? BRAND_COLOR : borderColor,
										opacity: isValid && !isProcessing ? 1 : 0.6,
									},
								]}
								onPress={handleAddCredits}
								disabled={!isValid || isProcessing}
								activeOpacity={0.8}
							>
								{isProcessing ? (
									<ActivityIndicator color="white" />
								) : (
									<ThemedText style={styles.addButtonText}>
										{isValid
											? `Add ${amount.toLocaleString()} Credits`
											: "Select an Amount"}
									</ThemedText>
								)}
							</TouchableOpacity>

							{/* Footer Note */}
							<ThemedText style={[styles.footerNote, { color: textSecondary }]}>
								1 credit = $1 • Credits are used for booth transactions
							</ThemedText>
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
	cards: {
		gap: Spacing.sm,
	},
	card: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
	},
	cardContent: {
		flex: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	cardLeft: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: Spacing.xs,
	},
	credits: {
		fontSize: 22,
	},
	creditsLabel: {
		fontSize: 14,
	},
	dollarValue: {
		fontSize: 16,
		fontWeight: "600",
	},
	customInputWrapper: {
		flex: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	customInput: {
		flex: 1,
		fontSize: 16,
		fontWeight: "500",
	},
	customDollar: {
		fontSize: 16,
		fontWeight: "600",
	},
	radioOuter: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 2,
		justifyContent: "center",
		alignItems: "center",
		marginLeft: Spacing.md,
	},
	radioInner: {
		width: 12,
		height: 12,
		borderRadius: 6,
	},
	buttonContainer: {
		marginTop: Spacing.lg,
	},
	addButton: {
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 50,
	},
	addButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
	footerNote: {
		fontSize: 12,
		textAlign: "center",
		marginTop: Spacing.md,
	},
});
