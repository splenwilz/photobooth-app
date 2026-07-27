/**
 * Subscription Details Modal
 *
 * Content-height bottom sheet with subscription state (status, renewal date,
 * auto-renewal). On the US storefront a "Manage on web" button opens the
 * Stripe customer portal (Guideline 3.1.1(a)); on every other storefront
 * the sheet stays read-only with no management affordance.
 */

import {
	useBoothSubscription,
	useCustomerPortal,
	useSubscriptionDetails,
} from "@/api/payments";
import { queryKeys } from "@/api/utils/query-keys";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	StatusColors,
	withAlpha,
	scaleFont,
} from "@/constants/theme";
import { EXTERNAL_PURCHASES } from "@/constants/config";
import { useExternalPurchases } from "@/hooks/use-external-purchases";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import {
	ActivityIndicator,
	Alert,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SubscriptionDetailsModalProps {
	visible: boolean;
	onClose: () => void;
	/** Booth ID for per-booth subscription. If null, shows user-level subscription. */
	boothId?: string | null;
}

/**
 * Format date for display
 */
function formatDate(dateString: string | null | undefined): string {
	if (!dateString) {
		return "—";
	}
	try {
		const date = new Date(dateString);
		// Check for Invalid Date
		if (Number.isNaN(date.getTime())) {
			return "—";
		}
		// Short format — the long weekday form wraps the detail row on phones.
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return "—";
	}
}

/**
 * Get status display info
 */
function getStatusInfo(status: string): { color: string; text: string } {
	switch (status) {
		case "active":
			return { color: StatusColors.success, text: "Active" };
		case "trialing":
			return { color: BRAND_COLOR, text: "Trial" };
		case "past_due":
			return { color: StatusColors.warning, text: "Past Due" };
		case "canceled":
			return { color: StatusColors.error, text: "Canceled" };
		default:
			return { color: StatusColors.neutral, text: status };
	}
}

export function SubscriptionDetailsModal({
	visible,
	onClose,
	boothId,
}: SubscriptionDetailsModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const insets = useSafeAreaInsets();

	// Use booth subscription if boothId provided, otherwise user-level subscription
	const isPerBooth = !!boothId;

	const {
		data: boothSubscription,
		isLoading: isBoothLoading,
		error: boothError,
	} = useBoothSubscription(visible && isPerBooth ? boothId : null);

	const {
		data: userSubscription,
		isLoading: isUserLoading,
		error: userError,
	} = useSubscriptionDetails(visible && !isPerBooth);

	// Normalize subscription data from either source
	const isLoading = isPerBooth ? isBoothLoading : isUserLoading;
	const error = isPerBooth ? boothError : userError;

	// Create normalized subscription object
	const subscription = isPerBooth
		? boothSubscription
			? {
					subscription_id: boothSubscription.subscription_id ?? "",
					status: boothSubscription.status ?? "inactive",
					is_active: boothSubscription.is_active,
					current_period_end: boothSubscription.current_period_end ?? "",
					cancel_at_period_end: boothSubscription.cancel_at_period_end,
					price_id: boothSubscription.price_id ?? "",
					booth_name: boothSubscription.booth_name,
				}
			: null
		: userSubscription;

	const statusInfo = subscription
		? getStatusInfo(subscription.status)
		: { color: StatusColors.neutral, text: "Unknown" };

	// US storefront only — the billing portal is an external purchase surface.
	const { enabled: canManageOnWeb } = useExternalPurchases();
	const portal = useCustomerPortal();
	const queryClient = useQueryClient();

	const handleManageOnWeb = () => {
		portal.mutate(
			// Stripe requires an http(s) return_url (the backend forwards it
			// verbatim) — a custom scheme would 400 the session creation. The
			// web dashboard is the return target; closing the browser brings
			// the user back here.
			{ return_url: `${EXTERNAL_PURCHASES.WEBSITE_URL}/dashboard/booths` },
			{
				onSuccess: async (data) => {
					if (!data?.portal_url) {
						Alert.alert("Error", "Could not open the billing portal.");
						return;
					}
					try {
						await WebBrowser.openAuthSessionAsync(
							data.portal_url,
							"boothiq://settings",
							{ preferEphemeralSession: true },
						);
					} catch {
						// Session couldn't open/complete (e.g. another auth session
						// active). Surface it, then still refresh below — we can't
						// distinguish "never opened" from "died mid-portal", and a
						// spurious refresh is harmless.
						Alert.alert("Error", "Could not open the billing portal.");
					}
					// Whatever happened in the portal (cancel, plan change,
					// nothing) is only knowable server-side — refresh on any
					// return, whatever the browser result type.
					queryClient.invalidateQueries({
						queryKey: queryKeys.payments.access(),
					});
					queryClient.invalidateQueries({
						queryKey: queryKeys.payments.subscription(),
					});
					queryClient.invalidateQueries({
						queryKey: queryKeys.payments.boothSubscriptions(),
					});
					if (boothId) {
						queryClient.invalidateQueries({
							queryKey: queryKeys.payments.boothSubscription(boothId),
						});
					}
				},
				onError: (error) => {
					Alert.alert(
						"Error",
						error.message || "Could not open the billing portal.",
					);
				},
			},
		);
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			// Android: dim the area under the status bar too.
			statusBarTranslucent
			onRequestClose={onClose}
		>
			{/* Content-height bottom sheet — a full pageSheet left the screen
			    mostly empty for three rows of content. */}
			<View style={styles.overlay}>
				<Pressable
					style={styles.backdrop}
					onPress={onClose}
					accessibilityLabel="Close"
				/>
				<View
					style={[
						styles.sheet,
						{ backgroundColor, paddingBottom: insets.bottom + Spacing.md },
					]}
				>
					{/* Header */}
					<View style={[styles.header, { borderColor }]}>
						<ThemedText type="subtitle">Subscription Details</ThemedText>
						<TouchableOpacity
							onPress={onClose}
							hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						>
							<IconSymbol name="xmark" size={20} color={textSecondary} />
						</TouchableOpacity>
					</View>

					<ScrollView
						style={styles.content}
						contentContainerStyle={styles.contentPadding}
						showsVerticalScrollIndicator={false}
					>
					{/* Loading State */}
					{isLoading && (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size="large" color={BRAND_COLOR} />
							<ThemedText style={[styles.loadingText, { color: textSecondary }]}>
								Loading subscription details...
							</ThemedText>
						</View>
					)}

					{/* Error State */}
					{error && !isLoading && (
						<View style={styles.errorContainer}>
							<IconSymbol
								name="exclamationmark.triangle"
								size={48}
								color={StatusColors.error}
							/>
							<ThemedText style={styles.errorText}>
								{error.message || "Failed to load subscription details"}
							</ThemedText>
							<TouchableOpacity
								style={[styles.retryButton, { borderColor }]}
								onPress={onClose}
							>
								<ThemedText style={{ color: BRAND_COLOR }}>Close</ThemedText>
							</TouchableOpacity>
						</View>
					)}

					{/* Subscription Details */}
					{subscription && !isLoading && (
						<>
							{/* Status header — name + status pill in one compact row */}
							<View
								style={[
									styles.statusCard,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<View
									style={[
										styles.statusIcon,
										{ backgroundColor: withAlpha(statusInfo.color, 0.15) },
									]}
								>
									<IconSymbol
										name="checkmark.seal.fill"
										size={22}
										color={statusInfo.color}
									/>
								</View>
								<ThemedText
									type="defaultSemiBold"
									style={styles.statusName}
									numberOfLines={1}
								>
									{isPerBooth && subscription && "booth_name" in subscription
										? subscription.booth_name
										: "Premium Subscription"}
								</ThemedText>
								<View
									style={[
										styles.statusPill,
										{ backgroundColor: withAlpha(statusInfo.color, 0.15) },
									]}
								>
									<ThemedText
										style={[styles.statusPillText, { color: statusInfo.color }]}
									>
										{statusInfo.text}
									</ThemedText>
								</View>
							</View>

							{/* Details Section */}
							<View
								style={[
									styles.detailsCard,
									{ backgroundColor: cardBg, borderColor },
								]}
							>
								<View style={styles.detailRow}>
									<ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
										{subscription.cancel_at_period_end ? "Ends on" : "Renews on"}
									</ThemedText>
									<ThemedText type="defaultSemiBold" style={styles.detailValue}>
										{formatDate(subscription.current_period_end)}
									</ThemedText>
								</View>

								<View style={[styles.divider, { backgroundColor: borderColor }]} />

								<View style={styles.detailRow}>
									<ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
										Auto-Renewal
									</ThemedText>
									<ThemedText type="defaultSemiBold" style={styles.detailValue}>
										{subscription.cancel_at_period_end ? "Off" : "On"}
									</ThemedText>
								</View>

							</View>

							{/* Warning if canceling */}
							{subscription.cancel_at_period_end && (
								<View
									style={[
										styles.warningCard,
										{ backgroundColor: withAlpha(StatusColors.warning, 0.1) },
									]}
								>
									<IconSymbol
										name="exclamationmark.triangle"
										size={20}
										color={StatusColors.warning}
									/>
									<ThemedText
										style={[styles.warningText, { color: StatusColors.warning }]}
									>
										Your subscription will end on{" "}
										{formatDate(subscription.current_period_end)}. You can
										resubscribe anytime.
									</ThemedText>
								</View>
							)}

							{/* Manage on web — US storefront only (external purchase gate) */}
							{canManageOnWeb && (
								<TouchableOpacity
									accessibilityRole="button"
									style={[
										styles.manageButton,
										{ backgroundColor: BRAND_COLOR },
										portal.isPending && styles.manageButtonDisabled,
									]}
									onPress={handleManageOnWeb}
									disabled={portal.isPending}
								>
									{portal.isPending ? (
										<ActivityIndicator size="small" color="white" />
									) : (
										<ThemedText style={styles.manageButtonText}>
											Manage Subscription on Web
										</ThemedText>
									)}
								</TouchableOpacity>
							)}
						</>
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
		justifyContent: "flex-end",
		backgroundColor: "rgba(0, 0, 0, 0.5)",
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
	},
	sheet: {
		borderTopLeftRadius: BorderRadius.xl,
		borderTopRightRadius: BorderRadius.xl,
		maxHeight: "85%",
	},
	manageButton: {
		marginTop: Spacing.md,
		borderRadius: BorderRadius.md,
		paddingVertical: Spacing.md,
		alignItems: "center",
	},
	manageButtonDisabled: {
		opacity: 0.6,
	},
	manageButtonText: {
		color: "#fff",
		fontSize: scaleFont(15),
		fontWeight: "700",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: Spacing.lg,
		borderBottomWidth: 1,
	},
	// The sheet is content-height: the scroll area must size to its children
	// (flexGrow: 0) but SHRINK when the sheet's maxHeight clamps it — RN's
	// default flexShrink is 0, which would clip instead of scroll.
	content: {
		flexGrow: 0,
		flexShrink: 1,
	},
	contentPadding: {
		padding: Spacing.lg,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: Spacing.xxl,
	},
	loadingText: {
		marginTop: Spacing.md,
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: Spacing.xxl,
	},
	errorText: {
		textAlign: "center",
		marginTop: Spacing.md,
		marginBottom: Spacing.lg,
	},
	retryButton: {
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
	},
	statusCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.md,
	},
	statusIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	statusName: {
		flex: 1,
		fontSize: scaleFont(16),
	},
	statusPill: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.lg,
	},
	statusPillText: {
		fontSize: scaleFont(13),
		fontWeight: "700",
	},
	detailsCard: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.md,
	},
	detailRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: Spacing.xs,
		gap: Spacing.md,
	},
	detailLabel: {
		fontSize: scaleFont(14),
		flexShrink: 0,
	},
	detailValue: {
		fontSize: scaleFont(14),
		textAlign: "right",
		flex: 1,
	},
	divider: {
		height: 1,
		marginVertical: Spacing.xs,
	},
	warningCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		marginBottom: Spacing.md,
		gap: Spacing.sm,
	},
	warningText: {
		flex: 1,
		fontSize: scaleFont(14),
		lineHeight: 20,
	},
});
