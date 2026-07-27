/**
 * Subscribe Screen — per-booth subscription plans (US storefront only).
 *
 * Hosts PricingPlansSelector for the booth passed via ?boothId=. Entry
 * points (SubscriptionStatusCard, booth create) only link here when the
 * external-purchase gate is open, but the gate is enforced again on this
 * screen: off the US storefront it renders the neutral browse-only message
 * (Guideline 3.1.1(a)) — never the checkout UI.
 */

import { router, useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PricingPlansSelector } from "@/components/subscription";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, scaleFont } from "@/constants/theme";
import { PURCHASES_UNAVAILABLE_COPY } from "@/constants/config";
import { useExternalPurchases } from "@/hooks/use-external-purchases";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function SubscribeScreen() {
	const { boothId: rawBoothId } = useLocalSearchParams<{ boothId: string }>();
	// Params can arrive as string[] on crafted/repeated deep links — the
	// selector must only ever receive a single booth id.
	const boothId = Array.isArray(rawBoothId) ? rawBoothId[0] : rawBoothId;
	const backgroundColor = useThemeColor({}, "background");
	const borderColor = useThemeColor({}, "border");
	const textColor = useThemeColor({}, "text");
	const textSecondary = useThemeColor({}, "textSecondary");

	const { enabled, isLoading } = useExternalPurchases();

	// Deep-link cold starts land here with no history — fall back to Booths.
	const goBack = () => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace("/(tabs)/booths");
		}
	};

	const showSelector = enabled && !isLoading && !!boothId;

	return (
		<SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
			<View style={[styles.header, { borderColor }]}>
				<TouchableOpacity onPress={goBack} style={styles.backButton}>
					<IconSymbol name="chevron.left" size={20} color={textColor} />
				</TouchableOpacity>
				<ThemedText style={styles.headerTitle}>Subscription Plans</ThemedText>
				<View style={styles.backButton} />
			</View>

			{showSelector ? (
				<View style={styles.content}>
					<PricingPlansSelector
						boothId={boothId}
						onCancel={goBack}
						onCheckoutComplete={() => {
							// Host owns post-checkout UX: back() returns to the
							// entry point (booth-create timeline advances to
							// "Scan to activate"; Settings shows the refreshed
							// subscription card).
							Alert.alert(
								"Payment Successful",
								"Your subscription has been activated!",
							);
							goBack();
						}}
					/>
				</View>
			) : (
				!isLoading && (
					<View style={styles.unavailableContainer}>
						<ThemedText
							style={[styles.unavailableText, { color: textSecondary }]}
						>
							{/* Gate-closed visits always get the neutral compliance line,
							    with or without a boothId; "No booth selected." only makes
							    sense where purchasing exists. */}
							{!enabled ? PURCHASES_UNAVAILABLE_COPY : "No booth selected."}
						</ThemedText>
					</View>
				)
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderBottomWidth: 1,
	},
	backButton: {
		width: 36,
		alignItems: "flex-start",
	},
	headerTitle: {
		fontSize: scaleFont(17),
		fontWeight: "600",
	},
	content: {
		flex: 1,
		padding: Spacing.lg,
	},
	unavailableContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing.xl,
	},
	unavailableText: {
		fontSize: scaleFont(14),
		textAlign: "center",
	},
});
