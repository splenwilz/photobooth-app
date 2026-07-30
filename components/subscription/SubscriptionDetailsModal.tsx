/**
 * Subscription Details Modal
 *
 * Content-height bottom sheet with subscription state (status, renewal date,
 * auto-renewal). On the US storefront a "Manage on web" button opens the
 * Stripe customer portal (Guideline 3.1.1(a)); on every other storefront
 * the sheet stays read-only with no management affordance.
 */

import {
	type BoothBillingErrorCode,
	invalidateBoothBillingQueries,
	isBoothBillingErrorCode,
	useBoothPortalSession,
	useBoothSubscriptionState,
	useCancelBoothSubscription,
	useResumeBoothSubscription,
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
	scaleFont,
} from "@/constants/theme";
import { EXTERNAL_PURCHASES } from "@/constants/config";
import {
	canUpdatePaymentCard,
	getStatusDisplay,
} from "./subscription-status";
import { useExternalPurchases } from "@/hooks/use-external-purchases";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef } from "react";
import {
	AccessibilityInfo,
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
 * Read the backend's machine-readable code off an error.
 *
 * Duck-typed rather than `instanceof ApiError` so a re-thrown or wrapped error
 * still routes correctly.
 */
function errorCodeOf(error: unknown): BoothBillingErrorCode | undefined {
	if (typeof error === "object" && error !== null && "code" in error) {
		const { code } = error as { code?: unknown };
		if (typeof code === "string" && isBoothBillingErrorCode(code)) {
			return code;
		}
	}
	return undefined;
}

/**
 * Portal-session failures, mapped to what the user should do.
 *
 * `invalid_return_url` (422) and `flow_not_available` (409) are both
 * configuration faults rather than user errors, but they have different owners
 * and different fixes, so they get different copy — collapsing them into one
 * "contact support" makes a misconfigured build indistinguishable from a
 * missing Stripe portal feature.
 */
function portalErrorMessage(error: unknown): string {
	const code = errorCodeOf(error);

	if (__DEV__ && code) {
		// The code, never the session URL — that is a bearer credential.
		console.warn(`[Billing] portal session refused: ${code}`);
	}

	switch (code) {
		case "invalid_return_url":
			// Our return_url host is not on the backend's allowlist. In dev this
			// is normally the tunnel host: the backend has to add it to
			// PORTAL_RETURN_URL_ALLOWED_HOSTS. In production it means
			// EXPO_PUBLIC_WEBSITE_URL and the backend's allowlist disagree.
			return __DEV__
				? "Backend rejected the return URL (422). Add this tunnel host to PORTAL_RETURN_URL_ALLOWED_HOSTS."
				: "Card updates aren't available in this version of the app. Please contact support.";
		case "flow_not_available":
			// The Stripe portal configuration lacks the feature this flow needs.
			return "Card updates aren't set up yet. Please contact support.";
		case "no_subscription":
			return "This booth has no subscription to update.";
		case "booth_not_found":
			return "This booth is no longer available on your account.";
		case "stripe_unavailable":
			return "Billing is temporarily unavailable. Try again in a moment.";
		default:
			return (
				(error instanceof Error && error.message) ||
				"Could not open the billing page."
			);
	}
}

/**
 * Cancel/resume failures, mapped to copy the user can act on.
 *
 * Previously only the resume path routed codes and cancel dumped raw
 * `error.message` into an alert, so identical backend codes produced different
 * quality of message depending on which button was pressed.
 */
function mutationErrorMessage(
	error: unknown,
	action: "cancel" | "resume",
): string {
	switch (errorCodeOf(error)) {
		case "no_subscription":
			return "This booth no longer has a subscription.";
		case "booth_not_found":
			return "This booth is no longer available on your account.";
		case "stripe_unavailable":
			return "Billing is temporarily unavailable. Try again in a moment.";
		default:
			return (
				(error instanceof Error && error.message) ||
				`Could not ${action} the subscription.`
			);
	}
}

/**
 * Announce a state change to screen readers.
 *
 * Queued where supported: an announcement fired immediately after an Alert is
 * dismissed is routinely dropped on iOS by the system's own focus-restoration
 * announcement, and these fire exactly there — after the confirm dialog closes,
 * when the focused button has just been swapped for a different one.
 */
function announce(message: string) {
	const info = AccessibilityInfo as typeof AccessibilityInfo & {
		announceForAccessibilityWithOptions?: (
			announcement: string,
			options: { queue?: boolean },
		) => void;
	};
	if (typeof info.announceForAccessibilityWithOptions === "function") {
		info.announceForAccessibilityWithOptions(message, { queue: true });
		return;
	}
	AccessibilityInfo.announceForAccessibility(message);
}

// Status labels come from the shared map so this sheet and the status card can
// never disagree, and so an unrecognised backend enum is never rendered raw.

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
	} = useBoothSubscriptionState(visible && isPerBooth ? boothId : null);

	const {
		data: userSubscription,
		isLoading: isUserLoading,
		error: userError,
	} = useSubscriptionDetails(visible && !isPerBooth);

	// Normalize subscription data from either source
	const isLoading = isPerBooth ? isBoothLoading : isUserLoading;
	const error = isPerBooth ? boothError : userError;

	// Create normalized subscription object.
	//
	// `state: "none"` normalizes to null, the same as the absent data the old
	// 404 endpoint produced. Without this the sheet would render a details card
	// full of placeholders for a booth that never subscribed.
	const subscription = isPerBooth
		? boothSubscription && boothSubscription.state !== "none"
			? {
					subscription_id: boothSubscription.subscription_id ?? "",
					status: boothSubscription.status ?? null,
					is_active: boothSubscription.is_active,
					current_period_end: boothSubscription.current_period_end ?? "",
					cancel_at_period_end: boothSubscription.cancel_at_period_end,
					price_id: boothSubscription.price_id ?? "",
					booth_name: boothSubscription.booth_name,
				}
			: null
		: userSubscription;

	// True only when the booth genuinely has no subscription — distinct from a
	// failed read, which keeps the error branch below.
	const isNeverSubscribed =
		isPerBooth && boothSubscription?.state === "none";

	const statusInfo = getStatusDisplay(subscription?.status);

	// Card update opens Stripe on the web, so it is an external purchase
	// surface and stays US-only. Cancel and resume call our own API and present
	// no purchasing mechanism, so they ship on every storefront.
	const { enabled: canUseWebPortal } = useExternalPurchases();
	const portal = useBoothPortalSession();
	const cancelSubscription = useCancelBoothSubscription();
	const resumeSubscription = useResumeBoothSubscription();
	const queryClient = useQueryClient();

	// iOS presents one browser at a time and errors on a second concurrent
	// open, so a double tap must not mint a second session.
	//
	// Reset whenever the sheet closes: this component is rendered
	// unconditionally by Settings (only `visible` toggles), so it never
	// unmounts. If openBrowserAsync fails to settle — it does not on some
	// dismissal paths — the ref would otherwise stay true for the lifetime of
	// the screen, leaving a button that looks enabled and silently does nothing.
	const browserInFlight = useRef(false);
	// Guards the async confirmation dialog, which leaves isMutating false while
	// it is on screen.
	const confirmInFlight = useRef(false);
	useEffect(() => {
		// In an effect, not during render: React documents writing `ref.current`
		// while rendering as unsupported outside lazy initialisation.
		if (!visible) {
			browserInFlight.current = false;
			confirmInFlight.current = false;
		}
	}, [visible]);

	const isMutating =
		cancelSubscription.isPending || resumeSubscription.isPending;

	// Shared helper so every payments key is refreshed — an earlier version of
	// this function dropped the legacy per-booth key, which Settings still reads,
	// leaving that screen stale after a portal return.
	const refreshBillingCaches = () => {
		invalidateBoothBillingQueries(queryClient, boothId);
	};

	const handleUpdateCard = () => {
		if (!boothId || browserInFlight.current) return;
		browserInFlight.current = true;

		portal.mutate(
			{
				booth_id: boothId,
				flow: "payment_method_update",
				// Same website host as checkout, for the same reason: this is a
				// real page. Stripe requires https, and the backend additionally
				// validates the host against an allowlist — so a dev tunnel host
				// must be added to PORTAL_RETURN_URL_ALLOWED_HOSTS server-side or
				// this returns 422 invalid_return_url. Closing the browser is
				// what normally brings the user back here.
				return_url: `${EXTERNAL_PURCHASES.WEBSITE_URL}/dashboard/booths`,
			},
			{
				onSuccess: async (data) => {
					try {
						if (!data?.portal_url) {
							throw new Error("Session created without a URL");
						}
						// Plain browser, not an auth session: the https return_url
						// never fires an app-scheme redirect, so an auth session's
						// returnUrl would be dead weight. Never log portal_url —
						// it is a bearer credential.
						//
						// PLATFORM DIFFERENCE: this resolves on DISMISSAL on iOS
						// but as soon as the Custom Tab OPENS on Android, so the
						// refresh below lands while an Android user is still
						// typing. Android is covered instead by useQueryFocusManager
						// (app/_layout.tsx), which refetches when the app returns to
						// the foreground — removing that hook silently breaks the
						// Android card-update refresh.
						await WebBrowser.openBrowserAsync(data.portal_url);
					} catch {
						Alert.alert("Error", "Could not open the billing page.");
					} finally {
						browserInFlight.current = false;
						// Stripe may show its own confirmation page instead of
						// redirecting, so the return URL is not a reliable signal.
						// Refresh on any dismissal; a spurious refresh is harmless.
						refreshBillingCaches();
					}
				},
				onError: (error) => {
					browserInFlight.current = false;
					Alert.alert("Error", portalErrorMessage(error));
				},
			},
		);
	};

	const handleCancel = () => {
		// The confirmation is async, so `isMutating` is still false while it is on
		// screen. Without this guard a double tap stacks two dialogs, and
		// confirming both fires two POSTs — and React Query's MutationObserver
		// OVERWRITES per-call callbacks, so the first call's onError is replaced
		// by the second's and a failure can be reported as a success.
		if (!boothId || confirmInFlight.current || isMutating) return;
		confirmInFlight.current = true;

		const endsOn = formatDate(subscription?.current_period_end);
		const release = () => {
			confirmInFlight.current = false;
		};

		Alert.alert(
			"Cancel subscription?",
			`This booth keeps working until ${endsOn}, then stops. You can undo this any time before then.`,
			[
				{ text: "Keep subscription", style: "cancel", onPress: release },
				{
					text: "Cancel subscription",
					style: "destructive",
					onPress: () => {
						release();
						cancelSubscription.mutate(
							{ boothId },
							{
								onSuccess: () =>
									announce(
										`Subscription will end on ${endsOn}. Auto-renewal is off.`,
									),
								onError: (error) =>
									Alert.alert("Error", mutationErrorMessage(error, "cancel")),
							},
						);
					},
				},
			],
			// Android lets a back-press dismiss the dialog without either button.
			{ onDismiss: release },
		);
	};

	const handleResume = () => {
		if (!boothId) return;

		resumeSubscription.mutate(
			{ boothId },
			{
				onSuccess: () => announce("Auto-renewal is back on."),
				onError: (error) => {
					const code = errorCodeOf(error);
					if (code === "period_elapsed") {
						// Too late to undo — the only route forward is a new
						// subscription, so send them there instead of erroring.
						Alert.alert(
							"Subscription already ended",
							"This booth's subscription has run out. Subscribe again to reactivate it.",
							[
								{ text: "Not now", style: "cancel" },
								...(canUseWebPortal
									? [
											{
												text: "Subscribe",
												onPress: () => {
													onClose();
													router.push({
														pathname: "/subscribe",
														params: { boothId },
													});
												},
											},
										]
									: []),
							],
						);
						return;
					}
					if (code === "not_scheduled_to_cancel") {
						// Someone already resumed it, or it was never cancelling.
						// Our view was stale, so refresh rather than complain.
						refreshBillingCaches();
						return;
					}
					Alert.alert("Error", mutationErrorMessage(error, "resume"));
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
			// Without this, iOS VoiceOver can swipe past the sheet into the
			// Settings screen behind it.
			accessibilityViewIsModal
			onRequestClose={onClose}
		>
			{/* Content-height bottom sheet — a full pageSheet left the screen
			    mostly empty for three rows of content. */}
			<View style={styles.overlay}>
				{/* Decorative dismiss target. Kept out of the reading order: as a
				    full-screen element rendered before the sheet it would
				    otherwise be the first thing a screen reader announces. The
				    labelled close button below is the accessible affordance. */}
				<Pressable
					style={styles.backdrop}
					onPress={onClose}
					accessibilityElementsHidden
					importantForAccessibility="no"
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
							accessibilityRole="button"
							accessibilityLabel="Close subscription details"
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

					{/* No subscription at all. Without this branch the sheet rendered
					    an empty ScrollView under the header: `subscription` is null
					    and neither the loading nor the error branch applies. */}
					{isNeverSubscribed && !isLoading && !error && (
						<View style={styles.emptyContainer}>
							<IconSymbol
								name="star.fill"
								size={40}
								color={withAlpha(BRAND_COLOR, 0.6)}
							/>
							<ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
								No subscription
							</ThemedText>
							<ThemedText
								style={[styles.emptyMessage, { color: textSecondary }]}
							>
								{canUseWebPortal
									? "Subscribe to activate this booth."
									: "This booth isn't activated."}
							</ThemedText>
							{canUseWebPortal && boothId && (
								<TouchableOpacity
									accessibilityRole="button"
									style={[
										styles.primaryAction,
										{ backgroundColor: BRAND_COLOR, alignSelf: "stretch" },
									]}
									onPress={() => {
										onClose();
										router.push({
											pathname: "/subscribe",
											params: { boothId },
										});
									}}
								>
									<ThemedText style={styles.primaryActionText}>
										Subscribe
									</ThemedText>
								</TouchableOpacity>
							)}
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

							{/* Per-booth actions. Only shown when we know which booth we
							    are acting on — the account-level sheet has no single
							    subscription to target. */}
							{isPerBooth && (
								<>
									{/* Resume replaces Cancel once a cancellation is
									    scheduled: they are never both applicable. */}
									{subscription.cancel_at_period_end ? (
										<TouchableOpacity
											accessibilityRole="button"
											accessibilityLabel="Resume subscription"
											accessibilityState={{
												disabled: isMutating,
												busy: resumeSubscription.isPending,
											}}
											style={[
												styles.primaryAction,
												{ backgroundColor: BRAND_COLOR },
												isMutating && styles.actionDisabled,
											]}
											onPress={handleResume}
											disabled={isMutating}
										>
											{resumeSubscription.isPending ? (
												<ActivityIndicator size="small" color="white" />
											) : (
												<ThemedText style={styles.primaryActionText}>
													Resume subscription
												</ThemedText>
											)}
										</TouchableOpacity>
									) : (
										subscription.is_active && (
											<TouchableOpacity
												accessibilityRole="button"
												accessibilityLabel="Cancel subscription"
												accessibilityState={{
													disabled: isMutating,
													busy: cancelSubscription.isPending,
												}}
												style={[
													styles.destructiveAction,
													{ borderColor: StatusColors.error },
													isMutating && styles.actionDisabled,
												]}
												onPress={handleCancel}
												disabled={isMutating}
											>
												{cancelSubscription.isPending ? (
													<ActivityIndicator
														size="small"
														color={StatusColors.error}
													/>
												) : (
													<ThemedText
														style={[
															styles.destructiveActionText,
															{ color: StatusColors.error },
														]}
													>
														Cancel subscription
													</ThemedText>
												)}
											</TouchableOpacity>
										)
									)}

									{/* Card update needs Stripe's own UI to take card
									    details, which makes it an external purchase
									    surface — US storefront only.

									    Copy is deliberately "Update payment card", not
									    "this booth's card": Stripe's payment_method_update
									    flow is customer-scoped, and per-booth isolation
									    depends on every subscription having its own
									    default_payment_method. The backend has pinned that
									    for new subscriptions and reports the backfill found
									    nothing to fix, but only in test mode — tighten this
									    wording once a live-mode dry run confirms it. */}
									{canUseWebPortal &&
									subscription.subscription_id &&
									canUpdatePaymentCard(boothSubscription?.state) && (
										<TouchableOpacity
											accessibilityRole="button"
											accessibilityLabel="Update payment card"
											accessibilityHint="Opens Stripe in a browser"
											accessibilityState={{
												disabled: portal.isPending || isMutating,
												busy: portal.isPending,
											}}
											style={[
												styles.secondaryAction,
												{ borderColor },
												(portal.isPending || isMutating) &&
													styles.actionDisabled,
											]}
											onPress={handleUpdateCard}
											disabled={portal.isPending || isMutating}
										>
											{portal.isPending ? (
												<ActivityIndicator size="small" color={BRAND_COLOR} />
											) : (
												<ThemedText
													style={[
														styles.secondaryActionText,
														{ color: BRAND_COLOR },
													]}
												>
													Update payment card
												</ThemedText>
											)}
										</TouchableOpacity>
									)}
								</>
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
	primaryAction: {
		marginTop: Spacing.md,
		borderRadius: BorderRadius.md,
		paddingVertical: Spacing.md,
		alignItems: "center",
	},
	primaryActionText: {
		color: "#fff",
		fontSize: scaleFont(15),
		fontWeight: "700",
	},
	secondaryAction: {
		marginTop: Spacing.sm,
		borderRadius: BorderRadius.md,
		paddingVertical: Spacing.md,
		alignItems: "center",
		borderWidth: 1,
	},
	secondaryActionText: {
		fontSize: scaleFont(15),
		fontWeight: "600",
	},
	destructiveAction: {
		marginTop: Spacing.md,
		borderRadius: BorderRadius.md,
		paddingVertical: Spacing.md,
		alignItems: "center",
		borderWidth: 1,
	},
	destructiveActionText: {
		fontSize: scaleFont(15),
		fontWeight: "600",
	},
	actionDisabled: {
		opacity: 0.6,
	},
	emptyContainer: {
		alignItems: "center",
		gap: Spacing.sm,
		paddingVertical: Spacing.xl,
	},
	emptyTitle: {
		fontSize: scaleFont(16),
	},
	emptyMessage: {
		fontSize: scaleFont(14),
		textAlign: "center",
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
