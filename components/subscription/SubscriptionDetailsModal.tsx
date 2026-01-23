/**
 * Subscription Details Modal
 *
 * Full-screen modal showing detailed subscription information.
 * Allows managing billing and canceling subscription.
 */

import {
	useBoothSubscription,
	useCancelBoothSubscription,
	useCancelSubscription,
	useCustomerPortal,
	useSubscriptionDetails,
} from "@/api/payments";
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
import * as Linking from "expo-linking";
import {
	ActivityIndicator,
	Alert,
	Modal,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";

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
		return date.toLocaleDateString("en-US", {
			weekday: "long",
			month: "long",
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

	const cancelSubscription = useCancelSubscription();
	const cancelBoothSubscription = useCancelBoothSubscription();
	const customerPortal = useCustomerPortal();

	const statusInfo = subscription
		? getStatusInfo(subscription.status)
		: { color: StatusColors.neutral, text: "Unknown" };

	const handleManageBilling = () => {
		const websiteUrl = process.env.EXPO_PUBLIC_WEBSITE_URL;

		customerPortal.mutate(
			{ return_url: `${websiteUrl}/pricing` },
			{
				onSuccess: (data) => {
					Linking.openURL(data.portal_url);
					onClose();
				},
				onError: (err) => {
					Alert.alert(
						"Error",
						err.message || "Failed to open billing portal.",
					);
				},
			},
		);
	};

	const handleCancelSubscription = () => {
		const boothName =
			isPerBooth && subscription && "booth_name" in subscription
				? subscription.booth_name
				: null;
		const message = boothName
			? `Are you sure you want to cancel the subscription for "${boothName}"? You'll still have access until the end of your billing period.`
			: "Are you sure you want to cancel your subscription? You'll still have access until the end of your billing period.";

		Alert.alert("Cancel Subscription", message, [
			{ text: "Keep Subscription", style: "cancel" },
			{
				text: "Cancel Subscription",
				style: "destructive",
				onPress: () => {
					if (isPerBooth && boothId) {
						// Cancel booth subscription
						cancelBoothSubscription.mutate(
							{ boothId, immediately: false },
							{
								onSuccess: () => {
									Alert.alert(
										"Subscription Canceled",
										"The booth subscription will end at the end of the current billing period.",
									);
									onClose();
								},
								onError: (err) => {
									Alert.alert(
										"Error",
										err.message || "Failed to cancel subscription.",
									);
								},
							},
						);
					} else {
						// Cancel user subscription
						cancelSubscription.mutate(false, {
							onSuccess: () => {
								Alert.alert(
									"Subscription Canceled",
									"Your subscription will end at the end of the current billing period.",
								);
								onClose();
							},
							onError: (err) => {
								Alert.alert(
									"Error",
									err.message || "Failed to cancel subscription.",
								);
							},
						});
					}
				},
			},
		]);
	};

	const isCancelPending = isPerBooth
		? cancelBoothSubscription.isPending
		: cancelSubscription.isPending;

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<View style={[styles.container, { backgroundColor }]}>
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
							{/* Status Card */}
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
										size={32}
										color={statusInfo.color}
									/>
								</View>
								<View
									style={[
										styles.statusBadge,
										{ backgroundColor: statusInfo.color },
									]}
								>
									<ThemedText style={styles.statusBadgeText}>
										{statusInfo.text}
									</ThemedText>
								</View>
								<ThemedText style={[styles.planName, { color: textSecondary }]}>
									{isPerBooth && subscription && "booth_name" in subscription
										? subscription.booth_name
										: "Premium Subscription"}
								</ThemedText>
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
										Billing Period Ends
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

								<View style={[styles.divider, { backgroundColor: borderColor }]} />

								<View style={styles.detailRow}>
									<ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
										Subscription ID
									</ThemedText>
									<ThemedText
										style={[styles.subscriptionId, { color: textSecondary }]}
										numberOfLines={1}
									>
										{subscription.subscription_id}
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

							{/* Actions */}
							<View style={styles.actions}>
								<TouchableOpacity
									style={[styles.actionButton, { backgroundColor: BRAND_COLOR }]}
									onPress={handleManageBilling}
									disabled={customerPortal.isPending}
								>
									{customerPortal.isPending ? (
										<ActivityIndicator size="small" color="white" />
									) : (
										<>
											<IconSymbol name="creditcard" size={20} color="white" />
											<ThemedText style={styles.actionButtonText}>
												Manage Payment Method
											</ThemedText>
										</>
									)}
								</TouchableOpacity>

								{!subscription.cancel_at_period_end && (
									<TouchableOpacity
										style={[
											styles.actionButton,
											styles.cancelButton,
											{ borderColor: StatusColors.error },
										]}
										onPress={handleCancelSubscription}
										disabled={isCancelPending}
									>
										{isCancelPending ? (
											<ActivityIndicator
												size="small"
												color={StatusColors.error}
											/>
										) : (
											<ThemedText
												style={[
													styles.actionButtonText,
													{ color: StatusColors.error },
												]}
											>
												Cancel Subscription
											</ThemedText>
										)}
									</TouchableOpacity>
								)}
							</View>
						</>
					)}
				</ScrollView>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: Spacing.lg,
		borderBottomWidth: 1,
	},
	content: {
		flex: 1,
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
		alignItems: "center",
		padding: Spacing.xl,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.md,
	},
	statusIcon: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.md,
	},
	statusBadge: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.xs,
		borderRadius: BorderRadius.md,
		marginBottom: Spacing.xs,
	},
	statusBadgeText: {
		color: "white",
		fontSize: 14,
		fontWeight: "600",
	},
	planName: {
		fontSize: 14,
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
		fontSize: 14,
		flexShrink: 0,
	},
	detailValue: {
		fontSize: 14,
		textAlign: "right",
		flex: 1,
	},
	divider: {
		height: 1,
		marginVertical: Spacing.xs,
	},
	subscriptionId: {
		fontSize: 12,
		maxWidth: 150,
		textAlign: "right",
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
		fontSize: 14,
		lineHeight: 20,
	},
	actions: {
		gap: Spacing.sm,
		marginTop: Spacing.md,
	},
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		gap: Spacing.sm,
	},
	actionButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
	cancelButton: {
		backgroundColor: "transparent",
		borderWidth: 1,
	},
});
