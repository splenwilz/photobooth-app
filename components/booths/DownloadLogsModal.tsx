/**
 * DownloadLogsModal Component
 *
 * Bottom sheet modal for downloading diagnostic logs from a booth.
 * The API sends a DOWNLOAD_LOGS command to the booth, waits for it to
 * collect/zip/upload logs to S3, then returns a presigned download URL.
 *
 * @see app/(tabs)/settings.tsx - Used in Settings screen
 * @see POST /api/v1/booths/{booth_id}/download-logs - API endpoint
 */

import React, { useState } from "react";
import {
	Modal,
	StyleSheet,
	TouchableOpacity,
	View,
	ActivityIndicator,
	ScrollView,
	Alert,
	useWindowDimensions,
} from "react-native";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDownloadBoothLogs } from "@/api/booths";
import type { LogType } from "@/api/booths/types";

interface DownloadLogsModalProps {
	/** Whether the modal is visible */
	visible: boolean;
	/** Booth ID to download logs from (required for API) */
	boothId: string | null;
	/** Booth name for display */
	boothName: string;
	/** Callback when modal is closed */
	onClose: () => void;
}

/** Available log types with display labels */
const LOG_TYPE_OPTIONS: { value: LogType; label: string }[] = [
	{ value: "application", label: "Application" },
	{ value: "errors", label: "Errors" },
	{ value: "hardware", label: "Hardware" },
	{ value: "transactions", label: "Transactions" },
	{ value: "performance", label: "Performance" },
	{ value: "application-debug", label: "Debug" },
];

/** Available time range options */
const HOURS_OPTIONS = [
	{ value: 1, label: "1h" },
	{ value: 6, label: "6h" },
	{ value: 24, label: "24h" },
	{ value: 48, label: "48h" },
	{ value: 168, label: "7d" },
	{ value: 720, label: "30d" },
];

const DEFAULT_LOG_TYPES: LogType[] = ["application", "errors"];
const DEFAULT_HOURS = 24;

