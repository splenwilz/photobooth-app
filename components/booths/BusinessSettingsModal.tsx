/**
 * BusinessSettingsModal Component
 *
 * Bottom sheet modal for managing business branding settings.
 *
 * Architecture: Account vs Booth level
 * - Business Name: Account-level (PUT /users/{id}) — shared across all booths
 * - Logo: Account-level default, with optional per-booth override
 * - Address, Show Logo on Prints: Booth-level (PUT /booths/{id})
 *
 * @see app/(tabs)/settings.tsx - Used in Settings screen
 */

import React, { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Keyboard,
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

import {
	useBoothBusinessSettings,
	useUpdateBoothSettings,
} from "@/api/booths";
import {
	useUpdateBusinessName,
	useUserProfile,
} from "@/api/users";
import { saveUser, getStoredUser } from "@/api/client";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface BusinessSettingsModalProps {
	visible: boolean;
	boothId: string | null;
	userId: string;
	/** Current booth name for editing (from booth detail) */
	boothName?: string;
	onClose: () => void;
}

export function BusinessSettingsModal({
	visible,
	boothId,
	userId,
	boothName: initialBoothName,
	onClose,
}: BusinessSettingsModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");
	const insets = useSafeAreaInsets();
	const { height: screenHeight } = useWindowDimensions();

	// ── Queries ──────────────────────────────────────────────────────────
	const { data: userProfile } = useUserProfile(visible ? userId : null);
	const { data: boothSettings, isFetching: isBoothSettingsFetching } =
		useBoothBusinessSettings(visible ? boothId : null);

	// ── Mutations ────────────────────────────────────────────────────────
	const updateBusinessNameMutation = useUpdateBusinessName();
	const updateBoothSettingsMutation = useUpdateBoothSettings();

	// ── Form State ───────────────────────────────────────────────────────
	const [businessName, setBusinessName] = useState("");
	const [boothName, setBoothName] = useState("");
	const [address, setAddress] = useState("");
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	// ── Populate form on modal open (once fresh data is available) ───────
	const hasPopulated = useRef(false);
	useEffect(() => {
		if (!visible) {
			hasPopulated.current = false;
			return;
		}
		if (hasPopulated.current) return;
		if (isBoothSettingsFetching) return; // Wait for fresh data, not stale cache

		// Wait for data before populating
		const hasUserData = !!userProfile;
		const hasBoothData = !boothId || !!boothSettings;
		if (!hasUserData || !hasBoothData) return;

		setBusinessName(userProfile?.business_name ?? "");
		setBoothName(initialBoothName ?? "");
		setAddress(boothSettings?.address ?? "");
		hasPopulated.current = true;
	}, [visible, userProfile, boothSettings, boothId, isBoothSettingsFetching, initialBoothName]);

	// ── Keyboard handling ────────────────────────────────────────────────
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

	// ── Change detection ─────────────────────────────────────────────────
	const hasBusinessNameChange =
		businessName !== (userProfile?.business_name ?? "");
	const hasBoothNameChange =
		boothId != null && boothName.trim() !== (initialBoothName ?? "").trim();
	const hasAddressChange =
		boothId != null && address.trim() !== (boothSettings?.address ?? "").trim();

	const isProcessing =
		updateBusinessNameMutation.isPending ||
		updateBoothSettingsMutation.isPending;

	// ── Handlers ─────────────────────────────────────────────────────────

	const handleClose = () => {
		if (!isProcessing) {
			Keyboard.dismiss();
			onClose();
		}
	};

	const hasBoothSettingsChange = hasBoothNameChange || hasAddressChange;

	const hasAnyChange = hasBusinessNameChange || hasBoothSettingsChange;

	const handleSave = async () => {
		if (!hasAnyChange) return;
		Keyboard.dismiss();

		// Validate booth name if changed
		if (hasBoothNameChange && !boothName.trim()) {
			Alert.alert("Validation Error", "Booth name cannot be empty.");
			return;
		}

		const errors: string[] = [];

		// Fire both API calls in parallel when both have changes
		const promises: Promise<void>[] = [];

		if (hasBusinessNameChange && userId) {
			promises.push(
				updateBusinessNameMutation
					.mutateAsync({ userId, business_name: businessName })
					.then(async () => {
						try {
							const stored = await getStoredUser();
							if (stored) {
								await saveUser({ ...stored, business_name: businessName });
							}
						} catch (e) {
							console.error("[BusinessSettings] SecureStore sync failed:", e);
						}
					})
					.catch((error: any) => {
						errors.push(error.message || "Failed to save business name.");
					}),
			);
		}

		if (hasBoothSettingsChange && boothId) {
			promises.push(
				updateBoothSettingsMutation
					.mutateAsync({
						boothId,
						...(hasBoothNameChange ? { name: boothName.trim() } : {}),
						...(hasAddressChange ? { address: address.trim() } : {}),
					})
					.then(() => {})
					.catch((error: any) => {
						errors.push(error.message || "Failed to save booth settings.");
					}),
			);
		}

		await Promise.all(promises);

		if (errors.length > 0) {
			Alert.alert("Error", errors.join("\n"));
		} else {
			Alert.alert("Saved", "Settings have been updated.");
		}
	};

	const bottomPadding =
		keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, Spacing.lg);

	// ── Main Render ──────────────────────────────────────────────────────

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
							maxHeight: screenHeight * 0.9,
						},
					]}
				>
					{/* Header */}
					<View style={styles.header}>
						<View style={[styles.handle, { backgroundColor: borderColor }]} />
						<View style={styles.headerRow}>
							<ThemedText type="subtitle">Business Settings</ThemedText>
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

					{/* Scrollable Content */}
					<ScrollView
						style={styles.scrollContent}
						contentContainerStyle={styles.scrollContentContainer}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						bounces
					>
						{/* ── Business Name (Account-level) ───────────── */}
						<View style={styles.fieldContainer}>
							<ThemedText
								style={[styles.fieldLabel, { color: textSecondary }]}
							>
								Business Name
							</ThemedText>
							<View
								style={[
									styles.inputContainer,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<IconSymbol
									name="building.2"
									size={20}
									color={textSecondary}
									style={styles.inputIcon}
								/>
								<TextInput
									style={[styles.input, { color: textColor }]}
									value={businessName}
									onChangeText={setBusinessName}
									placeholder="Enter business name"
									placeholderTextColor={textSecondary}
									maxLength={255}
									editable={!updateBusinessNameMutation.isPending}
								/>
							</View>
							<ThemedText
								style={[styles.fieldHint, { color: textSecondary }]}
							>
								Applies to all your booths
							</ThemedText>
						</View>

						{/* ── Booth-level fields ──────────────────────── */}
						{boothId && (
							<>
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
											value={boothName}
											onChangeText={setBoothName}
											placeholder="Enter booth name"
											placeholderTextColor={textSecondary}
											maxLength={100}
											editable={!updateBoothSettingsMutation.isPending}
										/>
									</View>
									<ThemedText
										style={[styles.fieldHint, { color: textSecondary }]}
									>
										This booth only
									</ThemedText>
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
											placeholder="Enter business address"
											placeholderTextColor={textSecondary}
											maxLength={500}
											editable={!updateBoothSettingsMutation.isPending}
										/>
									</View>
									<ThemedText
										style={[styles.fieldHint, { color: textSecondary }]}
									>
										This booth only
									</ThemedText>
								</View>


								</>
						)}

						{/* Unified save button */}
						{hasPopulated.current && hasAnyChange && (
							<TouchableOpacity
								style={[
									styles.saveFieldButton,
									{ backgroundColor: BRAND_COLOR },
								]}
								onPress={handleSave}
								disabled={isProcessing}
							>
								{isProcessing ? (
									<ActivityIndicator color="white" size="small" />
								) : (
									<ThemedText style={styles.saveFieldButtonText}>
										Save Changes
									</ThemedText>
								)}
							</TouchableOpacity>
						)}
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
	// Form Fields
	fieldContainer: {
		marginBottom: Spacing.md,
	},
	fieldLabel: {
		fontSize: 13,
		fontWeight: "500",
		marginBottom: Spacing.xs,
	},
	fieldHint: {
		fontSize: 11,
		marginTop: 4,
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.md,
		paddingVertical: Platform.OS === "ios" ? Spacing.md : Spacing.sm,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	inputIcon: {
		marginRight: Spacing.sm,
	},
	input: {
		flex: 1,
		fontSize: 16,
	},
	// Save buttons
	saveFieldButton: {
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		alignItems: "center",
		justifyContent: "center",
		marginTop: Spacing.sm,
		minHeight: 40,
	},
	saveFieldButtonText: {
		color: "white",
		fontSize: 14,
		fontWeight: "600",
	},
});
