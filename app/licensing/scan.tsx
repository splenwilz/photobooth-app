/**
 * QR Scanner Screen
 *
 * Full-screen camera view for scanning booth QR codes.
 * After scanning, handles activation flow with optional booth pre-selection.
 *
 * Flow (with pre-selected booth from Settings):
 * 1. Scan QR code → get fingerprint
 * 2. Call pre-check with pre-selected booth
 * 3. If no subscription → show error
 * 4. If conflicts → show conflict warning modal
 * 5. User confirms → call activate with confirmations
 * 6. Success → show success message
 *
 * Flow (without pre-selected booth):
 * 1. Scan QR code → get fingerprint
 * 2. Show booth selection modal
 * 3. User selects booth → call pre-check
 * 4. If no subscription → show error
 * 5. If conflicts → show conflict warning modal
 * 6. User confirms → call activate with confirmations
 * 7. Success → show success message
 *
 * @see https://docs.expo.dev/versions/latest/sdk/camera/
 */

import {
	useActivateBooth,
	usePreCheckActivation,
	type ActivationConflict,
	type PreCheckActivationResponse,
} from "@/api/licensing";
import {
	BoothSelectionModal,
	ConflictWarningModal,
} from "@/components/licensing";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	StatusColors,
	withAlpha,
} from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Validates that the scanned data is a valid booth fingerprint
 * Expected format: 64 hexadecimal characters
 */
function isValidFingerprint(data: string): boolean {
	return /^[A-Fa-f0-9]{64}$/.test(data);
}

