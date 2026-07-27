/**
 * Subscription Status Card
 *
 * Displays subscription state (status, plan name, renewal/expiry date).
 * On the US storefront a Subscribe CTA appears for booths without an active
 * subscription (external Stripe checkout, Guideline 3.1.1(a)); on every
 * other storefront the card stays read-only with no purchase affordance.
 */

import { useBoothSubscription, useSubscriptionAccess } from "@/api/payments";
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
import { useExternalPurchases } from "@/hooks/use-external-purchases";
import { useThemeColor } from "@/hooks/use-theme-color";
import { router } from "expo-router";
import {
	ActivityIndicator,
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
	const { enabled: canPurchase } = useExternalPurchases();

	// Determine which subscription data to use
	const isPerBooth = !!boothId;
	const isLoading = isPerBooth ? isBoothLoading : isUserLoading;

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

	// Dedicated empty state for "never subscribed" (status === null). Lapsed
	// states (canceled / past_due / unpaid) keep the status-badge layout below
	// so the user sees what happened to their previous subscription.
	const isNeverSubscribed = !hasSubscription && status === null;

	// Shared Subscribe CTA — US storefront only (external purchase gate).
	// Rendered by both the never-subscribed empty state and lapsed statuses.
	const subscribeCta = canPurchase && isPerBooth && !!boothId && (
		<TouchableOpacity
			accessibilityRole="button"
			style={[styles.subscribeButton, { backgroundColor: BRAND_COLOR }]}
			onPress={() =>
				router.push({ pathname: "/subscribe", params: { boothId } })
			}
		>
			<ThemedText style={styles.subscribeButtonText}>Subscribe</ThemedText>
		</TouchableOpacity>
	);

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

	if (isNeverSubscribed) {
		return (
			<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
				<View style={styles.emptyRow}>
					<View
						style={[
							styles.iconContainer,
							{ backgroundColor: withAlpha(BRAND_COLOR, 0.12) },
						]}
					>
						<IconSymbol name="star.fill" size={24} color={BRAND_COLOR} />
					</View>
					<View style={styles.emptyTextWrap}>
						<ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
							No active subscription
						</ThemedText>
						<ThemedText style={[styles.emptyMessage, { color: textSecondary }]}>
							{/* Imperative "Subscribe…" only where purchasing is allowed
							    (US storefront) — descriptive elsewhere (anti-steering). */}
							{canPurchase && isPerBooth
								? "Subscribe to activate this booth."
								: isPerBooth
									? "This booth isn't activated."
									: userAccess?.message || "No active subscription."}
						</ThemedText>
					</View>
				</View>

				{subscribeCta}
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
						? userAccess?.message || "Payment required"
						: status === "canceled"
							? "Subscription canceled"
							: "No active subscription"}
			</ThemedText>

			{!hasSubscription && subscribeCta}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	subscribeButton: {
		marginTop: Spacing.sm,
		borderRadius: BorderRadius.md,
		paddingVertical: Spacing.sm,
		alignItems: "center",
	},
	subscribeButtonText: {
		color: "#fff",
		fontSize: scaleFont(15),
		fontWeight: "700",
	},
	emptyRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: Spacing.sm,
		marginBottom: Spacing.sm,
	},
	emptyTextWrap: {
		flex: 1,
		gap: 2,
	},
	emptyTitle: {
		fontSize: scaleFont(15),
	},
	emptyMessage: {
		fontSize: scaleFont(13),
		lineHeight: scaleFont(19),
	},
	loadingContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing.md,
		gap: Spacing.sm,
	},
	loadingText: {
		fontSize: scaleFont(14),
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
		fontSize: scaleFont(12),
		fontWeight: "600",
	},
	planNameText: {
		fontSize: scaleFont(13),
		fontWeight: "500",
	},
	expiryText: {
		fontSize: scaleFont(12),
		marginTop: 2,
	},
	message: {
		fontSize: scaleFont(14),
	},
});
