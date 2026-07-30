/**
 * Subscription Status Card
 *
 * Displays subscription state (status, plan name, renewal/expiry date).
 * On the US storefront a Subscribe CTA appears for booths without an active
 * subscription (external Stripe checkout, Guideline 3.1.1(a)); on every
 * other storefront the card stays read-only with no purchase affordance.
 */

import {
	useBoothSubscriptionState,
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
	scaleFont,
} from "@/constants/theme";
import { useExternalPurchases } from "@/hooks/use-external-purchases";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
	canStartNewSubscription,
	getStatusDisplay,
} from "./subscription-status";
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

// Status labels/colours come from the shared map so this card and the details
// sheet can never disagree about the same booth. The card previously had its
// own switch whose default returned "No Subscription" for any unrecognised
// status — telling the user they had nothing when we simply didn't know.

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

	// Per-booth reads use the always-200 state endpoint: a booth that never
	// subscribed reports state: "none" as data. The older
	// GET /booths/{id}/subscription returns 404 for the same situation, which
	// this card only rendered correctly because it ignored `error` and fell
	// through on undefined data.
	const {
		data: boothSubscription,
		isLoading: isBoothLoading,
		isError: isBoothError,
	} = useBoothSubscriptionState(boothId ?? null);
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

	const { color: statusColor, text: statusText } = getStatusDisplay(status);

	// A booth can be fully paid and still refuse to run when it has no hardware
	// identity on file. That is not a billing problem and is not fixed by
	// anything on this card, so it is surfaced as its own notice.
	// Suppressed for dead subscriptions: telling the owner of a cancelled booth
	// to "scan the QR code to activate it" is noise — activation is not what is
	// wrong, and acting on it would not help.
	const activationRequired = isPerBooth
		? (boothSubscription?.activation_required ?? false) &&
			boothSubscription?.state !== "canceled" &&
			boothSubscription?.state !== "none"
		: false;

	// Dedicated empty state for "never subscribed". Lapsed states (canceled /
	// past_due / unpaid) keep the status-badge layout below so the user sees
	// what happened to their previous subscription.
	const isNeverSubscribed = isPerBooth
		? boothSubscription?.state === "none"
		: !hasSubscription && status === null;

	// Anything that isn't "never subscribed" has a subscription to manage —
	// including lapsed ones. Gating this on is_active made the details sheet,
	// and therefore card update, unreachable for exactly the booths that need
	// it: the "fix a lapsed booth" case this whole feature exists for.
	const canOpenDetails = isPerBooth
		? !!boothSubscription && boothSubscription.state !== "none"
		: hasSubscription;

	// Which states may start a NEW subscription.
	//
	// `none` and `canceled` only. A cancelled subscription has ended, so
	// subscribing is the correct action and duplicates nothing. `past_due` and
	// `unpaid` are excluded on purpose: those booths still HAVE a subscription
	// and need the card fixed, so offering Subscribe would start a second one
	// alongside the unpaid original.
	const canSubscribe = isPerBooth
		? canStartNewSubscription(boothSubscription?.state)
		: !hasSubscription;

	// Shared Subscribe CTA — US storefront only (external purchase gate).
	const subscribeCta = canPurchase && canSubscribe && isPerBooth && !!boothId && (
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

	// A failed read is not evidence of "no subscription". Rendering the empty or
	// lapsed layout here would tell a paying customer they have nothing — and,
	// on the US storefront, offer to sell them a duplicate.
	if (isPerBooth && isBoothError && !boothSubscription) {
		return (
			<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
				<View style={styles.emptyRow}>
					<View
						style={[
							styles.iconContainer,
							{ backgroundColor: withAlpha(StatusColors.neutral, 0.12) },
						]}
					>
						<IconSymbol
							name="exclamationmark.triangle"
							size={24}
							color={StatusColors.neutral}
						/>
					</View>
					<View style={styles.emptyTextWrap}>
						<ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
							Couldn&apos;t load subscription
						</ThemedText>
						<ThemedText style={[styles.emptyMessage, { color: textSecondary }]}>
							Pull down to refresh.
						</ThemedText>
					</View>
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
							{/* Server copy is unreviewable — only render it where
							    purchasing exists (it may reference the website). */}
							{canPurchase && isPerBooth
								? "Subscribe to activate this booth."
								: isPerBooth
									? "This booth isn't activated."
									: canPurchase
										? userAccess?.message || "No active subscription."
										: "No active subscription."}
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

				{onViewDetails && canOpenDetails && (
					<TouchableOpacity
						accessibilityRole="button"
						accessibilityLabel="View subscription details"
						onPress={onViewDetails}
						hitSlop={8}
					>
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

			{/* Paid but unrunnable — a billing-independent problem, so it gets its
			    own line rather than being folded into the status above. */}
			{activationRequired && (
				<View
					style={[
						styles.activationNotice,
						{ backgroundColor: withAlpha(StatusColors.warning, 0.1) },
					]}
				>
					<IconSymbol
						name="exclamationmark.triangle"
						size={16}
						color={StatusColors.warning}
					/>
					<ThemedText
						style={[styles.activationText, { color: StatusColors.warning }]}
					>
						Not linked to hardware — scan the booth&apos;s QR code to activate it.
					</ThemedText>
				</View>
			)}

			{subscribeCta}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	activationNotice: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: Spacing.xs,
		marginTop: Spacing.sm,
		padding: Spacing.sm,
		borderRadius: BorderRadius.md,
	},
	activationText: {
		flex: 1,
		fontSize: scaleFont(13),
		lineHeight: 18,
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
