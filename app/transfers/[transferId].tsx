/**
 * Transfer Review Screen (buyer side)
 *
 * Shows the offer, lets the buyer accept (token required, sent in the POST
 * body) or decline (no token). Acceptance is atomic server-side and can take
 * a few seconds on template-heavy booths — the UI blocks while it runs and
 * NEVER auto-retries; on an ambiguous failure it re-fetches the transfer,
 * because a successful accept shows up as completed/settled.
 *
 * The accept token arrives via the in-memory handoff (stashed by
 * hooks/use-deep-links.ts from the offer email's app link) — never as a
 * route param, because expo-router keeps the original path incl. query
 * string on `route.path` in navigation state. The screen SUBSCRIBES to the
 * handoff rather than reading it on focus: `router.navigate` to an
 * already-focused route reuses it in place with the same key, so no focus
 * event fires and a re-tapped or resent link would otherwise never enable
 * Accept. Without a token the buyer can review and decline, and is pointed
 * back at the email link to accept.
 *
 * Mirrors the web dashboard's TransferReviewClient — keep in sync.
 */

import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useSyncExternalStore } from "react";
import {
	ActivityIndicator,
	Alert,
	Modal,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/api/client";
import type { BoothTransfer } from "@/api/transfers";
import {
	displayStatus,
	formatTimeRemaining,
	getTransferErrorCode,
	transferErrorMessage,
	useAcceptTransfer,
	useDeclineTransfer,
	useTransfer,
} from "@/api/transfers";
import {
	getTransferToken,
	subscribeTransferTokens,
} from "@/api/transfers/token-handoff";
import { ThemedText } from "@/components/themed-text";
import { TransferStatusBadge } from "@/components/transfers";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EXTERNAL_PURCHASES } from "@/constants/config";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	scaleFont,
} from "@/constants/theme";
import { useMinuteTick } from "@/hooks/use-minute-tick";
import { useThemeColor } from "@/hooks/use-theme-color";

function formatDate(iso: string | null): string {
	if (!iso) return "";
	const date = new Date(iso);
	return Number.isNaN(date.getTime())
		? ""
		: date.toLocaleDateString("en-US", {
				month: "long",
				day: "numeric",
				year: "numeric",
			});
}

/** Ambiguous outcomes where the accept may still have succeeded server-side. */
function isAmbiguousFailure(error: unknown): boolean {
	return (
		error instanceof ApiError &&
		(error.status === 0 || error.status === 502 || error.status === 504)
	);
}

/**
 * Escape hatch to the web review page — the verified app link means the
 * offer email can no longer reach the website directly, so wrong-account /
 * stale-token dead ends need an explicit browser path. No token in the URL;
 * the web flow has its own cookie-based token exchange.
 */
function openOfferInBrowser(transferId: string | null): void {
	if (!transferId) return;
	Linking.openURL(
		`${EXTERNAL_PURCHASES.WEBSITE_URL}/dashboard/transfers/${encodeURIComponent(transferId)}`,
	).catch(() => {
		// Browser refused the URL — nothing actionable beyond the message
		Alert.alert("Couldn't open the browser", "Please open the offer email on another device.");
	});
}

