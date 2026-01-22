/**
 * EditProfileModal Component
 *
 * Bottom sheet modal for editing user profile.
 * Includes name, email, profile picture, and password change.
 *
 * @see app/(tabs)/settings.tsx - Used in Settings screen
 */

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Dimensions,
	Keyboard,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface UserProfile {
	name: string;
	email: string;
	initials: string;
}

interface EditProfileModalProps {
	/** Whether the modal is visible */
	visible: boolean;
	/** Current user profile data */
	profile: UserProfile;
	/** Callback when modal is closed */
	onClose: () => void;
	/** Callback when profile is successfully updated */
	onSave?: (profile: UserProfile) => void;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

/**
 * EditProfileModal - Bottom sheet for editing user profile
 */
export function EditProfileModal({
	visible,
	profile,
	onClose,
	onSave,
}: EditProfileModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");

	// Get safe area insets
	const insets = useSafeAreaInsets();

	// Form state
	const [name, setName] = useState(profile.name);
	const [email, setEmail] = useState(profile.email);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	// Reset form when profile changes or modal opens
	useEffect(() => {
		if (visible) {
			setName(profile.name);
			setEmail(profile.email);
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		}
	}, [visible, profile]);

	// Listen for keyboard show/hide
	useEffect(() => {
		const keyboardWillShow = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
			(e) => {
				setKeyboardHeight(e.endCoordinates.height);
			},
		);
		const keyboardWillHide = Keyboard.addListener(
			Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
			() => {
				setKeyboardHeight(0);
			},
		);

		return () => {
			keyboardWillShow.remove();
			keyboardWillHide.remove();
		};
	}, []);

	// Generate initials from name
	const getInitials = (fullName: string): string => {
		const names = fullName.trim().split(" ");
		if (names.length >= 2) {
			return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
		}
		return fullName.slice(0, 2).toUpperCase();
	};

	// Validate form
	const validateForm = (): boolean => {
		if (!name.trim()) {
			Alert.alert("Error", "Name is required");
			return false;
		}

		if (!email.trim()) {
			Alert.alert("Error", "Email is required");
			return false;
		}

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			Alert.alert("Error", "Please enter a valid email address");
			return false;
		}

		// Password validation (only if changing password)
		if (newPassword || confirmPassword || currentPassword) {
			if (!currentPassword) {
				Alert.alert("Error", "Current password is required to change password");
				return false;
			}
			if (!newPassword) {
				Alert.alert("Error", "New password is required");
				return false;
			}
			if (newPassword.length < 8) {
				Alert.alert("Error", "New password must be at least 8 characters");
				return false;
			}
			if (newPassword !== confirmPassword) {
				Alert.alert("Error", "New passwords do not match");
				return false;
			}
		}

