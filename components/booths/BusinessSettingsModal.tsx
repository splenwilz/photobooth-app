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

import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Image,
	Keyboard,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Switch,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	useBoothBusinessSettings,
	useDeleteBoothLogo,
	useUpdateBoothSettings,
	useUploadBoothLogo,
} from "@/api/booths";
import {
	useDeleteAccountLogo,
	useUpdateBusinessName,
	useUploadAccountLogo,
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
	const uploadAccountLogoMutation = useUploadAccountLogo();
	const deleteAccountLogoMutation = useDeleteAccountLogo();
	const uploadBoothLogoMutation = useUploadBoothLogo();
	const deleteBoothLogoMutation = useDeleteBoothLogo();

	// ── Form State ───────────────────────────────────────────────────────
	const [businessName, setBusinessName] = useState("");
	const [boothName, setBoothName] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [address, setAddress] = useState("");
	const [useDisplayNameOnBooths, setUseDisplayNameOnBooths] = useState(false);
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
		setDisplayName(boothSettings?.display_name ?? "");
		setAddress(boothSettings?.address ?? "");
		setUseDisplayNameOnBooths(boothSettings?.use_display_name_on_booths ?? userProfile?.use_display_name_on_booths ?? false);
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
	const hasDisplayNameChange =
		boothId != null && displayName.trim() !== (boothSettings?.display_name ?? "").trim();
	const hasAddressChange =
		boothId != null && address.trim() !== (boothSettings?.address ?? "").trim();
	const isProcessing =
		updateBusinessNameMutation.isPending ||
		updateBoothSettingsMutation.isPending;
	const isLogoProcessing =
		uploadAccountLogoMutation.isPending ||
		deleteAccountLogoMutation.isPending ||
		uploadBoothLogoMutation.isPending ||
		deleteBoothLogoMutation.isPending;

	// ── Handlers ─────────────────────────────────────────────────────────

	const handleClose = () => {
		if (!isProcessing) {
			Keyboard.dismiss();
			onClose();
		}
	};

	const handleToggleUseDisplayName = async (value: boolean) => {
		if (isProcessing) return;
		const previousValue = useDisplayNameOnBooths;
		setUseDisplayNameOnBooths(value);
		try {
			await updateBusinessNameMutation.mutateAsync({
				userId,
				use_display_name_on_booths: value,
			});
			const stored = await getStoredUser();
			if (stored) {
				await saveUser({ ...stored, use_display_name_on_booths: value });
			}
		} catch (error) {
			setUseDisplayNameOnBooths(previousValue);
			Alert.alert("Error", error instanceof Error ? error.message : "Failed to update setting.");
		}
	};

	const handlePickLogo = async (target: "account" | "booth") => {
		try {
			const permissionResult =
				await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permissionResult.granted) {
				Alert.alert(
					"Permission Required",
					"Please allow access to your photo library to upload a logo.",
				);
				return;
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"],
				allowsMultipleSelection: false,
				quality: 0.8,
			});

			if (result.canceled || !result.assets[0]) return;

			const asset = result.assets[0];
			const filename = asset.fileName ?? `logo_${Date.now()}.jpg`;
			const mimeType = asset.mimeType ?? "image/jpeg";

			if (target === "account") {
				await uploadAccountLogoMutation.mutateAsync({
					userId,
					fileUri: asset.uri,
					mimeType,
					filename,
				});
				Alert.alert("Success", "Account logo updated.");
			} else if (boothId) {
				await uploadBoothLogoMutation.mutateAsync({
					boothId,
					fileUri: asset.uri,
					mimeType,
					filename,
				});
				Alert.alert("Success", "Booth logo updated.");
			}
		} catch (error) {
			Alert.alert(
				"Upload Failed",
				error instanceof Error ? error.message : "Failed to upload logo.",
			);
		}
	};

	const handleDeleteLogo = (target: "account" | "booth") => {
		Alert.alert(
			"Remove Logo",
			target === "account"
				? "Remove your account logo? Booths using it will have no logo."
				: "Remove the custom booth logo? This booth will use the account logo.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							if (target === "account") {
								await deleteAccountLogoMutation.mutateAsync({ userId });
								Alert.alert("Success", "Account logo removed.");
							} else if (boothId) {
								await deleteBoothLogoMutation.mutateAsync({ boothId });
								Alert.alert("Success", "Booth logo removed.");
							}
						} catch (error) {
							Alert.alert(
								"Error",
								error instanceof Error ? error.message : "Failed to remove logo.",
							);
						}
					},
				},
			],
		);
	};

	const hasBoothSettingsChange = hasBoothNameChange || hasDisplayNameChange || hasAddressChange;

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

		// Save booth settings FIRST so display_name is persisted before the
		// account mutation's onSuccess invalidates all booth queries.
		if (hasBoothSettingsChange && boothId) {
			try {
				await updateBoothSettingsMutation.mutateAsync({
					boothId,
					...(hasBoothNameChange ? { name: boothName.trim() } : {}),
					...(hasDisplayNameChange ? { display_name: displayName.trim() } : {}),
					...(hasAddressChange ? { address: address.trim() } : {}),
				});
			} catch (error: unknown) {
				errors.push(error instanceof Error ? error.message : "Failed to save booth settings.");
			}
		}

		if (hasBusinessNameChange && userId) {
			try {
				await updateBusinessNameMutation.mutateAsync({ userId, business_name: businessName });
				try {
					const stored = await getStoredUser();
					if (stored) {
						await saveUser({ ...stored, business_name: businessName });
					}
				} catch (e) {
					console.error("[BusinessSettings] SecureStore sync failed:", e);
				}
			} catch (error: unknown) {
				errors.push(error instanceof Error ? error.message : "Failed to save business name.");
			}
		}

		if (errors.length > 0) {
			Alert.alert("Error", errors.join("\n"));
		} else {
			Alert.alert("Saved", "Settings have been updated.");
			onClose();
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

						{/* ── Use Display Name on All Booths (Account-level toggle) ── */}
						<View style={styles.fieldContainer}>
							<View style={styles.toggleRow}>
								<View style={styles.toggleLabelContainer}>
									<ThemedText
										style={[styles.fieldLabel, { color: textSecondary }]}
									>
										Use Business Name on All Booths
									</ThemedText>
									<ThemedText
										style={[styles.fieldHint, { color: textSecondary }]}
									>
										{useDisplayNameOnBooths
											? "Business name will appear on all booth welcome screens"
											: "Each booth can set its own display name"}
									</ThemedText>
								</View>
								<Switch
									testID="use-display-name-toggle"
									value={useDisplayNameOnBooths}
									onValueChange={handleToggleUseDisplayName}
									trackColor={{ false: borderColor, true: BRAND_COLOR }}
									disabled={isProcessing}
								/>
							</View>
						</View>

						{/* ── Account Logo ────────────────────────────── */}
						<View style={styles.fieldContainer}>
							<ThemedText
								style={[styles.fieldLabel, { color: textSecondary }]}
							>
								Account Logo
							</ThemedText>
							<View
								style={[
									styles.logoSection,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								{userProfile?.logo_url ? (
									<Image
										testID="account-logo-preview"
										source={{ uri: userProfile.logo_url }}
										style={styles.logoPreview}
										resizeMode="contain"
									/>
								) : (
									<View style={[styles.logoPlaceholder, { borderColor }]}>
										<IconSymbol
											name="photo"
											size={32}
											color={textSecondary}
										/>
										<ThemedText
											style={[styles.logoPlaceholderText, { color: textSecondary }]}
										>
											No logo
										</ThemedText>
									</View>
								)}
								<View style={styles.logoActions}>
									<TouchableOpacity
										testID="upload-account-logo-button"
										style={[styles.logoButton, { backgroundColor: BRAND_COLOR }]}
										onPress={() => handlePickLogo("account")}
										disabled={isLogoProcessing}
									>
										{uploadAccountLogoMutation.isPending ? (
											<ActivityIndicator color="white" size="small" />
										) : (
											<ThemedText style={styles.logoButtonText}>
												{userProfile?.logo_url ? "Replace" : "Upload"}
											</ThemedText>
										)}
									</TouchableOpacity>
									{userProfile?.logo_url && (
										<TouchableOpacity
											testID="delete-account-logo-button"
											style={[styles.logoButton, styles.logoDeleteButton, { borderColor }]}
											onPress={() => handleDeleteLogo("account")}
											disabled={isLogoProcessing}
										>
											{deleteAccountLogoMutation.isPending ? (
												<ActivityIndicator color={textSecondary} size="small" />
											) : (
												<ThemedText
													style={[styles.logoButtonText, { color: "#FF3B30" }]}
												>
													Remove
												</ThemedText>
											)}
										</TouchableOpacity>
									)}
								</View>
							</View>
							<ThemedText
								style={[styles.fieldHint, { color: textSecondary }]}
							>
								Default logo for all your booths
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

								{/* Display Name */}
								<View style={styles.fieldContainer}>
									<ThemedText
										style={[styles.fieldLabel, { color: textSecondary }]}
									>
										Display Name
									</ThemedText>
									<View
										style={[
											styles.inputContainer,
											{ backgroundColor: cardBg, borderColor },
											useDisplayNameOnBooths && styles.inputDisabled,
										]}
									>
										<IconSymbol
											name="textformat"
											size={20}
											color={textSecondary}
											style={styles.inputIcon}
										/>
										<TextInput
											style={[styles.input, { color: textColor }]}
											value={displayName}
											onChangeText={setDisplayName}
											placeholder="Enter display name for welcome screen"
											placeholderTextColor={textSecondary}
											maxLength={255}
											editable={!updateBoothSettingsMutation.isPending && !useDisplayNameOnBooths}
										/>
									</View>
									<ThemedText
										style={[styles.fieldHint, { color: textSecondary }]}
									>
										{useDisplayNameOnBooths
											? "Overridden by business name (toggle above)"
											: "Name shown on this booth's welcome screen"}
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

								{/* ── Booth Logo ─────────────────────── */}
								<View style={styles.fieldContainer}>
									<ThemedText
										style={[styles.fieldLabel, { color: textSecondary }]}
									>
										Booth Logo
									</ThemedText>
									<View
										style={[
											styles.logoSection,
											{ backgroundColor: cardBg, borderColor },
										]}
									>
										{boothSettings?.custom_logo_url ? (
											<Image
												testID="booth-logo-preview"
												source={{ uri: boothSettings.custom_logo_url }}
												style={styles.logoPreview}
												resizeMode="contain"
											/>
										) : (
											<View style={[styles.logoPlaceholder, { borderColor }]}>
												<IconSymbol
													name="photo"
													size={32}
													color={textSecondary}
												/>
												<ThemedText
													style={[styles.logoPlaceholderText, { color: textSecondary }]}
												>
													No logo
												</ThemedText>
											</View>
										)}
										<View style={styles.logoActions}>
											<TouchableOpacity
												testID="upload-booth-logo-button"
												style={[styles.logoButton, { backgroundColor: BRAND_COLOR }]}
												onPress={() => handlePickLogo("booth")}
												disabled={isLogoProcessing}
											>
												{uploadBoothLogoMutation.isPending ? (
													<ActivityIndicator color="white" size="small" />
												) : (
													<ThemedText style={styles.logoButtonText}>
														{boothSettings?.custom_logo_url ? "Replace" : "Upload"}
													</ThemedText>
												)}
											</TouchableOpacity>
											{boothSettings?.custom_logo_url && (
												<TouchableOpacity
													testID="delete-booth-logo-button"
													style={[styles.logoButton, styles.logoDeleteButton, { borderColor }]}
													onPress={() => handleDeleteLogo("booth")}
													disabled={isLogoProcessing}
												>
													{deleteBoothLogoMutation.isPending ? (
														<ActivityIndicator color={textSecondary} size="small" />
													) : (
														<ThemedText
															style={[styles.logoButtonText, { color: "#FF3B30" }]}
														>
															Remove
														</ThemedText>
													)}
												</TouchableOpacity>
											)}
										</View>
									</View>
									<ThemedText
										style={[styles.fieldHint, { color: textSecondary }]}
									>
										{boothSettings?.custom_logo_url
											? "Remove to use the account logo instead"
											: "Upload to override the account logo for this booth"}
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
	inputDisabled: {
		opacity: 0.5,
	},
	toggleRow: {
		flexDirection: "row" as const,
		justifyContent: "space-between" as const,
		alignItems: "center" as const,
	},
	toggleLabelContainer: {
		flex: 1,
		marginRight: Spacing.md,
	},
	// Logo
	logoSection: {
		flexDirection: "column" as const,
		alignItems: "center" as const,
		padding: Spacing.lg,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.md,
	},
	logoPreview: {
		width: 80,
		height: 80,
		borderRadius: BorderRadius.md,
	},
	logoPlaceholder: {
		width: 80,
		height: 80,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		borderStyle: "dashed" as const,
		alignItems: "center" as const,
		justifyContent: "center" as const,
	},
	logoPlaceholderText: {
		fontSize: 11,
		marginTop: 4,
	},
	logoActions: {
		flexDirection: "row" as const,
		width: "100%" as const,
		gap: Spacing.sm,
	},
	logoButton: {
		flex: 1,
		paddingVertical: Spacing.sm,
		paddingHorizontal: Spacing.md,
		borderRadius: BorderRadius.md,
		alignItems: "center" as const,
		justifyContent: "center" as const,
		minHeight: 40,
	},
	logoDeleteButton: {
		backgroundColor: "transparent",
		borderWidth: 1,
	},
	logoButtonText: {
		color: "white",
		fontSize: 14,
		fontWeight: "600" as const,
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
