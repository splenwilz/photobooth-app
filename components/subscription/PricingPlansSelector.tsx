/**
 * Pricing Plans Selector Component
 *
 * Starts Stripe web checkout for a per-booth subscription. US storefront
 * only — hosts must gate rendering behind useExternalPurchases()
 * (Guideline 3.1.1(a)); see app/subscribe.tsx.
 *
 * Two layouts:
 * - Single plan (current lineup): paywall-style — hero price, feature list,
 *   full-width CTA. The plan is preselected; there is nothing to choose.
 * - Multiple plans: selectable PlanCard list with an explicit choice
 *   before the CTA activates.
 */

import { usePricingPlans, type PricingPlan } from "@/api/pricing";
import { useCreateBoothCheckout } from "@/api/payments";
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
import {
	CHECKOUT_RETURN_PATHS,
	checkoutReturnDeepLink,
	EXTERNAL_PURCHASES,
} from "@/constants/config";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useBoothStore } from "@/stores/booth-store";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import {
	BillingIntervalToggle,
	type BillingInterval,
} from "./BillingIntervalToggle";
import { PlanCard } from "./PlanCard";

interface PricingPlansSelectorProps {
	/** Current plan ID if booth is already subscribed */
	currentPlanId?: number | null;
	/** Booth ID for per-booth subscription */
	boothId: string;
	/** Called when checkout is complete */
	onCheckoutComplete?: () => void;
	/** Called when user wants to cancel/close */
	onCancel?: () => void;
}

/** "$29" / "$278.40" from cents — whole dollars stay whole. */
function formatPrice(cents: number): string {
	const dollars = cents / 100;
	return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}