		return true;
	};

	const handleSave = async () => {
		if (!validateForm()) return;

		Keyboard.dismiss();
		setIsProcessing(true);

		try {
			// TODO: Replace with actual API call
			// Simulating API delay
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const updatedProfile: UserProfile = {
				name: name.trim(),
				email: email.trim(),
				initials: getInitials(name.trim()),
			};

			setIsProcessing(false);
			onSave?.(updatedProfile);
			handleClose();
		} catch (error) {
			setIsProcessing(false);
			Alert.alert("Error", "Failed to update profile. Please try again.");
			console.error("[EditProfileModal] Failed to update profile:", error);
		}
	};

	const handleClose = () => {
		if (!isProcessing) {
			Keyboard.dismiss();
			onClose();
		}
	};

	// Check if form has changes
	const hasChanges =
		name !== profile.name || email !== profile.email || newPassword.length > 0;

	// Calculate bottom padding based on keyboard
	const bottomPadding =
		keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, Spacing.lg);

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
							maxHeight: SCREEN_HEIGHT * 0.9,
						},
					]}
				>
					{/* Header */}
					<View style={styles.header}>
						<View style={styles.handle} />
						<View style={styles.headerRow}>
							<ThemedText type="subtitle">Edit Profile</ThemedText>
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
						bounces={true}
					>
						{/* Profile Picture */}
						<View style={styles.avatarSection}>
							<View
								style={[
									styles.avatar,
									{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
								]}
							>
								<ThemedText style={[styles.avatarText, { color: BRAND_COLOR }]}>
									{getInitials(name)}
								</ThemedText>
							</View>
							<TouchableOpacity
								style={[
									styles.changePhotoButton,
									{ backgroundColor: withAlpha(BRAND_COLOR, 0.1) },
								]}
								onPress={() =>
									Alert.alert(
										"Coming Soon",
										"Profile photo upload will be available soon.",
									)
								}
							>
								<IconSymbol name="camera" size={16} color={BRAND_COLOR} />
								<ThemedText
									style={[styles.changePhotoText, { color: BRAND_COLOR }]}
								>
									Change Photo
								</ThemedText>
							</TouchableOpacity>
						</View>

						{/* Name Field */}
						<View style={styles.fieldContainer}>
							<ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>
								Full Name
							</ThemedText>
							<View
								style={[
									styles.inputContainer,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<IconSymbol
									name="person"
									size={20}
									color={textSecondary}
									style={styles.inputIcon}
								/>
								<TextInput
									style={[styles.input, { color: textColor }]}
									value={name}
									onChangeText={setName}
									placeholder="Enter your name"
									placeholderTextColor={textSecondary}
									autoCapitalize="words"
									editable={!isProcessing}
								/>
							</View>
						</View>

						{/* Email Field */}
						<View style={styles.fieldContainer}>
							<ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>
								Email Address
							</ThemedText>
							<View
								style={[
									styles.inputContainer,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<IconSymbol
									name="envelope"
									size={20}
									color={textSecondary}
									style={styles.inputIcon}
								/>
								<TextInput
									style={[styles.input, { color: textColor }]}
									value={email}
									onChangeText={setEmail}
									placeholder="Enter your email"
									placeholderTextColor={textSecondary}
									keyboardType="email-address"
									autoCapitalize="none"
									autoCorrect={false}
									editable={!isProcessing}
								/>
							</View>
						</View>

						{/* Password Section */}
						<View style={styles.sectionDivider}>
							<View
								style={[styles.dividerLine, { backgroundColor: borderColor }]}
							/>
							<ThemedText
								style={[styles.dividerText, { color: textSecondary }]}
							>
								Change Password
							</ThemedText>
							<View
								style={[styles.dividerLine, { backgroundColor: borderColor }]}
							/>
						</View>

						<ThemedText style={[styles.passwordHint, { color: textSecondary }]}>
							Leave blank to keep your current password
						</ThemedText>

						{/* Current Password */}
						<View style={styles.fieldContainer}>
							<ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>
								Current Password
							</ThemedText>
							<View
								style={[
									styles.inputContainer,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<IconSymbol
									name="lock"
									size={20}
									color={textSecondary}
									style={styles.inputIcon}
								/>
								<TextInput
									style={[styles.input, { color: textColor }]}
									value={currentPassword}
									onChangeText={setCurrentPassword}
									placeholder="Enter current password"
									placeholderTextColor={textSecondary}
									secureTextEntry={!showCurrentPassword}
									autoCapitalize="none"
									autoCorrect={false}
									editable={!isProcessing}
								/>
								<TouchableOpacity
									onPress={() => setShowCurrentPassword(!showCurrentPassword)}
									hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
								>
									<IconSymbol
										name={showCurrentPassword ? "eye.slash" : "eye"}
										size={20}
										color={textSecondary}
									/>
								</TouchableOpacity>
							</View>
						</View>

						{/* New Password */}
						<View style={styles.fieldContainer}>
							<ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>
								New Password
							</ThemedText>
							<View
								style={[
									styles.inputContainer,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<IconSymbol
									name="lock"
									size={20}
									color={textSecondary}
									style={styles.inputIcon}
								/>
								<TextInput
									style={[styles.input, { color: textColor }]}
									value={newPassword}
									onChangeText={setNewPassword}
									placeholder="Enter new password"
									placeholderTextColor={textSecondary}
									secureTextEntry={!showNewPassword}
									autoCapitalize="none"
									autoCorrect={false}
									editable={!isProcessing}
								/>
								<TouchableOpacity
									onPress={() => setShowNewPassword(!showNewPassword)}
									hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
								>
									<IconSymbol
										name={showNewPassword ? "eye.slash" : "eye"}
										size={20}
										color={textSecondary}
									/>
								</TouchableOpacity>
							</View>
						</View>

						{/* Confirm Password */}
						<View style={styles.fieldContainer}>
							<ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>
								Confirm New Password
							</ThemedText>
							<View
								style={[
									styles.inputContainer,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<IconSymbol
									name="lock"
									size={20}
									color={textSecondary}
									style={styles.inputIcon}
								/>
								<TextInput
									style={[styles.input, { color: textColor }]}
									value={confirmPassword}
									onChangeText={setConfirmPassword}
									placeholder="Confirm new password"
									placeholderTextColor={textSecondary}
									secureTextEntry={!showConfirmPassword}
									autoCapitalize="none"
									autoCorrect={false}
									editable={!isProcessing}
								/>
								<TouchableOpacity
									onPress={() => setShowConfirmPassword(!showConfirmPassword)}
									hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
								>
									<IconSymbol
										name={showConfirmPassword ? "eye.slash" : "eye"}
										size={20}
										color={textSecondary}
									/>
								</TouchableOpacity>
							</View>
						</View>

						{/* Save Button */}
						<View style={styles.buttonContainer}>
							<TouchableOpacity
								style={[
									styles.saveButton,
									{
										backgroundColor: hasChanges ? BRAND_COLOR : borderColor,
										opacity: hasChanges && !isProcessing ? 1 : 0.6,
									},
								]}
								onPress={handleSave}
								disabled={!hasChanges || isProcessing}
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
	},
	scrollContent: {
		flexShrink: 1,
	},
	scrollContentContainer: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.md,
	},
	avatarSection: {
		alignItems: "center",
		marginBottom: Spacing.xl,
	},
	avatar: {
		width: 100,
		height: 100,
		borderRadius: 50,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.md,
	},
	avatarText: {
		fontSize: 36,
		fontWeight: "bold",
	},
	changePhotoButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		gap: Spacing.xs,
	},
	changePhotoText: {
		fontSize: 14,
		fontWeight: "600",
	},
	fieldContainer: {
		marginBottom: Spacing.md,
	},
	fieldLabel: {
		fontSize: 13,
		fontWeight: "500",
		marginBottom: Spacing.xs,
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
	sectionDivider: {
		flexDirection: "row",
		alignItems: "center",
		marginVertical: Spacing.lg,
		gap: Spacing.sm,
	},
	dividerLine: {
		flex: 1,
		height: 1,
	},
	dividerText: {
		fontSize: 13,
		fontWeight: "500",
	},
	passwordHint: {
		fontSize: 13,
		marginBottom: Spacing.md,
		textAlign: "center",
	},
	buttonContainer: {
		marginTop: Spacing.lg,
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
