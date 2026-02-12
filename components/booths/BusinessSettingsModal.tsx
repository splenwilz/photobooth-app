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

import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Dimensions,
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
	StatusColors,
	withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg"];
const SCREEN_HEIGHT = Dimensions.get("window").height;

interface BusinessSettingsModalProps {
	visible: boolean;
	boothId: string | null;
	userId: string;
	onClose: () => void;
}

export function BusinessSettingsModal({
	visible,
	boothId,
	userId,
	onClose,
}: BusinessSettingsModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");
	const insets = useSafeAreaInsets();

	// ── Queries ──────────────────────────────────────────────────────────
	const { data: userProfile } = useUserProfile(visible ? userId : null);
	const { data: boothSettings } = useBoothBusinessSettings(
		visible ? boothId : null,
	);

	// ── Mutations ────────────────────────────────────────────────────────
	const updateBusinessNameMutation = useUpdateBusinessName();
	const uploadAccountLogoMutation = useUploadAccountLogo();
	const deleteAccountLogoMutation = useDeleteAccountLogo();
	const updateBoothSettingsMutation = useUpdateBoothSettings();
	const uploadBoothLogoMutation = useUploadBoothLogo();
	const deleteBoothLogoMutation = useDeleteBoothLogo();

	// ── Form State ───────────────────────────────────────────────────────
	const [businessName, setBusinessName] = useState("");
	const [address, setAddress] = useState("");
	const [showLogoOnPrints, setShowLogoOnPrints] = useState(true);
	const [showBusinessName, setShowBusinessName] = useState(true);
	const [showLogo, setShowLogo] = useState(true);
	const [welcomeSubtitle, setWelcomeSubtitle] = useState("");
	const [showWelcomeSubtitle, setShowWelcomeSubtitle] = useState(true);
	const [logoTab, setLogoTab] = useState<"account" | "booth">("account");
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	// ── Derived values ───────────────────────────────────────────────────
	const accountLogoUrl = userProfile?.logo_url ?? null;
	const boothCustomLogoUrl = boothSettings?.custom_logo_url ?? null;
	const useCustomLogo = boothSettings?.use_custom_logo ?? false;

	// ── Populate form on modal open (once data is available) ─────────────
	const hasPopulated = useRef(false);
	useEffect(() => {
		if (!visible) {
			hasPopulated.current = false;
			return;
		}
		if (hasPopulated.current) return;

		// Wait for data before populating
		const hasUserData = !!userProfile;
		const hasBoothData = !boothId || !!boothSettings;
		if (!hasUserData || !hasBoothData) return;

		setBusinessName(userProfile?.business_name ?? "");
		setAddress(boothSettings?.address ?? "");
		setShowLogoOnPrints(boothSettings?.show_logo_on_prints ?? true);
		setShowBusinessName(boothSettings?.show_business_name ?? true);
		setShowLogo(boothSettings?.show_logo ?? true);
		setWelcomeSubtitle(boothSettings?.welcome_subtitle ?? "");
		setShowWelcomeSubtitle(boothSettings?.show_welcome_subtitle ?? true);
		setLogoTab(useCustomLogo ? "booth" : "account");
		hasPopulated.current = true;
	}, [visible, userProfile, boothSettings, boothId, useCustomLogo]);

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
	const hasAddressChange =
		boothId != null && address !== (boothSettings?.address ?? "");
	const hasShowLogoOnPrintsChange =
		boothId != null &&
		showLogoOnPrints !== (boothSettings?.show_logo_on_prints ?? true);
	const hasShowBusinessNameChange =
		boothId != null &&
		showBusinessName !== (boothSettings?.show_business_name ?? true);
	const hasShowLogoChange =
		boothId != null &&
		showLogo !== (boothSettings?.show_logo ?? true);
	const hasWelcomeSubtitleChange =
		boothId != null &&
		welcomeSubtitle !== (boothSettings?.welcome_subtitle ?? "");
	const hasShowWelcomeSubtitleChange =
		boothId != null &&
		showWelcomeSubtitle !== (boothSettings?.show_welcome_subtitle ?? true);

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

	const hasBoothSettingsChange =
		hasAddressChange || hasShowLogoOnPrintsChange || hasShowBusinessNameChange || hasShowLogoChange || hasWelcomeSubtitleChange || hasShowWelcomeSubtitleChange;

	const hasAnyChange = hasBusinessNameChange || hasBoothSettingsChange;

	const handleSave = async () => {
		if (!hasAnyChange) return;
		Keyboard.dismiss();

		const errors: string[] = [];

		// Fire both API calls in parallel when both have changes
		const promises: Promise<void>[] = [];

		if (hasBusinessNameChange && userId) {
			promises.push(
				updateBusinessNameMutation
					.mutateAsync({ userId, business_name: businessName })
					.then(async () => {
						const stored = await getStoredUser();
						if (stored) {
							await saveUser({ ...stored, business_name: businessName });
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
						...(hasAddressChange ? { address } : {}),
						...(hasShowLogoOnPrintsChange
							? { show_logo_on_prints: showLogoOnPrints }
							: {}),
						...(hasShowBusinessNameChange
							? { show_business_name: showBusinessName }
							: {}),
						...(hasShowLogoChange
							? { show_logo: showLogo }
							: {}),
						...(hasWelcomeSubtitleChange
							? { welcome_subtitle: welcomeSubtitle || null }
							: {}),
						...(hasShowWelcomeSubtitleChange
							? { show_welcome_subtitle: showWelcomeSubtitle }
							: {}),
					})
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

	const handleUploadLogo = async (scope: "account" | "booth") => {
		if (scope === "booth" && !boothId) return;

		const { status } =
			await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			Alert.alert(
				"Permission Required",
				"Please allow access to your photo library to upload a logo.",
			);
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			quality: 0.8,
			allowsEditing: true,
			aspect: [1, 1],
		});

		if (result.canceled || !result.assets?.[0]) return;

		const asset = result.assets[0];
		const mimeType = asset.mimeType ?? "image/png";

		if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
			Alert.alert("Invalid File Type", "Please select a PNG or JPEG image.");
			return;
		}

		if (asset.fileSize && asset.fileSize > MAX_LOGO_SIZE) {
			Alert.alert(
				"File Too Large",
				"Logo must be under 5MB. Please choose a smaller image.",
			);
			return;
		}

		const filename =
			asset.fileName ??
			`logo_${Date.now()}.${mimeType === "image/jpeg" ? "jpg" : "png"}`;

		if (scope === "account") {
			uploadAccountLogoMutation.mutate(
				{ userId, fileUri: asset.uri, mimeType, filename },
				{
					onSuccess: async (response) => {
						// Sync logo_url to SecureStore
						const stored = await getStoredUser();
						if (stored) {
							await saveUser({ ...stored, logo_url: response.logo_url });
						}
						Alert.alert("Logo Uploaded", "Account logo updated for all booths.");
					},
					onError: (error) => {
						Alert.alert(
							"Upload Failed",
							error.message || "Failed to upload logo.",
						);
					},
				},
			);
		} else {
			uploadBoothLogoMutation.mutate(
				{ boothId: boothId!, fileUri: asset.uri, mimeType, filename },
				{
					onSuccess: () => {
						Alert.alert(
							"Logo Uploaded",
							"Custom logo set for this booth.",
						);
					},
					onError: (error) => {
						Alert.alert(
							"Upload Failed",
							error.message || "Failed to upload logo.",
						);
					},
				},
			);
		}
	};

	const handleDeleteLogo = (scope: "account" | "booth") => {
		if (scope === "booth" && !boothId) return;

		const title =
			scope === "account" ? "Remove Account Logo" : "Remove Booth Logo";
		const message =
			scope === "account"
				? "This will remove the logo for all booths without a custom logo. Are you sure?"
				: "This will remove the custom logo. The booth will use the account logo instead.";

		Alert.alert(title, message, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Remove",
				style: "destructive",
				onPress: () => {
					if (scope === "account") {
						deleteAccountLogoMutation.mutate(
							{ userId },
							{
								onSuccess: async () => {
									const stored = await getStoredUser();
									if (stored) {
										await saveUser({ ...stored, logo_url: null });
									}
								},
								onError: (error) => {
									Alert.alert(
										"Error",
										error.message || "Failed to remove logo.",
									);
								},
							},
						);
					} else {
						deleteBoothLogoMutation.mutate(
							{ boothId: boothId! },
							{
								onSuccess: () => {
									setLogoTab("account");
								},
								onError: (error) => {
									Alert.alert(
										"Error",
										error.message || "Failed to remove logo.",
									);
								},
							},
						);
					}
				},
			},
		]);
	};

	/** Toggle use_custom_logo on the booth */
	const handleToggleCustomLogo = (value: boolean) => {
		if (!boothId) return;
		updateBoothSettingsMutation.mutate(
			{ boothId, use_custom_logo: value },
			{
				onError: (error) =>
					Alert.alert(
						"Error",
						error.message || "Failed to update logo setting.",
					),
			},
		);
	};

	const bottomPadding =
		keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, Spacing.lg);

	// ── Render helpers ───────────────────────────────────────────────────

	const renderLogoPreview = (url: string | null, placeholder: string) => {
		if (url) {
			return (
				<View style={[styles.logoPreviewContainer, { borderColor }]}>
					<Image
						source={{ uri: url }}
						style={styles.logoImage}
						contentFit="contain"
					/>
				</View>
			);
		}
		return (
			<View
				style={[
					styles.logoPlaceholder,
					{ backgroundColor: withAlpha(BRAND_COLOR, 0.1), borderColor },
				]}
			>
				<IconSymbol name="photo" size={40} color={textSecondary} />
				<ThemedText
					style={[styles.logoPlaceholderText, { color: textSecondary }]}
				>
					{placeholder}
				</ThemedText>
			</View>
		);
	};

	const renderLogoActions = (
		scope: "account" | "booth",
		hasLogo: boolean,
		isUploading: boolean,
		isDeleting: boolean,
	) => (
		<View style={styles.logoActions}>
			<TouchableOpacity
				style={[styles.logoButton, { backgroundColor: BRAND_COLOR }]}
				onPress={() => handleUploadLogo(scope)}
				disabled={isUploading}
			>
				{isUploading ? (
					<ActivityIndicator color="white" size="small" />
				) : (
					<>
						<IconSymbol name="arrow.up.circle" size={18} color="white" />
						<ThemedText style={styles.logoButtonText}>
							{hasLogo ? "Change" : "Upload"}
						</ThemedText>
					</>
				)}
			</TouchableOpacity>

			{hasLogo && (
				<TouchableOpacity
					style={[
						styles.logoButton,
						{ backgroundColor: withAlpha(StatusColors.error, 0.15) },
					]}
					onPress={() => handleDeleteLogo(scope)}
					disabled={isDeleting}
				>
					{isDeleting ? (
						<ActivityIndicator color={StatusColors.error} size="small" />
					) : (
						<>
							<IconSymbol
								name="trash"
								size={18}
								color={StatusColors.error}
							/>
							<ThemedText
								style={[
									styles.logoButtonText,
									{ color: StatusColors.error },
								]}
							>
								Remove
							</ThemedText>
						</>
					)}
				</TouchableOpacity>
			)}
		</View>
	);

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
							maxHeight: SCREEN_HEIGHT * 0.9,
						},
					]}
				>
					{/* Header */}
					<View style={styles.header}>
						<View style={styles.handle} />
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
						{/* ── Logo Section ─────────────────────────────── */}
						{boothId ? (
							<View style={styles.logoSection}>
								{/* Use Custom Logo toggle */}
								<View
									style={[
										styles.toggleContainer,
										{ backgroundColor: cardBg, borderColor, marginBottom: Spacing.sm },
									]}
								>
									<View style={styles.toggleContent}>
										<View
											style={[
												styles.toggleIconContainer,
												{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
											]}
										>
											<IconSymbol name="photo.badge.checkmark" size={20} color={BRAND_COLOR} />
										</View>
										<View style={styles.toggleTextContainer}>
											<ThemedText type="defaultSemiBold" style={styles.toggleTitle}>
												Use Custom Logo
											</ThemedText>
											<ThemedText style={[styles.toggleSubtitle, { color: textSecondary }]}>
												{useCustomLogo
													? "This booth uses its own logo"
													: "This booth uses the account logo"}
											</ThemedText>
										</View>
									</View>
									<Switch
										value={useCustomLogo}
										onValueChange={handleToggleCustomLogo}
										trackColor={{ false: borderColor, true: BRAND_COLOR }}
										thumbColor="white"
										disabled={updateBoothSettingsMutation.isPending}
									/>
								</View>

								{/* Scope tabs */}
								<View style={[styles.logoTabs, { borderColor }]}>
									<TouchableOpacity
										style={[
											styles.logoTab,
											logoTab === "account" && {
												backgroundColor: withAlpha(BRAND_COLOR, 0.15),
											},
										]}
										onPress={() => setLogoTab("account")}
									>
										<ThemedText
											style={[
												styles.logoTabText,
												logoTab === "account" && {
													color: BRAND_COLOR,
													fontWeight: "600",
												},
											]}
										>
											Account Logo
										</ThemedText>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.logoTab,
											logoTab === "booth" && {
												backgroundColor: withAlpha(BRAND_COLOR, 0.15),
											},
										]}
										onPress={() => setLogoTab("booth")}
									>
										<ThemedText
											style={[
												styles.logoTabText,
												logoTab === "booth" && {
													color: BRAND_COLOR,
													fontWeight: "600",
												},
											]}
										>
											This Booth Only
										</ThemedText>
									</TouchableOpacity>
								</View>

								{/* Tab content */}
								{logoTab === "account" ? (
									<>
										{renderLogoPreview(accountLogoUrl, "No account logo")}
										{renderLogoActions(
											"account",
											!!accountLogoUrl,
											uploadAccountLogoMutation.isPending,
											deleteAccountLogoMutation.isPending,
										)}
										<ThemedText
											style={[styles.logoHint, { color: textSecondary }]}
										>
											Shared across all booths
										</ThemedText>
									</>
								) : (
									<>
										{renderLogoPreview(boothCustomLogoUrl, "No custom logo")}
										{renderLogoActions(
											"booth",
											!!boothCustomLogoUrl,
											uploadBoothLogoMutation.isPending,
											deleteBoothLogoMutation.isPending,
										)}
										<ThemedText
											style={[styles.logoHint, { color: textSecondary }]}
										>
											Overrides the account logo when toggle is on
										</ThemedText>
									</>
								)}

								<ThemedText
									style={[styles.logoHint, { color: textSecondary }]}
								>
									PNG or JPEG, max 5MB
								</ThemedText>
							</View>
						) : (
							/* All Booths mode — account logo only */
							<View style={styles.logoSection}>
								{renderLogoPreview(accountLogoUrl, "No account logo")}
								{renderLogoActions(
									"account",
									!!accountLogoUrl,
									uploadAccountLogoMutation.isPending,
									deleteAccountLogoMutation.isPending,
								)}
								<ThemedText
									style={[styles.logoHint, { color: textSecondary }]}
								>
									Shared across all booths
								</ThemedText>
								<ThemedText
									style={[styles.logoHint, { color: textSecondary }]}
								>
									PNG or JPEG, max 5MB
								</ThemedText>
							</View>
						)}

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

								{/* Welcome Subtitle */}
								<View style={styles.fieldContainer}>
									<ThemedText
										style={[styles.fieldLabel, { color: textSecondary }]}
									>
										Welcome Subtitle
									</ThemedText>
									<View
										style={[
											styles.inputContainer,
											{ backgroundColor: cardBg, borderColor },
										]}
									>
										<IconSymbol
											name="text.quote"
											size={20}
											color={textSecondary}
											style={styles.inputIcon}
										/>
										<TextInput
											style={[styles.input, { color: textColor }]}
											value={welcomeSubtitle}
											onChangeText={setWelcomeSubtitle}
											placeholder="e.g. Create Amazing Photo Memories"
											placeholderTextColor={textSecondary}
											maxLength={255}
											editable={!updateBoothSettingsMutation.isPending}
										/>
									</View>
									<ThemedText
										style={[styles.fieldHint, { color: textSecondary }]}
									>
										Custom tagline on the welcome screen. This booth only
									</ThemedText>
								</View>

								{/* ── Display toggles ────────────────────── */}

								{/* Show Business Name */}
								<View
									style={[
										styles.toggleContainer,
										{ backgroundColor: cardBg, borderColor },
									]}
								>
									<View style={styles.toggleContent}>
										<View
											style={[
												styles.toggleIconContainer,
												{
													backgroundColor: withAlpha(BRAND_COLOR, 0.15),
												},
											]}
										>
											<IconSymbol
												name="building.2"
												size={20}
												color={BRAND_COLOR}
											/>
										</View>
										<View style={styles.toggleTextContainer}>
											<ThemedText
												type="defaultSemiBold"
												style={styles.toggleTitle}
											>
												Show Business Name
											</ThemedText>
											<ThemedText
												style={[
													styles.toggleSubtitle,
													{ color: textSecondary },
												]}
											>
												Display name on the welcome screen
											</ThemedText>
										</View>
									</View>
									<Switch
										value={showBusinessName}
										onValueChange={setShowBusinessName}
										trackColor={{ false: borderColor, true: BRAND_COLOR }}
										thumbColor="white"
										disabled={updateBoothSettingsMutation.isPending}
									/>
								</View>

								{/* Show Logo */}
								<View
									style={[
										styles.toggleContainer,
										{ backgroundColor: cardBg, borderColor },
									]}
								>
									<View style={styles.toggleContent}>
										<View
											style={[
												styles.toggleIconContainer,
												{
													backgroundColor: withAlpha(BRAND_COLOR, 0.15),
												},
											]}
										>
											<IconSymbol
												name="photo"
												size={20}
												color={BRAND_COLOR}
											/>
										</View>
										<View style={styles.toggleTextContainer}>
											<ThemedText
												type="defaultSemiBold"
												style={styles.toggleTitle}
											>
												Show Logo
											</ThemedText>
											<ThemedText
												style={[
													styles.toggleSubtitle,
													{ color: textSecondary },
												]}
											>
												Display logo on the welcome screen
											</ThemedText>
										</View>
									</View>
									<Switch
										value={showLogo}
										onValueChange={setShowLogo}
										trackColor={{ false: borderColor, true: BRAND_COLOR }}
										thumbColor="white"
										disabled={updateBoothSettingsMutation.isPending}
									/>
								</View>

								{/* Show Logo on Prints */}
								<View
									style={[
										styles.toggleContainer,
										{ backgroundColor: cardBg, borderColor },
									]}
								>
									<View style={styles.toggleContent}>
										<View
											style={[
												styles.toggleIconContainer,
												{
													backgroundColor: withAlpha(BRAND_COLOR, 0.15),
												},
											]}
										>
											<IconSymbol
												name="printer"
												size={20}
												color={BRAND_COLOR}
											/>
										</View>
										<View style={styles.toggleTextContainer}>
											<ThemedText
												type="defaultSemiBold"
												style={styles.toggleTitle}
											>
												Show Logo on Prints
											</ThemedText>
											<ThemedText
												style={[
													styles.toggleSubtitle,
													{ color: textSecondary },
												]}
											>
												Display your logo on printed photos on color mode
											</ThemedText>
										</View>
									</View>
									<Switch
										value={showLogoOnPrints}
										onValueChange={setShowLogoOnPrints}
										trackColor={{ false: borderColor, true: BRAND_COLOR }}
										thumbColor="white"
										disabled={updateBoothSettingsMutation.isPending}
									/>
								</View>

								{/* Show Welcome Subtitle */}
								<View
									style={[
										styles.toggleContainer,
										{ backgroundColor: cardBg, borderColor },
									]}
								>
									<View style={styles.toggleContent}>
										<View
											style={[
												styles.toggleIconContainer,
												{
													backgroundColor: withAlpha(BRAND_COLOR, 0.15),
												},
											]}
										>
											<IconSymbol
												name="text.bubble"
												size={20}
												color={BRAND_COLOR}
											/>
										</View>
										<View style={styles.toggleTextContainer}>
											<ThemedText
												type="defaultSemiBold"
												style={styles.toggleTitle}
											>
												Show Welcome Subtitle
											</ThemedText>
											<ThemedText
												style={[
													styles.toggleSubtitle,
													{ color: textSecondary },
												]}
											>
												Display subtitle on the welcome screen
											</ThemedText>
										</View>
									</View>
									<Switch
										value={showWelcomeSubtitle}
										onValueChange={setShowWelcomeSubtitle}
										trackColor={{ false: borderColor, true: BRAND_COLOR }}
										thumbColor="white"
										disabled={updateBoothSettingsMutation.isPending}
									/>
								</View>

								</>
						)}

						{/* Unified save button */}
						{hasAnyChange && (
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
	// Logo Section
	logoSection: {
		alignItems: "center",
		marginBottom: Spacing.xl,
	},
	logoPreviewContainer: {
		width: 120,
		height: 120,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		overflow: "hidden",
		marginBottom: Spacing.sm,
	},
	logoImage: {
		width: "100%",
		height: "100%",
	},
	logoPlaceholder: {
		width: 120,
		height: 120,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		borderStyle: "dashed",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.md,
	},
	logoPlaceholderText: {
		fontSize: 12,
		marginTop: Spacing.xs,
	},
	logoTabs: {
		flexDirection: "row",
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		overflow: "hidden",
		marginBottom: Spacing.sm,
		width: "100%",
	},
	logoTab: {
		flex: 1,
		paddingVertical: Spacing.sm,
		alignItems: "center",
		justifyContent: "center",
	},
	logoTabText: {
		fontSize: 13,
	},
	logoScopeText: {
		fontSize: 12,
		marginBottom: Spacing.sm,
	},
	logoActions: {
		flexDirection: "row",
		gap: Spacing.sm,
		marginBottom: Spacing.xs,
	},
	logoButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		gap: Spacing.xs,
		minWidth: 100,
		justifyContent: "center",
	},
	logoButtonText: {
		color: "white",
		fontSize: 14,
		fontWeight: "600",
	},
	logoHint: {
		fontSize: 12,
		marginTop: Spacing.xs,
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
	// Toggle
	toggleContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.md,
	},
	toggleContent: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		marginRight: Spacing.sm,
	},
	toggleIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.sm,
	},
	toggleTextContainer: {
		flex: 1,
	},
	toggleTitle: {
		fontSize: 14,
	},
	toggleSubtitle: {
		fontSize: 12,
		marginTop: 2,
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