export function PricingPlansSelector({
	currentPlanId,
	boothId,
	onCheckoutComplete,
	onCancel,
}: PricingPlansSelectorProps) {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	const [billingInterval, setBillingInterval] =
		useState<BillingInterval>("month");
	const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

	// Fetch pricing plans
	const { data: pricingData, isLoading, error } = usePricingPlans();

	// With a single plan there is nothing to choose — preselect it so the
	// Subscribe CTA is immediately actionable (tapping the lone card to
	// "select" it is a dead-end UX).
	useEffect(() => {
		if (!selectedPlan && pricingData?.plans.length === 1) {
			setSelectedPlan(pricingData.plans[0]);
		}
	}, [pricingData, selectedPlan]);

	// Checkout mutation
	const createBoothCheckout = useCreateBoothCheckout();
	const queryClient = useQueryClient();
	const setSelectedBoothId = useBoothStore((s) => s.setSelectedBoothId);

	// Check if any plan has annual option (for showing toggle)
	const hasAnyAnnualOption = pricingData?.plans.some(
		(plan) => plan.has_annual_option,
	);

	// Calculate max discount across all plans for savings badge display
	const maxDiscount = pricingData?.plans.reduce((max, plan) => {
		return plan.has_annual_option && plan.annual_discount_percent > max
			? plan.annual_discount_percent
			: max;
	}, 0);

	const trialDays = pricingData?.trial_period_days ?? 0;

	const handleSelectPlan = (plan: PricingPlan) => {
		setSelectedPlan(plan);
	};

	const handleSubscribe = () => {
		if (!selectedPlan) {
			Alert.alert("Select a Plan", "Please select a plan to continue.");
			return;
		}

		const websiteUrl = EXTERNAL_PURCHASES.WEBSITE_URL;

		const isAnnual =
			billingInterval === "year" && selectedPlan.has_annual_option;
		const priceId = isAnnual
			? selectedPlan.stripe_annual_price_id
			: selectedPlan.stripe_price_id;

		createBoothCheckout.mutate(
			{
				booth_id: boothId,
				price_id: priceId,
				success_url: `${websiteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&booth_id=${boothId}&type=subscription`,
				cancel_url: `${websiteUrl}/pricing`,
			},
			{
				onSuccess: async (data) => {
					if (!data?.checkout_url || typeof data.checkout_url !== "string") {
						Alert.alert(
							"Error",
							"Could not get checkout URL. Please try again.",
						);
						return;
					}

					let browserResult: Awaited<
						ReturnType<typeof WebBrowser.openAuthSessionAsync>
					> | null = null;
					try {
						browserResult = await WebBrowser.openAuthSessionAsync(
							data.checkout_url,
							// Bare scheme URL — iOS matches on scheme; query params
							// in the return URL make matching fragile elsewhere.
							checkoutReturnDeepLink(CHECKOUT_RETURN_PATHS.PAYMENT_SUCCESS),
							{ preferEphemeralSession: true },
						);
					} catch {
						// Session couldn't open/complete (e.g. another auth session
						// active) — fall through and refresh anyway.
					} finally {
						// Refresh on ANY browser return: the user may have paid
						// and dismissed the sheet before the success redirect
						// fired — only the server knows the outcome. Invalidation
						// is cheap and idempotent; success-only UX stays below.
						queryClient.invalidateQueries({
							queryKey: queryKeys.payments.access(),
						});
						queryClient.invalidateQueries({
							queryKey: queryKeys.payments.subscription(),
						});
						queryClient.invalidateQueries({
							queryKey: queryKeys.booths.detail(boothId),
						});
						queryClient.invalidateQueries({
							queryKey: queryKeys.payments.boothSubscription(boothId),
						});
						queryClient.invalidateQueries({
							queryKey: queryKeys.payments.boothSubscriptions(),
						});
					}

					if (
						browserResult &&
						browserResult.type === "success" &&
						browserResult.url?.includes(CHECKOUT_RETURN_PATHS.PAYMENT_SUCCESS)
					) {
						// Select the subscribed booth as active; the HOST owns
						// navigation and the success message (a replace() here
						// fought the host's back() and stranded the user off the
						// scan-to-activate step).
						setSelectedBoothId(boothId);
						onCheckoutComplete?.();
					}
				},
				onError: (error) => {
					Alert.alert(
						"Error",
						error.message || "Failed to start checkout. Please try again.",
					);
				},
			},
		);
	};

	if (isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={BRAND_COLOR} />
				<ThemedText style={[styles.loadingText, { color: textSecondary }]}>
					Loading plans...
				</ThemedText>
			</View>
		);
	}

	if (error || !pricingData?.plans.length) {
		return (
			<View style={styles.errorContainer}>
				<IconSymbol
					name="exclamationmark.triangle"
					size={32}
					color={textSecondary}
				/>
				<ThemedText style={[styles.errorText, { color: textSecondary }]}>
					Unable to load pricing plans
				</ThemedText>
				{onCancel && (
					<TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
						<ThemedText style={{ color: BRAND_COLOR }}>Go Back</ThemedText>
					</TouchableOpacity>
				)}
			</View>
		);
	}

	const isPending = createBoothCheckout.isPending;
	const ctaLabel =
		trialDays > 0 ? `Start ${trialDays}-Day Trial` : "Subscribe Now";

	// ------------------------------------------------------------------
	// Single-plan paywall layout
	// ------------------------------------------------------------------
	const singlePlan = pricingData.plans.length === 1 ? pricingData.plans[0] : null;

	if (singlePlan) {
		const isAnnual = billingInterval === "year" && singlePlan.has_annual_option;
		const priceCents = isAnnual
			? singlePlan.annual_price_cents
			: singlePlan.price_cents;
		const period = isAnnual ? "/year" : "/month";

		return (
			<View style={styles.container}>
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.heroScrollContent}
				>
					{/* Plan identity */}
					<ThemedText type="title" style={styles.heroName}>
						{singlePlan.name}
					</ThemedText>
					<ThemedText style={[styles.heroDescription, { color: textSecondary }]}>
						{singlePlan.description}
					</ThemedText>

					{/* Interval toggle */}
					{singlePlan.has_annual_option && (
						<View style={styles.heroToggle}>
							<BillingIntervalToggle
								value={billingInterval}
								onChange={setBillingInterval}
								savingsPercent={singlePlan.annual_discount_percent}
								disabled={isPending}
							/>
						</View>
					)}

					{/* Hero price */}
					<View style={styles.heroPriceRow}>
						<ThemedText style={styles.heroPrice}>
							{formatPrice(priceCents)}
						</ThemedText>
						<ThemedText style={[styles.heroPeriod, { color: textSecondary }]}>
							{period}
						</ThemedText>
					</View>
					{isAnnual && singlePlan.annual_savings_display ? (
						<View
							style={[
								styles.savingsPill,
								{ backgroundColor: withAlpha(StatusColors.success, 0.12) },
							]}
						>
							<ThemedText
								style={[styles.savingsPillText, { color: StatusColors.success }]}
							>
								{singlePlan.annual_savings_display}
							</ThemedText>
						</View>
					) : null}
					{trialDays > 0 && (
						<ThemedText style={[styles.trialText, { color: BRAND_COLOR }]}>
							{trialDays}-day free trial included
						</ThemedText>
					)}

					{/* Features */}
					<View
						style={[
							styles.featuresCard,
							{ backgroundColor: cardBg, borderColor },
						]}
					>
						{singlePlan.features.map((feature) => (
							<View key={feature} style={styles.featureRow}>
								<IconSymbol
									name="checkmark.circle.fill"
									size={20}
									color={BRAND_COLOR}
								/>
								<ThemedText style={styles.featureText}>{feature}</ThemedText>
							</View>
						))}
					</View>
				</ScrollView>

				{/* CTA */}
				<View style={styles.heroFooter}>
					<TouchableOpacity
						accessibilityRole="button"
						style={[
							styles.heroCta,
							{ backgroundColor: BRAND_COLOR },
							isPending && styles.heroCtaDisabled,
						]}
						onPress={handleSubscribe}
						disabled={isPending}
					>
						{isPending ? (
							<ActivityIndicator size="small" color="white" />
						) : (
							<ThemedText style={styles.heroCtaText}>{ctaLabel}</ThemedText>
						)}
					</TouchableOpacity>
					<ThemedText style={[styles.heroFinePrint, { color: textSecondary }]}>
						Secure checkout · Cancel anytime
					</ThemedText>
				</View>
			</View>
		);
	}

	// ------------------------------------------------------------------
	// Multi-plan comparison layout
	// ------------------------------------------------------------------
	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<ThemedText type="title" style={styles.title}>
					Choose a Plan
				</ThemedText>
				{trialDays > 0 && (
					<ThemedText style={[styles.trialText, { color: BRAND_COLOR }]}>
						{trialDays}-day free trial included
					</ThemedText>
				)}
			</View>

			{/* Billing Interval Toggle - only show if any plan has annual option */}
			{hasAnyAnnualOption && (
				<View style={styles.toggleWrapper}>
					<BillingIntervalToggle
						value={billingInterval}
						onChange={setBillingInterval}
						savingsPercent={maxDiscount}
						disabled={isPending}
					/>
				</View>
			)}

			{/* Plans List */}
			<ScrollView
				style={styles.plansList}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.plansContent}
			>
				{pricingData.plans.map((plan) => (
					<PlanCard
						key={plan.id}
						plan={plan}
						isSelected={selectedPlan?.id === plan.id}
						isCurrentPlan={plan.id === currentPlanId}
						billingInterval={billingInterval}
						onSelect={handleSelectPlan}
						disabled={isPending}
					/>
				))}
			</ScrollView>

			{/* Action Buttons */}
			<View style={styles.actions}>
				{onCancel && (
					<TouchableOpacity
						style={[styles.button, styles.cancelBtn, { borderColor }]}
						onPress={onCancel}
						disabled={isPending}
					>
						<ThemedText style={[styles.buttonText, { color: textSecondary }]}>
							Cancel
						</ThemedText>
					</TouchableOpacity>
				)}
				<TouchableOpacity
					accessibilityRole="button"
					style={[
						styles.button,
						styles.subscribeBtn,
						{ backgroundColor: selectedPlan ? BRAND_COLOR : borderColor },
					]}
					onPress={handleSubscribe}
					disabled={!selectedPlan || isPending}
				>
					{isPending ? (
						<ActivityIndicator size="small" color="white" />
					) : (
						<>
							<IconSymbol name="star.fill" size={18} color="white" />
							<ThemedText style={styles.subscribeText}>{ctaLabel}</ThemedText>
						</>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: Spacing.md,
	},
	loadingText: {
		fontSize: 14,
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: Spacing.md,
		padding: Spacing.xl,
	},
	errorText: {
		fontSize: 14,
		textAlign: "center",
	},
	cancelButton: {
		marginTop: Spacing.md,
	},

	// --- Single-plan paywall ---
	heroScrollContent: {
		paddingBottom: Spacing.lg,
		alignItems: "center",
	},
	heroName: {
		fontSize: scaleFont(26),
		fontWeight: "700",
		textAlign: "center",
		marginTop: Spacing.sm,
	},
	heroDescription: {
		fontSize: scaleFont(15),
		textAlign: "center",
		marginTop: Spacing.xs,
		marginBottom: Spacing.lg,
		paddingHorizontal: Spacing.lg,
		lineHeight: scaleFont(21),
	},
	heroToggle: {
		marginBottom: Spacing.lg,
	},
	heroPriceRow: {
		flexDirection: "row",
		alignItems: "flex-end",
		justifyContent: "center",
	},
	heroPrice: {
		fontSize: scaleFont(44),
		fontWeight: "800",
		lineHeight: scaleFont(48),
	},
	heroPeriod: {
		fontSize: scaleFont(17),
		fontWeight: "500",
		marginBottom: 6,
		marginLeft: 2,
	},
	savingsPill: {
		marginTop: Spacing.sm,
		paddingHorizontal: Spacing.md,
		paddingVertical: 4,
		borderRadius: BorderRadius.lg,
	},
	savingsPillText: {
		fontSize: scaleFont(13),
		fontWeight: "700",
	},
	trialText: {
		fontSize: scaleFont(14),
		fontWeight: "600",
		marginTop: Spacing.sm,
	},
	featuresCard: {
		alignSelf: "stretch",
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		padding: Spacing.md,
		marginTop: Spacing.lg,
		gap: Spacing.md,
	},
	featureRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	featureText: {
		fontSize: scaleFont(15),
		flexShrink: 1,
	},
	heroFooter: {
		paddingTop: Spacing.sm,
		gap: Spacing.sm,
	},
	heroCta: {
		borderRadius: BorderRadius.md,
		paddingVertical: Spacing.md + 2,
		alignItems: "center",
		justifyContent: "center",
	},
	heroCtaDisabled: {
		opacity: 0.6,
	},
	heroCtaText: {
		color: "#fff",
		fontSize: scaleFont(17),
		fontWeight: "700",
	},
	heroFinePrint: {
		fontSize: scaleFont(12),
		textAlign: "center",
	},

	// --- Multi-plan layout ---
	header: {
		alignItems: "center",
		marginBottom: Spacing.md,
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		marginBottom: Spacing.xs,
	},
	toggleWrapper: {
		marginBottom: Spacing.lg,
	},
	plansList: {
		flex: 1,
	},
	plansContent: {
		paddingBottom: Spacing.md,
	},
	actions: {
		flexDirection: "row",
		gap: Spacing.sm,
		paddingTop: Spacing.md,
	},
	button: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.md,
		gap: Spacing.xs,
	},
	cancelBtn: {
		backgroundColor: "transparent",
		borderWidth: 1,
		flex: 0.4,
	},
	subscribeBtn: {
		flex: 0.6,
	},
	buttonText: {
		fontSize: 14,
		fontWeight: "600",
	},
	subscribeText: {
		color: "white",
		fontSize: 14,
		fontWeight: "600",
	},
});
