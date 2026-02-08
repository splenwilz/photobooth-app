import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { BorderRadius, BRAND_COLOR, Spacing, StatusColors } from "@/constants/theme";

interface ErrorStateProps {
	title: string;
	message?: string;
	onRetry: () => void;
	retryButtonText?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
	title,
	message,
	onRetry,
	retryButtonText = "Try Again",
}) => {
	const textSecondary = useThemeColor({}, "textSecondary");

	return (
		<View style={styles.container}>
			<IconSymbol
				name="exclamationmark.triangle.fill"
				size={48}
				color={StatusColors.error}
			/>
			<ThemedText style={styles.title}>{title}</ThemedText>
			{message && (
				<ThemedText style={[styles.message, { color: textSecondary }]}>
					{message}
				</ThemedText>
			)}
			<TouchableOpacity
				style={[styles.retryButton, { backgroundColor: BRAND_COLOR }]}
				onPress={onRetry}
			>
				<ThemedText style={styles.retryButtonText}>
					{retryButtonText}
				</ThemedText>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: Spacing.xl,
	},
	title: {
		fontSize: 18,
		fontWeight: "600",
		marginTop: Spacing.md,
		textAlign: "center",
	},
	message: {
		fontSize: 14,
		marginTop: Spacing.sm,
		textAlign: "center",
	},
	retryButton: {
		marginTop: Spacing.lg,
		paddingVertical: Spacing.sm,
		paddingHorizontal: Spacing.xl,
		borderRadius: BorderRadius.md,
	},
	retryButtonText: {
		color: "#FFFFFF",
		fontWeight: "600",
	},
});
