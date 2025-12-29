/**
 * FormInput Component
 *
 * Styled text input for authentication forms.
 * Matches the app's brand theme with consistent styling.
 *
 * @see https://reactnative.dev/docs/textinput - React Native TextInput docs
 */

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  BorderRadius,
  BRAND_COLOR,
  Spacing,
  StatusColors,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import type React from "react";
import { useMemo, useState } from "react";
import {
  InputAccessoryView,
  Platform,
  StyleSheet,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

interface FormInputProps extends TextInputProps {
	/** Input label */
	label: string;
	/** Error message to display */
	error?: string;
	/** Left icon name */
	icon?: string;
	/** Whether this is a password field */
	isPassword?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
	label,
	error,
	icon,
	isPassword = false,
	style,
	...props
}) => {
	const [isFocused, setIsFocused] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const backgroundColor = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textColor = useThemeColor({}, "text");
	const textSecondary = useThemeColor({}, "textSecondary");

	// Generate unique ID for this input to prevent iOS recycling issues
	// @see https://github.com/facebook/react-native/issues/53050
	const inputAccessoryId = useMemo(
		() => `input-accessory-${label.replace(/\s+/g, "-").toLowerCase()}`,
		[label],
	);

	// Determine border color based on state
	const currentBorderColor = error
		? StatusColors.error
		: isFocused
			? BRAND_COLOR
			: borderColor;

	return (
		<View style={styles.container}>
			{/* Label */}
			<ThemedText style={[styles.label, { color: textSecondary }]}>
				{label}
			</ThemedText>

			{/* Input Container */}
			<View
				style={[
					styles.inputContainer,
					{
						backgroundColor,
						borderColor: currentBorderColor,
						borderWidth: isFocused ? 2 : 1,
					},
				]}
			>
				{/* Left Icon */}
				{icon && (
					<IconSymbol
						name={icon as any}
						size={20}
						color={isFocused ? BRAND_COLOR : textSecondary}
						style={styles.leftIcon}
					/>
				)}

				{/* Text Input */}
				{/*
				 * Fixes for iOS autofill yellow bar blocking typing:
				 * 1. inputAccessoryViewID - hides iOS keyboard accessory bar
				 * 2. textContentType="none" - disables iOS autofill
				 * 3. autoComplete="off" - disables Android autofill
				 * 4. rejectResponderTermination - prevents focus being stolen
				 * @see https://github.com/facebook/react-native/issues/53050
				 */}
				<TextInput
					{...props}
					style={[styles.input, { color: textColor }, style]}
					placeholderTextColor={textSecondary}
					secureTextEntry={isPassword && !showPassword}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					autoComplete="off"
					textContentType="none"
					autoCorrect={false}
					spellCheck={false}
					// iOS-specific: use custom (empty) InputAccessoryView
					inputAccessoryViewID={
						Platform.OS === "ios" ? inputAccessoryId : undefined
					}
					// Prevent focus being stolen by other responders
					rejectResponderTermination={true}
				/>

				{/* Password Toggle */}
				{isPassword && (
					<TouchableOpacity
						onPress={() => setShowPassword(!showPassword)}
						hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
					>
						<IconSymbol
							name={showPassword ? "eye.slash" : "eye"}
							size={20}
							color={textSecondary}
						/>
					</TouchableOpacity>
				)}
			</View>

			{/* Error Message */}
			{error && (
				<ThemedText style={[styles.error, { color: StatusColors.error }]}>
					{error}
				</ThemedText>
			)}

			{/* Empty InputAccessoryView to hide iOS keyboard bar that can block typing */}
			{Platform.OS === "ios" && (
				<InputAccessoryView nativeID={inputAccessoryId}>
					<View />
				</InputAccessoryView>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: Spacing.md,
	},
	label: {
		fontSize: 14,
		fontWeight: "500",
		marginBottom: Spacing.xs,
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: BorderRadius.lg,
		paddingHorizontal: Spacing.md,
		height: 52,
	},
	leftIcon: {
		marginRight: Spacing.sm,
	},
	input: {
		flex: 1,
		fontSize: 16,
		paddingVertical: Spacing.sm,
	},
	error: {
		fontSize: 12,
		marginTop: Spacing.xs,
	},
});
