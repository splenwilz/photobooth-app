/**
 * Pricing Plans Selector Component
 *
 * Shows all available plans with billing interval toggle.
 * Handles plan selection and checkout initiation.
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
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useBoothStore } from "@/stores/booth-store";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useState } from "react";
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

export function PricingPlansSelector({
	currentPlanId,
	boothId,
	onCheckoutComplete,
	onCancel,
}: PricingPlansSelectorProps) {
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	const [billingInterval, setBillingInterval] =
		useState<BillingInterval>("month");
	const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

	// Fetch pricing plans
	const { data: pricingData, isLoading, error } = usePricingPlans();

	// Checkout mutation
	const createBoothCheckout = useCreateBoothCheckout();
	const queryClient = useQueryClient();
	const setSelectedBoothId = useBoothStore((s) => s.setSelectedBoothId);

	// Calculate max discount across all plans for toggle display
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

		const websiteUrl = process.env.EXPO_PUBLIC_WEBSITE_URL;
		const isAnnual = billingInterval === "year" && selectedPlan.has_annual_option;
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
					if (data?.checkout_url && typeof data.checkout_url === "string") {
						const browserResult = await WebBrowser.openAuthSessionAsync(
							data.checkout_url,
							`boothiq://payment-success?booth_id=${boothId}`,
							{ preferEphemeralSession: true },
						);

						if (
							browserResult.type === "success" &&
							browserResult.url?.includes("payment-success")
						) {
							// Invalidate subscription queries
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
							// Also invalidate all booth subscriptions list (used by booths screen)
							queryClient.invalidateQueries({
								queryKey: queryKeys.payments.boothSubscriptions(),
							});

							// Select the subscribed booth as active
							setSelectedBoothId(boothId);

							// Navigate to booths tab
							router.replace("/(tabs)/booths");

							Alert.alert(
								"Payment Successful",
								"Your subscription has been activated!",
								[{ text: "OK" }],
							);

							onCheckoutComplete?.();
						}
					} else {
						Alert.alert(
							"Error",
							"Could not get checkout URL. Please try again.",
						);
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
				<TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
					<ThemedText style={{ color: BRAND_COLOR }}>Go Back</ThemedText>
				</TouchableOpacity>
			</View>
		);
	}

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

			{/* Billing Interval Toggle */}
			{maxDiscount && maxDiscount > 0 && (
				<View style={styles.toggleWrapper}>
					<BillingIntervalToggle
						value={billingInterval}
						onChange={setBillingInterval}
						savingsPercent={maxDiscount}
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
						disabled={createBoothCheckout.isPending}
					/>
				))}
			</ScrollView>

			{/* Action Buttons */}
			<View style={styles.actions}>
				{onCancel && (
					<TouchableOpacity
						style={[styles.button, styles.cancelBtn, { borderColor }]}
						onPress={onCancel}
						disabled={createBoothCheckout.isPending}
					>
						<ThemedText style={[styles.buttonText, { color: textSecondary }]}>
							Cancel
						</ThemedText>
					</TouchableOpacity>
				)}
				<TouchableOpacity
					style={[
						styles.button,
						styles.subscribeBtn,
						{ backgroundColor: selectedPlan ? BRAND_COLOR : borderColor },
					]}
					onPress={handleSubscribe}
					disabled={!selectedPlan || createBoothCheckout.isPending}
				>
					{createBoothCheckout.isPending ? (
						<ActivityIndicator size="small" color="white" />
					) : (
						<>
							<IconSymbol name="star.fill" size={18} color="white" />
							<ThemedText style={styles.subscribeText}>
								{trialDays > 0
									? `Start ${trialDays}-Day Trial`
									: "Subscribe Now"}
							</ThemedText>
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
	header: {
		alignItems: "center",
		marginBottom: Spacing.md,
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		marginBottom: Spacing.xs,
	},
	trialText: {
		fontSize: 14,
		fontWeight: "600",
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
