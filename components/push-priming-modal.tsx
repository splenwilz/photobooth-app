/**
 * Push Priming Modal
 *
 * A pre-permission "soft ask" shown once at the value moment (after the user
 * connects their first booth). It explains the benefit BEFORE the OS prompt,
 * so we never spend the one-shot iOS system prompt on a cold user.
 *
 * - "Enable alerts" → full permission request (the OS prompt) + register token.
 * - "Not now" → iOS quiet PROVISIONAL fallback (no prompt) so alerts still flow
 *   and the user can upgrade later; Android just dismisses.
 * Either choice marks the priming flag so this never re-appears.
 *
 * @see https://developer.apple.com/design/human-interface-guidelines/managing-notifications
 */

import { useCallback, useRef, useState } from "react";
import {
	ActivityIndicator,
	Modal,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";

import { useRegisterDevice } from "@/api/push/queries";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	scaleFont,
	withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
	acquireExpoPushToken,
	markPushPrimingSeen,
} from "@/utils/push-notifications";

interface PushPrimingModalProps {
	visible: boolean;
	/** Called after a decision is made and the priming flag is persisted. */
	onClose: () => void;
}

export function PushPrimingModal({ visible, onClose }: PushPrimingModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const textSecondary = useThemeColor({}, "textSecondary");
	const borderColor = useThemeColor({}, "border");

	const registerDevice = useRegisterDevice();
	const [busy, setBusy] = useState(false);
	// Synchronous latch — `busy` state only blocks after the next commit, so a
	// fast double-tap could otherwise enter decide() twice.
	const inFlight = useRef(false);

	// Mark seen (so it never re-shows) then close — used for every exit path.
	const finish = useCallback(async () => {
		await markPushPrimingSeen();
		onClose();
	}, [onClose]);

	const decide = useCallback(
		async (provisional: boolean) => {
			if (inFlight.current) return;
			inFlight.current = true;
			setBusy(true);
			try {
				const result = await acquireExpoPushToken({
					requestIfUndetermined: true,
					provisional,
				});
				if (result.status === "granted") {
					registerDevice.mutate({
						expo_push_token: result.token,
						device_id: result.deviceId,
						platform: result.platform,
					});
				}
			} catch (e) {
				// onPress won't surface a rejected promise — swallow native failures.
				console.warn("[push] priming decision failed:", e);
			} finally {
				// Release the latch only after finish() completes, so the ~ms of its
				// SecureStore write can't re-enable a second decide().
				await finish();
				setBusy(false);
				inFlight.current = false;
			}
		},
		[registerDevice, finish],
	);

	return (
		<Modal
			visible={visible}
			animationType="fade"
			transparent
			onRequestClose={finish}
		>
			<View style={styles.overlay}>
				<View style={[styles.container, { backgroundColor }]}>
					<View
						style={[
							styles.iconCircle,
							{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
						]}
					>
						<IconSymbol name="bell.fill" size={32} color={BRAND_COLOR} />
					</View>

					<ThemedText type="subtitle" style={styles.title}>
						Never miss an incident
					</ThemedText>
					<ThemedText style={[styles.subtitle, { color: textSecondary }]}>
						BoothIQ can alert you the instant a booth goes offline, a printer
						jams, or a payment fails — even when the app is closed.
					</ThemedText>

					<TouchableOpacity
						style={[styles.primaryButton, { backgroundColor: BRAND_COLOR }]}
						onPress={() => decide(false)}
						disabled={busy}
						accessibilityRole="button"
						accessibilityLabel="Enable alerts"
					>
						{busy ? (
							<ActivityIndicator size="small" color="white" />
						) : (
							<ThemedText style={styles.primaryButtonText}>
								Enable alerts
							</ThemedText>
						)}
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.secondaryButton, { borderColor }]}
						onPress={() => decide(true)}
						disabled={busy}
						accessibilityRole="button"
						accessibilityLabel="Not now"
					>
						<ThemedText style={[styles.secondaryButtonText, { color: textSecondary }]}>
							Not now
						</ThemedText>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing.lg,
	},
	container: {
		width: "100%",
		maxWidth: 400,
		borderRadius: BorderRadius.xl,
		padding: Spacing.lg,
		alignItems: "center",
	},
	iconCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.md,
	},
	title: {
		fontSize: scaleFont(20),
		textAlign: "center",
		marginBottom: Spacing.xs,
	},
	subtitle: {
		fontSize: scaleFont(14),
		textAlign: "center",
		lineHeight: 20,
		marginBottom: Spacing.lg,
	},
	primaryButton: {
		width: "100%",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		marginBottom: Spacing.sm,
	},
	primaryButtonText: {
		color: "white",
		fontSize: scaleFont(16),
		fontWeight: "600",
	},
	secondaryButton: {
		width: "100%",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	secondaryButtonText: {
		fontSize: scaleFont(16),
		fontWeight: "600",
	},
});
