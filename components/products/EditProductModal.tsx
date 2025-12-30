/**
 * EditProductModal Component
 *
 * Bottom sheet modal for editing product pricing.
 * Allows changing base price, extra copy price, and enable/disable.
 * Uses PUT /api/v1/booths/{booth_id}/pricing API.
 *
 * @see app/(tabs)/settings.tsx - Used in Settings screen
 * @see api/booths/types.ts - UpdatePricingRequest
 */

import { useUpdatePricing } from "@/api/booths";
import type { UpdatePricingRequest } from "@/api/booths/types";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { Product } from "@/types/photobooth";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Keyboard,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Switch,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface EditProductModalProps {
	/** Whether the modal is visible */
	visible: boolean;
	/** Booth ID for API calls */
	boothId: string | null;
	/** Product to edit (null when creating new) */
	product: Product | null;
	/** Callback when modal is closed */
	onClose: () => void;
	/** Callback when product is saved successfully */
	onSave?: (product: Product) => void;
}

/**
 * Map product ID to API pricing field names
 * Product IDs match API keys: PhotoStrips, Photo4x6, SmartphonePrint
 * @see PATCH /api/v1/booths/{booth_id}/pricing
 */
function buildPricingRequest(
	productId: string,
	basePrice: number,
	extraCopyPrice: number,
): UpdatePricingRequest {
	switch (productId) {
		case "PhotoStrips":
			return {
				photo_strips_price: basePrice,
				strips_extra_copy_price: extraCopyPrice,
			};
		case "Photo4x6":
			return {
				photo_4x6_price: basePrice,
				photo_4x6_extra_copy_price: extraCopyPrice,
			};
		case "SmartphonePrint":
			return {
				smartphone_print_price: basePrice,
				smartphone_extra_copy_price: extraCopyPrice,
			};
		default:
			console.warn(`[EditProductModal] Unknown product ID: ${productId}`);
			return {};
	}
}

/**
 * EditProductModal - Bottom sheet for editing product pricing
 */