export default function TransferReviewScreen() {
	const params = useLocalSearchParams<{ transferId: string }>();
	const transferId =
		typeof params.transferId === "string" ? params.transferId : null;

	// Accept token, read live from the handoff store. Subscribing (rather
	// than snapshotting on mount/focus) is what makes a link tapped while
	// THIS screen is already focused enable the Accept button — see the
	// module docblock for why focus can't carry that signal.
	const token = useSyncExternalStore(
		subscribeTransferTokens,
		() => (transferId ? getTransferToken(transferId) : null),
	);

	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");

	const { data: transfer, isPending, error } = useTransfer(transferId);
	const acceptMutation = useAcceptTransfer();
	const declineMutation = useDeclineTransfer();

	// A link for a DIFFERENT offer reuses this screen in place (expo-router
	// matches stack routes by name, so params swap without a remount).
	// Without this reset, offer B renders offer A's terminal card ("You
	// declined this offer") from the still-populated mutation data.
	const { reset: resetAccept } = acceptMutation;
	const { reset: resetDecline } = declineMutation;
	useEffect(() => {
		resetAccept();
		resetDecline();
	}, [transferId, resetAccept, resetDecline]);

	// Minute-level tick keeps the expiry countdown honest while the screen
	// sits open (refreshes on foreground too).
	const now = useMinuteTick();

	const handleBack = () => {
		// Deep-link/cold-start entries have no back stack — fall back to the
		// Booths tab instead of a dead back button.
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace("/(tabs)/booths");
		}
	};

	const handleAccept = () => {
		if (!transferId || !token) return;
		Alert.alert(
			`Accept ${transfer?.booth_name ?? "this booth"}?`,
			"The booth, its settings, templates, and any remaining subscription time move into your account. This can't be undone from this screen.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Accept transfer",
					onPress: () => {
						// A stale decline error must not linger next to the accept flow
						declineMutation.reset();
						// Re-read at submit time: a link may have landed between the
						// render that captured `token` and this confirmation.
						const freshest = getTransferToken(transferId) ?? token;
						acceptMutation.mutate({ transferId, token: freshest });
					},
				},
			],
		);
	};

	const handleDecline = () => {
		if (!transferId) return;
		Alert.alert(
			"Decline this offer?",
			"The seller will be notified and this offer can't be reopened. They can always send a new one.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Decline offer",
					style: "destructive",
					onPress: () => {
						// A stale accept error ("link invalid") must not sit above
						// a successful decline's status
						acceptMutation.reset();
						declineMutation.mutate({ transferId });
					},
				},
			],
		);
	};

	// The mutations return the updated transfer. Render from that until the
	// invalidated query catches up — otherwise a just-accepted transfer still
	// shows the pending card (with live Accept/Decline buttons) next to the
	// success banner, and a just-declined one shows no feedback at all.
	// Id-guarded: belt-and-braces against a mutation result outliving a
	// route reuse, so another offer's card can never render here.
	const mutationResult =
		acceptMutation.data?.id === transferId
			? acceptMutation.data
			: declineMutation.data?.id === transferId
				? declineMutation.data
				: null;
	const displayed = mutationResult ?? transfer;
	const status = displayed ? displayStatus(displayed, now) : null;
	const remaining = displayed
		? formatTimeRemaining(displayed.expires_at, now)
		: null;
	const acceptError = acceptMutation.error;
	const declineError = declineMutation.error;
	const isAccepting = acceptMutation.isPending;
	const isDeclining = declineMutation.isPending;

	return (
		<SafeAreaView style={[styles.container, { backgroundColor }]}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={handleBack} style={styles.backButton}>
					<IconSymbol name="chevron.left" size={24} color={BRAND_COLOR} />
				</TouchableOpacity>
				<View style={styles.headerTextContainer}>
					<ThemedText type="title" style={styles.title}>
						Transfer Offer
					</ThemedText>
					<ThemedText style={[styles.subtitle, { color: textSecondary }]}>
						Review this offer and choose whether to take over the booth
					</ThemedText>
				</View>
			</View>

			<ScrollView
				style={styles.flex}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				{!transferId ? (
					// Malformed cold-start URL / duplicated param: without this the
					// disabled query sits at isPending forever (eternal spinner)
					<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
						<ThemedText style={styles.errorText}>
							This transfer link is invalid. Open the offer from your
							transfers list instead.
						</ThemedText>
					</View>
				) : isPending ? (
					<ActivityIndicator
						color={BRAND_COLOR}
						size="large"
						style={styles.loadingIndicator}
					/>
				) : error ? (
					<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
						<ThemedText style={styles.errorText}>
							{transferErrorMessage(error)}
						</ThemedText>
						{/* Wrong signed-in account (shared device, second account):
						    the verified app link means the email can no longer reach
						    the web flow, so offer the browser path explicitly */}
						{getTransferErrorCode(error) === "not_addressed_to_you" && (
							<TouchableOpacity
								style={styles.browserButton}
								onPress={() => openOfferInBrowser(transferId)}
							>
								<ThemedText style={styles.acceptButtonText}>
									Open in Browser
								</ThemedText>
							</TouchableOpacity>
						)}
					</View>
				) : displayed && status ? (
					<>
						{/* Post-accept banner */}
						{acceptMutation.isSuccess && (
							<View style={styles.successBox}>
								<ThemedText style={styles.successText}>
									Transfer complete. {displayed.booth_name} is now in your
									account.
								</ThemedText>
							</View>
						)}

						{/* Accept failure banner */}
						{acceptError && !acceptMutation.isSuccess && (
							<View style={styles.errorBox}>
								<ThemedText style={styles.errorText}>
									{isAmbiguousFailure(acceptError)
										? "We couldn't confirm the result. The transfer may still have gone through. This screen refreshes with the latest status, so don't accept again."
										: transferErrorMessage(acceptError)}
								</ThemedText>
								{/* A dead token in-app (rotated/stale) can still be a live
								    offer on the web — give the browser path */}
								{getTransferErrorCode(acceptError) === "invalid_token" && (
									<TouchableOpacity
										style={styles.browserButton}
										onPress={() => openOfferInBrowser(transferId)}
									>
										<ThemedText style={styles.acceptButtonText}>
											Open in Browser
										</ThemedText>
									</TouchableOpacity>
								)}
							</View>
						)}

						{/* Decline failure banner — a silent failure would leave the
						    pending card looking untouched with no hint to retry */}
						{declineError && !declineMutation.isSuccess && (
							<View style={styles.errorBox}>
								<ThemedText style={styles.errorText}>
									Couldn&apos;t decline the offer.{" "}
									{transferErrorMessage(declineError)}
								</ThemedText>
							</View>
						)}

						{/* Offer card */}
						<View
							style={[styles.card, { backgroundColor: cardBg, borderColor }]}
						>
							<View style={styles.cardTitleRow}>
								<View style={styles.cardTitleText}>
									<ThemedText style={styles.boothName}>
										{displayed.booth_name}
									</ThemedText>
									<ThemedText
										style={[styles.offerMeta, { color: textSecondary }]}
									>
										Offered to {displayed.buyer_email} on{" "}
										{formatDate(displayed.created_at)}
									</ThemedText>
								</View>
								<TransferStatusBadge status={status} />
							</View>

							<View
								style={[
									styles.detailBox,
									{ backgroundColor: backgroundColor, borderColor },
								]}
							>
								<ThemedText
									style={[styles.detailText, { color: textSecondary }]}
								>
									Accepting moves this booth into your account: its settings
									{displayed.include_templates ? ", templates," : ""} and any
									remaining subscription time come with it.
								</ThemedText>
								{status === "pending" && remaining && (
									<ThemedText style={styles.expiryText}>
										Offer expires in {remaining}
									</ThemedText>
								)}
							</View>

							{status === "pending" && (
								<View style={styles.actions}>
									{!token && (
										<ThemedText
											style={[styles.noTokenHint, { color: textSecondary }]}
										>
											To accept, open the link in the offer email on this
											device. You can decline without it.
										</ThemedText>
									)}
									<View style={styles.actionRow}>
										<TouchableOpacity
											style={[
												styles.declineButton,
												{ borderColor },
												{ opacity: isAccepting || isDeclining ? 0.5 : 1 },
											]}
											onPress={handleDecline}
											disabled={isAccepting || isDeclining}
										>
											{isDeclining ? (
												<ActivityIndicator
													color={textColor}
													size="small"
												/>
											) : (
												<ThemedText style={styles.declineButtonText}>
													Decline
												</ThemedText>
											)}
										</TouchableOpacity>
										<TouchableOpacity
											style={[
												styles.acceptButton,
												{
													opacity:
														!token || isAccepting || isDeclining ? 0.5 : 1,
												},
											]}
											onPress={handleAccept}
											disabled={!token || isAccepting || isDeclining}
										>
											<ThemedText style={styles.acceptButtonText}>
												Accept Transfer
											</ThemedText>
										</TouchableOpacity>
									</View>
								</View>
							)}

							{status === "completed" && (
								<ResultPanel transfer={displayed} textSecondary={textSecondary}>
									The subscription is included until the current billing
									period ends. You&apos;ll get an email when it&apos;s time to
									subscribe; until then the subscribe option stays off for
									this booth.
								</ResultPanel>
							)}

							{status === "settled" && displayed.accepted_at && (
								<ResultPanel transfer={displayed} textSecondary={textSecondary}>
									No subscription came with this booth, so it needs one to
									stay active. You can subscribe from the Booths tab.
								</ResultPanel>
							)}

							{status === "declined" && (
								<ThemedText
									style={[styles.terminalText, { color: textSecondary }]}
								>
									You declined this offer.
								</ThemedText>
							)}
							{status === "cancelled" && (
								<ThemedText
									style={[styles.terminalText, { color: textSecondary }]}
								>
									The seller withdrew this offer.
								</ThemedText>
							)}
							{status === "expired" && (
								<ThemedText
									style={[styles.terminalText, { color: textSecondary }]}
								>
									This offer expired. Ask the seller to re-send the offer
									email if you still want the booth.
								</ThemedText>
							)}
						</View>
					</>
				) : null}
			</ScrollView>

			{/* Blocking overlay while the atomic accept runs. onRequestClose is
			    required on Android and deliberately a no-op here: hardware back
			    must not leave the screen mid-handover (the accept POST is
			    non-idempotent and can't be cancelled client-side). */}
			<Modal
				visible={isAccepting}
				transparent
				animationType="fade"
				onRequestClose={() => {
					/* deliberately non-dismissable while the accept runs */
				}}
			>
				<View style={styles.overlayBackdrop}>
					<View
						style={[
							styles.overlayCard,
							{ backgroundColor: cardBg, borderColor },
						]}
					>
						<ActivityIndicator
							color={BRAND_COLOR}
							size="large"
							style={styles.overlaySpinner}
						/>
						<ThemedText style={styles.overlayTitle}>
							Transferring the booth to your account…
						</ThemedText>
						<ThemedText
							style={[styles.overlayHint, { color: textSecondary }]}
						>
							This can take a few seconds. Don&apos;t close the app.
						</ThemedText>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
}

