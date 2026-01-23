/**
 * Subscription Status Card
 *
 * Displays current subscription status with action buttons.
 * Shows different states: active, trialing, past_due, canceled, or no subscription.
 */

import {
	useBoothSubscription,
	useCreateBoothCheckout,
	useCreateCheckout,
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

	// Mutations
	const createCheckout = useCreateCheckout();
	const createBoothCheckout = useCreateBoothCheckout();
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

	const statusColor = getStatusColor(status);
	const statusText = getStatusText(status);

	const handleSubscribe = () => {
		const priceId = process.env.EXPO_PUBLIC_STRIPE_PRICE_MONTHLY;
		const websiteUrl = process.env.EXPO_PUBLIC_WEBSITE_URL;

		if (isPerBooth && boothId) {
			// Per-booth subscription checkout
			createBoothCheckout.mutate(
				{
					booth_id: boothId,
					price_id: priceId,
					success_url: `${websiteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&booth_id=${boothId}`,
					cancel_url: `${websiteUrl}/pricing`,
				},
				{
					onSuccess: (data) => {
						Linking.openURL(data.checkout_url);
					},
					onError: (error) => {
						Alert.alert(
							"Error",
							error.message || "Failed to start checkout. Please try again.",
						);
					},
				},
			);
		} else {
			// User-level subscription checkout
			createCheckout.mutate(
				{
					price_id: priceId,
					success_url: `${websiteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
					cancel_url: `${websiteUrl}/pricing`,
				},
				{
					onSuccess: (data) => {
						Linking.openURL(data.checkout_url);
					},
					onError: (error) => {
						Alert.alert(
							"Error",
							error.message || "Failed to start checkout. Please try again.",
						);
					},
				},
			);
		}
	};

	const isCheckoutPending = isPerBooth
		? createBoothCheckout.isPending
		: createCheckout.isPending;

	const handleManageBilling = () => {
		const websiteUrl = process.env.EXPO_PUBLIC_WEBSITE_URL;

		customerPortal.mutate(
			{ return_url: `${websiteUrl}/pricing` },
			{
				onSuccess: (data) => {
					Linking.openURL(data.portal_url);
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
				{isPerBooth
					? hasSubscription
						? cancelAtPeriodEnd
							? "Subscription will not renew"
							: "This booth has an active subscription"
						: "Subscribe to activate this booth"
					: userAccess?.message || "No active subscription"}
			</ThemedText>

			{/* Action Buttons */}
			<View style={styles.actions}>
				{hasSubscription ? (
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
				) : (
					<TouchableOpacity
						style={[styles.button, { backgroundColor: BRAND_COLOR }]}
						onPress={handleSubscribe}
						disabled={isCheckoutPending}
					>
						{isCheckoutPending ? (
							<ActivityIndicator size="small" color="white" />
						) : (
							<>
								<IconSymbol name="star.fill" size={18} color="white" />
								<ThemedText style={styles.buttonText}>
									{isPerBooth ? "Subscribe to Booth" : "Subscribe Now"}
								</ThemedText>
							</>
						)}
					</TouchableOpacity>
				)}
			</View>
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