export function EditProductModal({
	visible,
	boothId,
	product,
	onClose,
	onSave,
}: EditProductModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");

	// Get safe area insets
	const insets = useSafeAreaInsets();

	// API mutation for updating pricing
	const updatePricingMutation = useUpdatePricing();

	// Form state
	const [basePrice, setBasePrice] = useState("");
	const [extraCopyPrice, setExtraCopyPrice] = useState("");
	const [enabled, setEnabled] = useState(true);
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	// Initialize form when product changes
	useEffect(() => {
		if (product) {
			setBasePrice(product.basePrice.toString());
			setExtraCopyPrice(product.extraCopyPrice.toString());
			setEnabled(product.enabled);
		}
	}, [product]);

	// Listen for keyboard
	useEffect(() => {
		const keyboardWillShow = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
			(e) => setKeyboardHeight(e.endCoordinates.height),
		);
		const keyboardWillHide = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
			() => setKeyboardHeight(0),
		);

		return () => {
			keyboardWillShow.remove();
			keyboardWillHide.remove();
		};
	}, []);

	// Validation
	const basePriceNum = parseFloat(basePrice) || 0;
	const extraCopyPriceNum = parseFloat(extraCopyPrice) || 0;
	const isValid = basePriceNum > 0 && !!boothId;
	const isProcessing = updatePricingMutation.isPending;

	const handleSave = async () => {
		if (!isValid || !product || !boothId) return;

		Keyboard.dismiss();

		// Build pricing request for this specific product
		const pricingRequest = buildPricingRequest(
			product.id,
			basePriceNum,
			extraCopyPriceNum,
		);

		// Add reason for the update
		pricingRequest.reason = `Updated ${product.name} pricing via mobile app`;

		try {
			await updatePricingMutation.mutateAsync({
				boothId,
				...pricingRequest,
			});

			const updatedProduct: Product = {
				...product,
				basePrice: basePriceNum,
				extraCopyPrice: extraCopyPriceNum,
				enabled,
			};

			Alert.alert(
				"Pricing Updated",
				`${product.name} pricing has been sent to the booth.`,
				[{ text: "OK" }],
			);

			onSave?.(updatedProduct);
			handleClose();
		} catch (error) {
			console.error("[EditProductModal] Failed to update pricing:", error);
			Alert.alert(
				"Update Failed",
				"Failed to update pricing. Please try again.",
				[{ text: "OK" }],
			);
		}
	};

	const handleClose = () => {
		if (!isProcessing) {
			Keyboard.dismiss();
			onClose();
		}
	};

	// Calculate bottom padding
	const bottomPadding =
		keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, Spacing.lg);

	if (!product) return null;

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
						},
					]}
				>
					{/* Header */}
					<View style={styles.header}>
						<View style={styles.handle} />
						<View style={styles.headerRow}>
							<ThemedText type="subtitle">Edit Product</ThemedText>
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

					<ScrollView
						style={styles.scrollContent}
						contentContainerStyle={styles.scrollContentContainer}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
					>
						{/* Product Info */}
						<View
							style={[
								styles.productCard,
								{ backgroundColor: withAlpha(BRAND_COLOR, 0.1) },
							]}
						>
							<View
								style={[
									styles.productIcon,
									{ backgroundColor: withAlpha(BRAND_COLOR, 0.2) },
								]}
							>
								<IconSymbol name="photo" size={24} color={BRAND_COLOR} />
							</View>
							<View style={styles.productInfo}>
								<ThemedText type="defaultSemiBold">{product.name}</ThemedText>
								<ThemedText
									style={[styles.productDesc, { color: textSecondary }]}
								>
									{product.description}
								</ThemedText>
							</View>
						</View>

						{/* Base Price Input */}
						<View style={styles.inputGroup}>
							<ThemedText style={[styles.inputLabel, { color: textSecondary }]}>
								Base Price (per print)
							</ThemedText>
							<View
								style={[
									styles.inputContainer,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<ThemedText style={styles.currencyPrefix}>$</ThemedText>
								<TextInput
									style={[styles.input, { color: textColor }]}
									value={basePrice}
									onChangeText={setBasePrice}
									placeholder="0.00"
									placeholderTextColor={textSecondary}
									keyboardType="decimal-pad"
									editable={!isProcessing}
									returnKeyType="next"
								/>
							</View>
						</View>

						{/* Extra Copy Price Input */}
						<View style={styles.inputGroup}>
							<ThemedText style={[styles.inputLabel, { color: textSecondary }]}>
								Extra Copy Price
							</ThemedText>
							<View
								style={[
									styles.inputContainer,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<ThemedText style={styles.currencyPrefix}>$</ThemedText>
								<TextInput
									style={[styles.input, { color: textColor }]}
									value={extraCopyPrice}
									onChangeText={setExtraCopyPrice}
									placeholder="0.00"
									placeholderTextColor={textSecondary}
									keyboardType="decimal-pad"
									editable={!isProcessing}
									returnKeyType="done"
									onSubmitEditing={Keyboard.dismiss}
								/>
							</View>
							<ThemedText style={[styles.inputHint, { color: textSecondary }]}>
								Price for additional copies of the same photo
							</ThemedText>
						</View>

						{/* Enabled Toggle */}
						<View
							style={[
								styles.toggleCard,
								{ backgroundColor: cardBg, borderColor },
							]}
						>
							<View style={styles.toggleContent}>
								<ThemedText type="defaultSemiBold">Product Enabled</ThemedText>
								<ThemedText
									style={[styles.toggleDesc, { color: textSecondary }]}
								>
									{enabled
										? "Customers can purchase this product"
										: "Product is hidden from customers"}
								</ThemedText>
							</View>
							<Switch
								value={enabled}
								onValueChange={setEnabled}
								trackColor={{ false: borderColor, true: BRAND_COLOR }}
								thumbColor="white"
								disabled={isProcessing}
							/>
						</View>

						{/* Price Preview */}
						{isValid && (
							<View
								style={[
									styles.previewCard,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<ThemedText
									style={[styles.previewTitle, { color: textSecondary }]}
								>
									PRICING SUMMARY
								</ThemedText>
								<View style={styles.previewRow}>
									<ThemedText>1 print</ThemedText>
									<ThemedText
										type="defaultSemiBold"
										style={{ color: BRAND_COLOR }}
									>
										${basePriceNum.toFixed(2)}
									</ThemedText>
								</View>
								<View style={styles.previewRow}>
									<ThemedText>2 prints</ThemedText>
									<ThemedText
										type="defaultSemiBold"
										style={{ color: BRAND_COLOR }}
									>
										${(basePriceNum + extraCopyPriceNum).toFixed(2)}
									</ThemedText>
								</View>
								<View style={styles.previewRow}>
									<ThemedText>3 prints</ThemedText>
									<ThemedText
										type="defaultSemiBold"
										style={{ color: BRAND_COLOR }}
									>
										${(basePriceNum + extraCopyPriceNum * 2).toFixed(2)}
									</ThemedText>
								</View>
							</View>
						)}

						{/* Save Button */}
						<TouchableOpacity
							style={[
								styles.saveButton,
								{
									backgroundColor: isValid ? BRAND_COLOR : borderColor,
									opacity: isValid && !isProcessing ? 1 : 0.6,
								},
							]}
							onPress={handleSave}
							disabled={!isValid || isProcessing}
							activeOpacity={0.8}
						>
							{isProcessing ? (
								<ActivityIndicator color="white" />
							) : (
								<ThemedText style={styles.saveButtonText}>
									Save Changes
								</ThemedText>
							)}
						</TouchableOpacity>
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
		maxHeight: "90%",
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
	},
	scrollContent: {
		flexShrink: 1,
	},
	scrollContentContainer: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.md,
	},
	productCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		marginBottom: Spacing.lg,
		gap: Spacing.md,
	},
	productIcon: {
		width: 48,
		height: 48,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
	},
	productInfo: {
		flex: 1,
	},
	productDesc: {
		fontSize: 13,
		marginTop: 2,
	},
	inputGroup: {
		marginBottom: Spacing.lg,
	},
	inputLabel: {
		fontSize: 13,
		fontWeight: "500",
		marginBottom: Spacing.sm,
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		paddingHorizontal: Spacing.md,
		height: 50,
	},
	currencyPrefix: {
		fontSize: 18,
		fontWeight: "600",
		marginRight: Spacing.xs,
	},
	input: {
		flex: 1,
		fontSize: 18,
		fontWeight: "500",
	},
	inputHint: {
		fontSize: 12,
		marginTop: Spacing.xs,
	},
	toggleCard: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.lg,
	},
	toggleContent: {
		flex: 1,
		marginRight: Spacing.md,
	},
	toggleDesc: {
		fontSize: 12,
		marginTop: 2,
	},
	previewCard: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.lg,
	},
	previewTitle: {
		fontSize: 11,
		fontWeight: "600",
		letterSpacing: 0.5,
		marginBottom: Spacing.sm,
	},
	previewRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: Spacing.xs,
	},
	saveButton: {
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 50,
	},
	saveButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
});