export default function ScanScreen() {
	// Get route params for pre-selected booth (from Settings)
	const { boothId: preSelectedBoothId, boothName: preSelectedBoothName } =
		useLocalSearchParams<{ boothId?: string; boothName?: string }>();

	const [permission, requestPermission] = useCameraPermissions();
	const [scanned, setScanned] = useState(false);
	const [torch, setTorch] = useState(false);

	// Store the scanned fingerprint
	const [fingerprint, setFingerprint] = useState<string | null>(null);

	// Modal states - don't show booth selection if we have a pre-selected booth
	const [showBoothSelection, setShowBoothSelection] = useState(false);
	const [showConflictWarning, setShowConflictWarning] = useState(false);

	// Pre-check result for passing to conflict modal
	const [preCheckResult, setPreCheckResult] =
		useState<PreCheckActivationResponse | null>(null);

	// Track selected booth
	const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);
	const [selectedBoothName, setSelectedBoothName] = useState<string>("");

	// Ref for immediate tracking to prevent rapid duplicate requests
	const isProcessingRef = useRef(false);

	// API hooks
	const preCheckActivation = usePreCheckActivation();
	const activateBooth = useActivateBooth();

	// Reset state when screen comes into focus (handles re-navigation)
	useFocusEffect(
		useCallback(() => {
			isProcessingRef.current = false;
			setScanned(false);
			setFingerprint(null);
			setShowBoothSelection(false);
			setShowConflictWarning(false);
			setPreCheckResult(null);
			setSelectedBoothId(null);
			setSelectedBoothName("");
		}, [])
	);

	/**
	 * Handle activation error codes
	 */
	const handleActivationError = useCallback(
		(errorCode: string | null, message: string, boothName: string) => {
			let title = "Activation Failed";
			let alertMessage = message;

			switch (errorCode) {
				case "NO_SUBSCRIPTION":
					title = "Subscription Required";
					alertMessage = `"${boothName}" doesn't have an active subscription. Please subscribe first.`;
					break;
				case "SESSION_EXPIRED":
					title = "QR Code Expired";
					alertMessage =
						"The QR code has expired. Please refresh the QR code on your booth and try again.";
					break;
				case "BOOTH_NOT_READY":
					title = "Booth Not Ready";
					alertMessage =
						"The booth is not ready for activation. Make sure it's showing the QR code screen.";
					break;
				case "BOOTH_NOT_FOUND":
					title = "Booth Not Found";
					alertMessage =
						"This booth was not found or you don't have permission to activate it.";
					break;
				case "FINGERPRINT_BOUND_ELSEWHERE":
					title = "Device Already Bound";
					alertMessage =
						"This device is bound to another booth. Please confirm the switch.";
					break;
				case "BOOTH_HAS_OTHER_DATA":
					title = "Booth Has Data";
					alertMessage =
						"This booth has data from another device. Please confirm to clear it.";
					break;
			}

			Alert.alert(title, alertMessage, [
				{
					text: "Try Again",
					onPress: () => {
						setShowBoothSelection(true);
					},
				},
				{
					text: "Cancel",
					style: "cancel",
					onPress: () => {
						resetState();
						router.back();
					},
				},
			]);
		},
		[],
	);

	/**
	 * Activate booth with confirmations
	 * @param fpOverride - Optional fingerprint override to avoid stale closure issues
	 */
	const activateWithConfirmations = useCallback(
		(boothId: string, boothName: string, conflicts: ActivationConflict[], fpOverride?: string) => {
			const fp = fpOverride || fingerprint;
			if (!fp) return;

			const hasConflicts = conflicts.length > 0;

			activateBooth.mutate(
				{
					fingerprint: fp,
					booth_id: boothId,
					confirm_clear_booth_data: hasConflicts,
					confirm_switch_fingerprint: hasConflicts,
				},
				{
					onSuccess: (result) => {
						setShowConflictWarning(false);

						if (result.success) {
							Alert.alert(
								"Booth Activated!",
								`${result.message}\n\nLicense Key: ${result.license_key}`,
								[
									{
										text: "Done",
										onPress: () => {
											resetState();
											router.back();
										},
									},
								],
							);
						} else {
							// Handle specific error codes
							handleActivationError(result.error_code, result.message, boothName);
						}
					},
					onError: (error) => {
						setShowConflictWarning(false);
						Alert.alert(
							"Error",
							error.message || "Failed to activate booth. Please try again.",
							[
								{
									text: "Try Again",
									onPress: () => {
										setShowBoothSelection(true);
									},
								},
								{
									text: "Cancel",
									style: "cancel",
									onPress: () => {
										resetState();
										router.back();
									},
								},
							],
						);
					},
				},
			);
		},
		[fingerprint, activateBooth, handleActivationError],
	);

	/**
	 * Handle QR code scanned
	 */
	const handleBarCodeScanned = useCallback(
		({ data }: { data: string }) => {
			// Prevent multiple scans
			if (isProcessingRef.current || scanned) return;

			isProcessingRef.current = true;

			// Validate fingerprint format
			if (!isValidFingerprint(data)) {
				Alert.alert(
					"Invalid QR Code",
					"This doesn't appear to be a valid booth QR code. Please scan the QR code displayed on your booth.",
					[
						{
							text: "Try Again",
							onPress: () => {
								isProcessingRef.current = false;
								setScanned(false);
							},
						},
					],
				);
				setScanned(true);
				return;
			}

			// Store fingerprint
			setFingerprint(data);
			setScanned(true);

			// If we have a pre-selected booth (from Settings), skip booth selection
			// and go directly to pre-check
			if (preSelectedBoothId && preSelectedBoothName) {
				setSelectedBoothId(preSelectedBoothId);
				setSelectedBoothName(preSelectedBoothName);
				// Trigger pre-check with the pre-selected booth
				preCheckActivation.mutate(
					{ fingerprint: data, booth_id: preSelectedBoothId },
					{
						onSuccess: (result) => {
							setPreCheckResult(result);

							if (!result.can_proceed) {
								// No subscription - show error
								Alert.alert(
									"Subscription Required",
									`"${preSelectedBoothName}" doesn't have an active subscription. Please subscribe to this booth first.`,
									[
										{
											text: "OK",
											onPress: () => {
												resetState();
												router.back();
											},
										},
									],
								);
								return;
							}

							if (result.conflicts.length > 0) {
								// Has conflicts - show warning modal
								setShowConflictWarning(true);
							} else {
								// No conflicts - proceed directly to activation
								// Pass fingerprint directly to avoid stale closure
								activateWithConfirmations(preSelectedBoothId, preSelectedBoothName, [], data);
							}
						},
						onError: (error) => {
							Alert.alert(
								"Error",
								error.message || "Failed to check activation. Please try again.",
								[
									{
										text: "Try Again",
										onPress: () => {
											resetState();
										},
									},
									{
										text: "Cancel",
										style: "cancel",
										onPress: () => {
											resetState();
											router.back();
										},
									},
								],
							);
						},
					},
				);
			} else {
				// No pre-selected booth - show booth selection modal
				setShowBoothSelection(true);
			}
		},
		[scanned, preSelectedBoothId, preSelectedBoothName, preCheckActivation, activateWithConfirmations],
	);

	/**
	 * Handle booth selected from modal
	 */
	const handleBoothSelected = useCallback(
		(boothId: string, boothName: string) => {
			if (!fingerprint) return;

			setSelectedBoothId(boothId);
			setSelectedBoothName(boothName);

			// Call pre-check
			preCheckActivation.mutate(
				{ fingerprint, booth_id: boothId },
				{
					onSuccess: (result) => {
						setPreCheckResult(result);

						if (!result.can_proceed) {
							// No subscription - show error
							setShowBoothSelection(false);
							Alert.alert(
								"Subscription Required",
								`"${boothName}" doesn't have an active subscription. Please subscribe to this booth first.`,
								[
									{
										text: "OK",
										onPress: () => {
											resetState();
											router.back();
										},
									},
								],
							);
							return;
						}

						if (result.conflicts.length > 0) {
							// Has conflicts - show warning modal
							setShowBoothSelection(false);
							setShowConflictWarning(true);
						} else {
							// No conflicts - proceed directly to activation
							setShowBoothSelection(false);
							activateWithConfirmations(boothId, boothName, []);
						}
					},
					onError: (error) => {
						setShowBoothSelection(false);
						Alert.alert(
							"Error",
							error.message || "Failed to check activation. Please try again.",
							[
								{
									text: "Try Again",
									onPress: () => {
										setShowBoothSelection(true);
										setSelectedBoothId(null);
									},
								},
								{
									text: "Cancel",
									style: "cancel",
									onPress: () => {
										resetState();
										router.back();
									},
								},
							],
						);
					},
				},
			);
		},
		[fingerprint, preCheckActivation, activateWithConfirmations],
	);

	/**
	 * Handle conflict confirmation
	 */
	const handleConflictConfirm = useCallback(() => {
		if (!selectedBoothId || !preCheckResult) return;
		activateWithConfirmations(
			selectedBoothId,
			selectedBoothName,
			preCheckResult.conflicts,
		);
	}, [
		selectedBoothId,
		selectedBoothName,
		preCheckResult,
		activateWithConfirmations,
	]);

	/**
	 * Reset all state
	 */
	const resetState = () => {
		isProcessingRef.current = false;
		setScanned(false);
		setFingerprint(null);
		setShowBoothSelection(false);
		setShowConflictWarning(false);
		setPreCheckResult(null);
		setSelectedBoothId(null);
		setSelectedBoothName("");
	};

	const handleClose = () => {
		resetState();
		router.back();
	};

	const handleBoothSelectionClose = () => {
		setShowBoothSelection(false);
		resetState();
	};

	const handleConflictClose = () => {
		setShowConflictWarning(false);
		// Reset selected booth state so user can make a fresh selection
		setSelectedBoothId(null);
		setSelectedBoothName("");
		setPreCheckResult(null);
		setShowBoothSelection(true);
	};

	const toggleTorch = () => {
		setTorch((prev) => !prev);
	};

	// Permission not yet determined
	if (!permission) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.centered}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
					<ThemedText style={styles.loadingText}>
						Checking camera permission...
					</ThemedText>
				</View>
			</SafeAreaView>
		);
	}

	// Permission denied
	if (!permission.granted) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.centered}>
					<View
						style={[
							styles.iconContainer,
							{ backgroundColor: withAlpha(StatusColors.warning, 0.15) },
						]}
					>
						<IconSymbol
							name="camera.fill"
							size={48}
							color={StatusColors.warning}
						/>
					</View>
					<ThemedText type="subtitle" style={styles.title}>
						Camera Access Required
					</ThemedText>
					<ThemedText style={styles.description}>
						We need camera access to scan the QR code on your booth for
						activation.
					</ThemedText>
					<TouchableOpacity
						style={[styles.button, { backgroundColor: BRAND_COLOR }]}
						onPress={requestPermission}
					>
						<ThemedText style={styles.buttonText}>Grant Permission</ThemedText>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.button, styles.secondaryButton]}
						onPress={handleClose}
					>
						<ThemedText style={[styles.buttonText, { color: BRAND_COLOR }]}>
							Cancel
						</ThemedText>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	const isProcessing = preCheckActivation.isPending || activateBooth.isPending;

	return (
		<View style={styles.container}>
			<CameraView
				style={styles.camera}
				facing="back"
				enableTorch={torch}
				barcodeScannerSettings={{
					barcodeTypes: ["qr"],
				}}
				onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
			/>
			{/* Overlay - positioned absolutely on top of camera */}
			<SafeAreaView style={styles.overlay}>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity style={styles.headerButton} onPress={handleClose}>
						<IconSymbol name="xmark" size={24} color="white" />
					</TouchableOpacity>
					<ThemedText style={styles.headerTitle}>Scan Booth QR Code</ThemedText>
					<TouchableOpacity style={styles.headerButton} onPress={toggleTorch}>
						<IconSymbol
							name={torch ? "flashlight.on.fill" : "flashlight.off.fill"}
							size={24}
							color={torch ? BRAND_COLOR : "white"}
						/>
					</TouchableOpacity>
				</View>

				{/* Scanner Frame */}
				<View style={styles.scannerArea}>
					<View style={styles.scannerFrame}>
						{/* Corner markers */}
						<View style={[styles.corner, styles.topLeft]} />
						<View style={[styles.corner, styles.topRight]} />
						<View style={[styles.corner, styles.bottomLeft]} />
						<View style={[styles.corner, styles.bottomRight]} />

						{/* Loading indicator when processing */}
						{isProcessing && (
							<View style={styles.processingOverlay}>
								<ActivityIndicator size="large" color="white" />
								<ThemedText style={styles.processingText}>
									{preCheckActivation.isPending
										? "Checking booth..."
										: "Activating booth..."}
								</ThemedText>
							</View>
						)}
					</View>
				</View>

				{/* Instructions */}
				<View style={styles.instructions}>
					<ThemedText style={styles.instructionText}>
						Point your camera at the QR code displayed on your booth
					</ThemedText>
				</View>
			</SafeAreaView>

			{/* Booth Selection Modal */}
			<BoothSelectionModal
				visible={showBoothSelection}
				onClose={handleBoothSelectionClose}
				onSelectBooth={handleBoothSelected}
				isSelecting={preCheckActivation.isPending}
				selectedBoothId={selectedBoothId}
			/>

			{/* Conflict Warning Modal */}
			{preCheckResult && (
				<ConflictWarningModal
					visible={showConflictWarning}
					onClose={handleConflictClose}
					onConfirm={handleConflictConfirm}
					boothName={selectedBoothName}
					conflicts={preCheckResult.conflicts}
					isActivating={activateBooth.isPending}
				/>
			)}
		</View>
	);
}