function ResultPanel({
	transfer,
	textSecondary,
	children,
}: {
	transfer: BoothTransfer;
	textSecondary: string;
	children: React.ReactNode;
}) {
	return (
		<View style={styles.resultPanel}>
			{transfer.templates_copied != null && transfer.templates_copied > 0 && (
				<ThemedText style={[styles.detailText, { color: textSecondary }]}>
					{transfer.templates_copied} template
					{transfer.templates_copied === 1 ? "" : "s"} came with the booth.
				</ThemedText>
			)}
			<ThemedText style={[styles.detailText, { color: textSecondary }]}>
				{children}
			</ThemedText>
			<TouchableOpacity
				style={styles.goToBoothsButton}
				onPress={() => router.replace("/(tabs)/booths")}
			>
				<ThemedText style={styles.acceptButtonText}>
					Go to My Booths
				</ThemedText>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	flex: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		gap: Spacing.sm,
	},
	backButton: {
		padding: Spacing.xs,
		marginLeft: -Spacing.xs,
	},
	headerTextContainer: {
		flex: 1,
	},
	title: {
		fontSize: scaleFont(24),
	},
	subtitle: {
		fontSize: scaleFont(13),
		marginTop: 2,
	},
	content: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.xl,
		gap: Spacing.md,
	},
	loadingIndicator: {
		marginVertical: Spacing.xl,
	},
	card: {
		borderWidth: 1,
		borderRadius: BorderRadius.xl,
		padding: Spacing.lg,
		gap: Spacing.md,
	},
	cardTitleRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: Spacing.sm,
	},
	cardTitleText: {
		flex: 1,
		gap: 4,
	},
	boothName: {
		fontSize: scaleFont(18),
		fontWeight: "600",
	},
	offerMeta: {
		fontSize: scaleFont(13),
	},
	detailBox: {
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		padding: Spacing.md,
		gap: Spacing.xs,
	},
	detailText: {
		fontSize: scaleFont(14),
		lineHeight: scaleFont(20),
	},
	expiryText: {
		fontSize: scaleFont(14),
		fontWeight: "600",
		color: "#B45309",
	},
	actions: {
		gap: Spacing.sm,
	},
	actionRow: {
		flexDirection: "row",
		gap: Spacing.sm,
	},
	noTokenHint: {
		fontSize: scaleFont(13),
		lineHeight: scaleFont(18),
	},
	declineButton: {
		flex: 1,
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		height: 48,
		alignItems: "center",
		justifyContent: "center",
	},
	declineButtonText: {
		fontSize: scaleFont(15),
		fontWeight: "600",
	},
	acceptButton: {
		flex: 1,
		backgroundColor: BRAND_COLOR,
		borderRadius: BorderRadius.lg,
		height: 48,
		alignItems: "center",
		justifyContent: "center",
	},
	acceptButtonText: {
		color: "#FFFFFF",
		fontSize: scaleFont(15),
		fontWeight: "600",
	},
	terminalText: {
		fontSize: scaleFont(14),
	},
	resultPanel: {
		gap: Spacing.sm,
	},
	goToBoothsButton: {
		backgroundColor: BRAND_COLOR,
		borderRadius: BorderRadius.lg,
		height: 44,
		alignItems: "center",
		justifyContent: "center",
		alignSelf: "flex-start",
		paddingHorizontal: Spacing.lg,
		marginTop: Spacing.xs,
	},
	browserButton: {
		backgroundColor: BRAND_COLOR,
		borderRadius: BorderRadius.lg,
		height: 44,
		alignItems: "center",
		justifyContent: "center",
		alignSelf: "flex-start",
		paddingHorizontal: Spacing.lg,
		marginTop: Spacing.md,
	},
	errorBox: {
		backgroundColor: "rgba(239, 68, 68, 0.1)",
		borderColor: "rgba(239, 68, 68, 0.2)",
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		padding: Spacing.md,
	},
	errorText: {
		color: "#EF4444",
		fontSize: scaleFont(14),
		lineHeight: scaleFont(20),
	},
	successBox: {
		backgroundColor: "rgba(34, 197, 94, 0.1)",
		borderColor: "rgba(34, 197, 94, 0.2)",
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		padding: Spacing.md,
	},
	successText: {
		color: "#16A34A",
		fontSize: scaleFont(14),
		fontWeight: "500",
		lineHeight: scaleFont(20),
	},
	overlayBackdrop: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: Spacing.xl,
	},
	overlayCard: {
		borderWidth: 1,
		borderRadius: BorderRadius.xl,
		padding: Spacing.xl,
		alignItems: "center",
		maxWidth: 320,
	},
	overlaySpinner: {
		marginBottom: Spacing.md,
	},
	overlayTitle: {
		fontSize: scaleFont(16),
		fontWeight: "600",
		textAlign: "center",
	},
	overlayHint: {
		fontSize: scaleFont(13),
		textAlign: "center",
		marginTop: Spacing.xs,
	},
});
