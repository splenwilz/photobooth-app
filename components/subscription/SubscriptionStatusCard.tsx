/**
 * Subscription Status Card
 *
 * Read-only display of subscription state. Shows status, plan name, and
 * expiry date. For active subscriptions, exposes a "Manage Billing" button
 * that opens the Stripe customer portal — managing an existing subscription
 * is allowed by Apple. There is no in-app purchase initiation.
 */

import {
	useBoothSubscription,
	useCustomerPortal,
	useSubscriptionAccess,
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
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";

interface SubscriptionStatusCardProps {
	/** Booth ID for per-booth subscription. If null, shows user-level subscription. */
	boothId?: string | null;
	/** Called when user wants to see full subscription details */
	onViewDetails?: () => void;
	/** Plan name to display when subscribed */
	planName?: string | null;
}

/**
 * Get status color based on subscription status
 */
function getStatusColor(status: string | null): string {
	switch (status) {
		case "active":
			return StatusColors.success;
		case "trialing":
			return BRAND_COLOR;
		case "past_due":
			return StatusColors.warning;
		case "canceled":
		case "unpaid":
		case "incomplete":
		case "incomplete_expired":
			return StatusColors.error;
		default:
			return StatusColors.neutral;
	}
}

/**
 * Get human-readable status text
 */
function getStatusText(status: string | null): string {
	switch (status) {
		case "active":
			return "Active";
		case "trialing":
			return "Trial";
		case "past_due":
			return "Past Due";
		case "canceled":
			return "Canceled";
		case "unpaid":
			return "Unpaid";
		case "incomplete":
			return "Incomplete";
		case "incomplete_expired":
			return "Expired";
		default:
			return "No Subscription";
	}
}

/**
 * Format date for display
 */
function formatExpiryDate(dateString: string | null): string {
	if (!dateString) return "";
	try {
		const date = new Date(dateString);
		// Check for Invalid Date
		if (Number.isNaN(date.getTime())) {
			return "";
		}
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return "";
	}
}

export function SubscriptionStatusCard({
	boothId,
	onViewDetails,
	planName,
}: SubscriptionStatusCardProps) {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	// Use booth subscription if boothId provided, otherwise user-level subscription
	const { data: boothSubscription, isLoading: isBoothLoading } =
		useBoothSubscription(boothId ?? null);
	const { data: userAccess, isLoading: isUserLoading } = useSubscriptionAccess();

	// Determine which subscription data to use
	const isPerBooth = !!boothId;
	const isLoading = isPerBooth ? isBoothLoading : isUserLoading;

	const customerPortal = useCustomerPortal();

	// Normalize subscription data from either source
	const hasSubscription = isPerBooth
		? boothSubscription?.is_active ?? false
		: userAccess?.has_access ?? false;
	const status = isPerBooth
		? boothSubscription?.status ?? null
		: userAccess?.subscription_status ?? null;
	const expiresAt = isPerBooth
		? boothSubscription?.current_period_end ?? null
		: userAccess?.expires_at ?? null;
	const cancelAtPeriodEnd = isPerBooth
		? boothSubscription?.cancel_at_period_end ?? false
		: false;
	// A Stripe-tracked subscription exists for any non-null status — covers
	// active/trialing AND past_due/unpaid/incomplete so users in those
	// recovery states can still reach the Stripe portal to fix billing.
	const subscriptionExists = status !== null;

	const statusColor = getStatusColor(status);
	const statusText = getStatusText(status);

	const handleManageBilling = async () => {
		customerPortal.mutate(
			{ return_url: "boothiq://settings" },
			{
				onSuccess: async (data) => {
					const portalUrl = data?.portal_url;

					// Validate URL exists and is well-formed
					if (!portalUrl || typeof portalUrl !== "string") {
						Alert.alert(
							"Error",
							"Could not get billing portal URL. Please try again.",
						);
						return;
					}

					// Validate URL is http(s) — never log the URL itself; it grants
					// access to the customer's billing session.
					if (!portalUrl.startsWith("http://") && !portalUrl.startsWith("https://")) {
						console.error("[Billing] Invalid portal URL format");
						Alert.alert(
							"Error",
							"Invalid billing portal URL. Please try again.",
						);
						return;
					}

					// Check if URL can be opened
					try {
						const canOpen = await Linking.canOpenURL(portalUrl);
						if (canOpen) {
							Linking.openURL(portalUrl);
						} else {
							console.error("[Billing] Cannot open portal URL");
							Alert.alert(
								"Error",
								"Unable to open billing portal. Please try again.",
							);
						}
					} catch {
						console.error("[Billing] Error opening portal");
						Alert.alert(
							"Error",
							"Failed to open billing portal. Please try again.",
						);
					}
				},
				onError: (error) => {
					Alert.alert(
						"Error",
						error.message || "Failed to open billing portal. Please try again.",
					);
				},
			},
		);
	};

	if (isLoading) {
		return (
			<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="small" color={BRAND_COLOR} />
					<ThemedText style={[styles.loadingText, { color: textSecondary }]}>
						Loading subscription...
					</ThemedText>
				</View>
			</View>
		);
	}

	return (
		<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
			{/* Status Header */}
			<View style={styles.header}>
				<View style={styles.statusInfo}>
					<View
						style={[
							styles.iconContainer,
							{ backgroundColor: withAlpha(statusColor, 0.15) },
						]}
					>
						<IconSymbol
							name={hasSubscription ? "checkmark.seal.fill" : "xmark.seal"}
							size={24}
							color={statusColor}
						/>
					</View>
					<View>
						<View style={styles.statusRow}>
							<View
								style={[styles.statusBadge, { backgroundColor: statusColor }]}
							>
								<ThemedText style={styles.statusBadgeText}>
									{statusText}
								</ThemedText>
							</View>
							{planName && hasSubscription && (
								<ThemedText style={[styles.planNameText, { color: textSecondary }]}>
									{planName}
								</ThemedText>
							)}
						</View>
						{expiresAt && (
							<ThemedText
								style={[styles.expiryText, { color: textSecondary }]}
							>
								{status === "canceled" || cancelAtPeriodEnd
									? `Expires: ${formatExpiryDate(expiresAt)}`
									: `Renews: ${formatExpiryDate(expiresAt)}`}
							</ThemedText>
						)}
					</View>
				</View>

				{onViewDetails && hasSubscription && (
					<TouchableOpacity onPress={onViewDetails} hitSlop={8}>
						<IconSymbol
							name="chevron.right"
							size={20}
							color={textSecondary}
						/>
					</TouchableOpacity>
				)}
			</View>

			{/* Message */}
			<ThemedText style={[styles.message, { color: textSecondary }]}>
				{hasSubscription
					? cancelAtPeriodEnd
						? "Subscription will not renew"
						: isPerBooth
							? "This booth has an active subscription"
							: userAccess?.message || "Subscription is active"
					: status === "past_due" ||
						  status === "unpaid" ||
						  status === "incomplete"
						? userAccess?.message ||
							"Payment required — manage billing to continue"
						: status === "canceled"
							? "Subscription canceled"
							: "No active subscription"}
			</ThemedText>

			{/* Manage Billing — any user with a subscription record (incl. past_due/unpaid recovery) */}
			{subscriptionExists && (
				<View style={styles.actions}>
					<TouchableOpacity
						style={[styles.button, styles.secondaryButton, { borderColor }]}
						onPress={handleManageBilling}
						disabled={customerPortal.isPending}
					>
						{customerPortal.isPending ? (
							<ActivityIndicator size="small" color={BRAND_COLOR} />
						) : (
							<>
								<IconSymbol name="creditcard" size={18} color={BRAND_COLOR} />
								<ThemedText
									style={[styles.buttonText, { color: BRAND_COLOR }]}
								>
									Manage Billing
								</ThemedText>
							</>
						)}
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	loadingContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing.md,
		gap: Spacing.sm,
	},
	loadingText: {
		fontSize: 14,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: Spacing.sm,
	},
	statusInfo: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	iconContainer: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: "center",
		alignItems: "center",
	},
	statusRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs,
	},
	statusBadge: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: BorderRadius.sm,
	},
	statusBadgeText: {
		color: "white",
		fontSize: 12,
		fontWeight: "600",
	},
	planNameText: {
		fontSize: 13,
		fontWeight: "500",
	},
	expiryText: {
		fontSize: 12,
		marginTop: 2,
	},
	message: {
		fontSize: 14,
		marginBottom: Spacing.md,
	},
	actions: {
		flexDirection: "row",
		gap: Spacing.sm,
	},
	button: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.sm,
		paddingHorizontal: Spacing.md,
		borderRadius: BorderRadius.md,
		gap: Spacing.xs,
	},
	secondaryButton: {
		backgroundColor: "transparent",
		borderWidth: 1,
	},
	buttonText: {
		color: "white",
		fontSize: 14,
		fontWeight: "600",
	},
});