const FRAME_SIZE = 280;
const CORNER_SIZE = 40;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing.xl,
	},
	camera: {
		...StyleSheet.absoluteFillObject,
	},
	overlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.5)",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: Spacing.lg,
	},
	headerButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "rgba(0,0,0,0.3)",
		justifyContent: "center",
		alignItems: "center",
	},
	headerTitle: {
		color: "white",
		fontSize: 18,
		fontWeight: "600",
	},
	scannerArea: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	scannerFrame: {
		width: FRAME_SIZE,
		height: FRAME_SIZE,
		backgroundColor: "transparent",
		position: "relative",
	},
	corner: {
		position: "absolute",
		width: CORNER_SIZE,
		height: CORNER_SIZE,
		borderColor: BRAND_COLOR,
	},
	topLeft: {
		top: 0,
		left: 0,
		borderTopWidth: CORNER_WIDTH,
		borderLeftWidth: CORNER_WIDTH,
		borderTopLeftRadius: BorderRadius.md,
	},
	topRight: {
		top: 0,
		right: 0,
		borderTopWidth: CORNER_WIDTH,
		borderRightWidth: CORNER_WIDTH,
		borderTopRightRadius: BorderRadius.md,
	},
	bottomLeft: {
		bottom: 0,
		left: 0,
		borderBottomWidth: CORNER_WIDTH,
		borderLeftWidth: CORNER_WIDTH,
		borderBottomLeftRadius: BorderRadius.md,
	},
	bottomRight: {
		bottom: 0,
		right: 0,
		borderBottomWidth: CORNER_WIDTH,
		borderRightWidth: CORNER_WIDTH,
		borderBottomRightRadius: BorderRadius.md,
	},
	processingOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.7)",
		justifyContent: "center",
		alignItems: "center",
		borderRadius: BorderRadius.md,
	},
	processingText: {
		color: "white",
		marginTop: Spacing.md,
		fontSize: 16,
	},
	instructions: {
		padding: Spacing.xl,
		alignItems: "center",
	},
	instructionText: {
		color: "white",
		textAlign: "center",
		fontSize: 16,
		lineHeight: 24,
	},
	iconContainer: {
		width: 96,
		height: 96,
		borderRadius: 48,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.lg,
	},
	title: {
		textAlign: "center",
		marginBottom: Spacing.sm,
	},
	description: {
		textAlign: "center",
		color: "#888",
		marginBottom: Spacing.xl,
		lineHeight: 22,
	},
	loadingText: {
		marginTop: Spacing.md,
		color: "#888",
	},
	button: {
		width: "100%",
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		alignItems: "center",
		marginBottom: Spacing.sm,
	},
	secondaryButton: {
		backgroundColor: "transparent",
		borderWidth: 1,
		borderColor: BRAND_COLOR,
	},
	buttonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
});