export function DownloadLogsModal({
	visible,
	boothId,
	boothName,
	onClose,
}: DownloadLogsModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");

	// API mutation
	const downloadLogsMutation = useDownloadBoothLogs();

	// Safe area insets and dimensions
	const insets = useSafeAreaInsets();
	const { height: screenHeight } = useWindowDimensions();

	// Form state
	const [selectedLogTypes, setSelectedLogTypes] =
		useState<LogType[]>(DEFAULT_LOG_TYPES);
	const [selectedHours, setSelectedHours] = useState(DEFAULT_HOURS);

	// Use mutation's pending state instead of local state
	const isProcessing = downloadLogsMutation.isPending;

	// Validation
	const isValid = selectedLogTypes.length > 0 && !!boothId;

	const toggleLogType = (logType: LogType) => {
		setSelectedLogTypes((prev) =>
			prev.includes(logType)
				? prev.filter((t) => t !== logType)
				: [...prev, logType],
		);
	};

	const handleSubmit = async () => {
		if (!isValid || !boothId) return;

		try {
			const data = await downloadLogsMutation.mutateAsync({
				boothId,
				log_types: selectedLogTypes,
				hours: selectedHours,
			});

			handleClose();

			// Format file size for display
			const fileSizeKB = Math.round(data.file_size / 1024);
			const fileSizeDisplay =
				fileSizeKB > 1024
					? `${(fileSizeKB / 1024).toFixed(1)} MB`
					: `${fileSizeKB} KB`;

			Alert.alert(
				"Logs Ready",
				`Log file ready (${fileSizeDisplay}). Open in browser to download?`,
				[
					{ text: "Cancel", style: "cancel" },
					{
						text: "Download",
						onPress: async () => {
							try {
								await Linking.openURL(data.download_url);
							} catch {
								Alert.alert("Error", "Could not open download link.");
							}
						},
					},
				],
			);
		} catch (error: any) {
			const message = error?.message || "Failed to download logs.";
			Alert.alert("Download Failed", message, [{ text: "OK" }]);
		}
	};

	const handleClose = () => {
		if (!isProcessing) {
			onClose();
			setSelectedLogTypes(DEFAULT_LOG_TYPES);
			setSelectedHours(DEFAULT_HOURS);
		}
	};

	const bottomPadding = Math.max(insets.bottom, Spacing.lg);

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
					testID="backdrop"
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
							maxHeight: screenHeight * 0.85,
						},
					]}
				>
					{/* Header */}
					<View style={styles.header}>
						<View style={[styles.handle, { backgroundColor: borderColor }]} />
						<View style={styles.headerRow}>
							<ThemedText type="subtitle">Download Logs</ThemedText>
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
							Download diagnostic logs from {boothName}
						</ThemedText>
					</View>

					{/* Scrollable Content */}
					<ScrollView
						style={styles.scrollContent}
						contentContainerStyle={styles.scrollContentContainer}
						showsVerticalScrollIndicator={false}
						bounces={true}
					>
						{/* Info Card */}
						<View
							style={[
								styles.infoCard,
								{
									backgroundColor: withAlpha(BRAND_COLOR, 0.1),
									borderColor: BRAND_COLOR,
								},
							]}
						>
							<IconSymbol
								name="info.circle"
								size={20}
								color={BRAND_COLOR}
							/>
							<ThemedText
								style={[styles.infoText, { color: textSecondary }]}
							>
								Logs will be collected from the booth, zipped, and uploaded.
								This may take up to 2 minutes.
							</ThemedText>
						</View>

						{/* Log Types */}
						<View style={styles.fieldGroup}>
							<ThemedText
								type="defaultSemiBold"
								style={styles.fieldLabel}
							>
								Log Types
							</ThemedText>
							<View style={styles.chipGrid}>
								{LOG_TYPE_OPTIONS.map((option) => {
									const isSelected = selectedLogTypes.includes(option.value);
									return (
										<TouchableOpacity
											key={option.value}
											testID={`chip-${option.value}`}
											style={[
												styles.chip,
												{
													backgroundColor: isSelected
														? BRAND_COLOR
														: cardBg,
													borderColor: isSelected
														? BRAND_COLOR
														: borderColor,
												},
											]}
											onPress={() => toggleLogType(option.value)}
											disabled={isProcessing}
											activeOpacity={0.7}
										>
											<ThemedText
												style={[
													styles.chipText,
													{
														color: isSelected ? "white" : textColor,
													},
												]}
											>
												{option.label}
											</ThemedText>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>

						{/* Time Range */}
						<View style={styles.fieldGroup}>
							<ThemedText
								type="defaultSemiBold"
								style={styles.fieldLabel}
							>
								Time Range
							</ThemedText>
							<View style={styles.chipRow}>
								{HOURS_OPTIONS.map((option) => {
									const isSelected = selectedHours === option.value;
									return (
										<TouchableOpacity
											key={option.value}
											testID={`hours-${option.value}`}
											style={[
												styles.hoursChip,
												{
													backgroundColor: isSelected
														? BRAND_COLOR
														: cardBg,
													borderColor: isSelected
														? BRAND_COLOR
														: borderColor,
												},
											]}
											onPress={() => setSelectedHours(option.value)}
											disabled={isProcessing}
											activeOpacity={0.7}
										>
											<ThemedText
												style={[
													styles.chipText,
													{
														color: isSelected ? "white" : textColor,
													},
												]}
											>
												{option.label}
											</ThemedText>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>

						{/* Submit Button */}
						<View style={styles.buttonContainer}>
							<TouchableOpacity
								testID="submit-button"
								style={[
									styles.submitButton,
									{
										backgroundColor: isValid ? BRAND_COLOR : borderColor,
										opacity: isValid && !isProcessing ? 1 : 0.6,
									},
								]}
								onPress={handleSubmit}
								disabled={!isValid || isProcessing}
								activeOpacity={0.8}
							>
								{isProcessing ? (
									<View style={styles.processingContainer}>
										<ActivityIndicator color="white" />
										<ThemedText style={styles.processingText}>
											Collecting logs...
										</ThemedText>
									</View>
								) : (
									<ThemedText style={styles.submitButtonText}>
										Download Logs
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
	infoCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.sm,
		marginBottom: Spacing.lg,
	},
	infoText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
	},
	fieldGroup: {
		marginBottom: Spacing.lg,
	},
	fieldLabel: {
		fontSize: 14,
		marginBottom: Spacing.sm,
	},
	chipGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
	},
	chip: {
		paddingVertical: Spacing.sm,
		paddingHorizontal: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
	},
	chipRow: {
		flexDirection: "row",
		gap: Spacing.sm,
	},
	hoursChip: {
		flex: 1,
		paddingVertical: Spacing.sm + 2,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	chipText: {
		fontSize: 14,
		fontWeight: "600",
		textAlign: "center",
	},
	buttonContainer: {
		marginTop: Spacing.xs,
	},
	submitButton: {
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 50,
	},
	submitButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
	processingContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	processingText: {
		color: "white",
		fontSize: 14,
		fontWeight: "500",
	},
});
