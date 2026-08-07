/**
 * TransferBoothModal Component
 *
 * Seller side of a booth ownership transfer. One modal covers the whole
 * lifecycle: offer form when the booth has no open offer, pending-offer card
 * (countdown + resend + withdraw) when it does, and a history line for the
 * latest terminal transfer.
 *
 * Mirrors the web dashboard's TransferBoothModal — keep behavior in sync.
 *
 * @see POST/GET/DELETE /api/v1/booths/{booth_id}/transfer
 * @see api/transfers/queries.ts
 */

import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Keyboard,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { BoothTransfer } from "@/api/transfers";
import {
	displayStatus,
	formatTimeRemaining,
	transferErrorMessage,
	useCancelBoothTransfer,
	useCreateBoothTransfer,
	useLatestBoothTransfer,
	useResendBoothTransfer,
} from "@/api/transfers";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	scaleFont,
} from "@/constants/theme";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMinuteTick } from "@/hooks/use-minute-tick";
import { useThemeColor } from "@/hooks/use-theme-color";

interface TransferBoothModalProps {
	visible: boolean;
	boothId: string;
	boothName: string;
	onClose: () => void;
}

function formatDate(iso: string): string {
	const date = new Date(iso);
	return Number.isNaN(date.getTime())
		? ""
		: date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
}

const STATUS_HISTORY_LABEL: Partial<Record<BoothTransfer["status"], string>> = {
	cancelled: "You withdrew the offer to",
	declined: "Offer declined by",
	expired: "Offer expired for",
	// completed/settled deliberately absent — a handed-over booth leaves the
	// seller's list, so the offer form below is unreachable for them; see
	// `handedOver` below, which suppresses stale banners in that window.
};

export function TransferBoothModal({
	visible,
	boothId,
	boothName,
	onClose,
}: TransferBoothModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");

	const { session } = useAuthSession();
	const [buyerEmail, setBuyerEmail] = useState("");
	const [localError, setLocalError] = useState<string | null>(null);

	const {
		data: latest,
		isPending: latestLoading,
		error: latestError,
	} = useLatestBoothTransfer(boothId, visible);
	const createMutation = useCreateBoothTransfer();
	const cancelMutation = useCancelBoothTransfer();
	const resendMutation = useResendBoothTransfer();

	// Minute-level tick keeps the expiry countdown honest while the modal
	// sits open (refreshes on foreground too).
	const now = useMinuteTick(visible);

	// Reset transient state each time the modal opens for (possibly) a new booth.
	useEffect(() => {
		if (!visible) return;
		setBuyerEmail("");
		setLocalError(null);
		createMutation.reset();
		cancelMutation.reset();
		resendMutation.reset();
		// reset() has a stable identity in TanStack Query v5.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible, boothId]);

	const isBusy =
		createMutation.isPending ||
		cancelMutation.isPending ||
		resendMutation.isPending;

	// Prefer the freshest picture until the invalidated query catches up.
	// Each mutation result is only trusted while it's plausibly newer than the
	// query row (and the handlers reset the other mutations, so at most one
	// result is live at a time):
	// - a withdraw result (cancelled) immediately outranks the stale pending row
	// - a resend result only counts while the query row is the same, still-
	//   pending transfer (it contributes the new expiry; a buyer decline
	//   arriving via refetch must not stay hidden behind it)
	// - a create result covers the gap right after sending a brand-new offer
	const resendFresh =
		resendMutation.data &&
		(!latest ||
			(latest.id === resendMutation.data.id && latest.status === "pending"))
			? resendMutation.data
			: null;
	const createFresh =
		createMutation.data &&
		(!latest ||
			Date.parse(createMutation.data.created_at) >
				Date.parse(latest.created_at))
			? createMutation.data
			: null;
	const current = cancelMutation.data ?? resendFresh ?? createFresh ?? latest;
	// Server status decides the card: a pending offer whose window lapsed still
	// shows the pending card, because "resend" (token rotation) is the recovery
	// for it, not a new offer.
	const pendingOffer = current?.status === "pending" ? current : null;
	const pendingLapsed =
		pendingOffer != null && displayStatus(pendingOffer, now) === "expired";

	const handleClose = () => {
		if (!isBusy) {
			Keyboard.dismiss();
			onClose();
		}
	};

	const handleSubmit = () => {
		setLocalError(null);
		const email = buyerEmail.trim().toLowerCase();
		if (!email) return;
		if (session?.email && email === session.email.toLowerCase()) {
			setLocalError("You can't transfer a booth to your own email address.");
			return;
		}
		Keyboard.dismiss();
		// A stale withdrawn/resent result must not shadow the new offer
		cancelMutation.reset();
		resendMutation.reset();
		createMutation.mutate({ boothId, buyer_email: email });
	};

	const handleWithdraw = () => {
		Alert.alert(
			"Withdraw offer?",
			`The offer to ${pendingOffer?.buyer_email ?? "the buyer"} will be cancelled and their accept link will stop working. You can always send a new offer.`,
			[
				{ text: "Keep offer", style: "cancel" },
				{
					text: "Withdraw offer",
					style: "destructive",
					onPress: () => {
						// Reset stale results so a withdrawn offer doesn't linger as "pending"
						createMutation.reset();
						resendMutation.reset();
						cancelMutation.mutate({ boothId });
					},
				},
			],
		);
	};

	const handleResend = () => {
		cancelMutation.reset();
		resendMutation.mutate({ boothId });
	};

	// Once the booth has changed hands there is nothing left for the seller to
	// act on, so stale banners from earlier attempts would only confuse.
	const handedOver =
		current?.status === "completed" || current?.status === "settled";

	const errorMessage = handedOver
		? null
		: (localError ??
			(createMutation.error
				? transferErrorMessage(createMutation.error)
				: null) ??
			(cancelMutation.error
				? transferErrorMessage(cancelMutation.error)
				: null) ??
			(resendMutation.error
				? transferErrorMessage(resendMutation.error)
				: null));

	const remaining = pendingOffer
		? formatTimeRemaining(pendingOffer.expires_at, now)
		: null;

	// Own-property guard: `status` is a server string, and a plain index would
	// walk the prototype chain (e.g. "constructor" would yield a function).
	const historyLabel =
		current && Object.hasOwn(STATUS_HISTORY_LABEL, current.status)
			? STATUS_HISTORY_LABEL[current.status]
			: undefined;

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			// Always close, ignoring isBusy: on iOS a pageSheet is natively
			// pull-down dismissible and this fires AFTER the sheet is already
			// gone — refusing to sync `visible` would leave a phantom open
			// modal. Mid-flight mutations complete fine unmounted (their
			// onSettled invalidations run from the mutation cache).
			onRequestClose={() => {
				Keyboard.dismiss();
				onClose();
			}}
		>
			<SafeAreaView style={[styles.container, { backgroundColor }]}>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity
						onPress={handleClose}
						disabled={isBusy}
						hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
					>
						<IconSymbol name="xmark" size={22} color={textSecondary} />
					</TouchableOpacity>
					<ThemedText type="subtitle" style={styles.headerTitle}>
						Transfer Booth
					</ThemedText>
					{/* Spacer keeps the title centered */}
					<View style={styles.headerSpacer} />
				</View>

				<KeyboardAvoidingView
					style={styles.flex}
					behavior={Platform.OS === "ios" ? "padding" : "height"}
				>
					<ScrollView
						style={styles.flex}
						contentContainerStyle={styles.content}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<ThemedText style={[styles.subtitle, { color: textSecondary }]}>
							Offer{" "}
							<ThemedText style={[styles.subtitleName, { color: textColor }]}>
								{boothName}
							</ThemedText>{" "}
							to another operator
						</ThemedText>

						{errorMessage && (
							<View style={styles.errorBox}>
								<ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
							</View>
						)}

						{latestLoading ? (
							<ActivityIndicator
								color={BRAND_COLOR}
								style={styles.loadingIndicator}
							/>
						) : latestError && !current && !createMutation.isPending ? (
							// Only when we have NOTHING to show: TanStack keeps `data`
							// and sets `error` on a background refetch failure, so
							// gating on `latestError` alone would let a poll blip
							// replace the live pending card (withdraw/resend controls
							// and all) — or an in-flight submit — with an error card.
							<View style={styles.errorBox}>
								<ThemedText style={styles.errorText}>
									{/* Mapped copy, never error.message: the client
									    stringifies object error bodies */}
									Couldn&apos;t load this booth&apos;s transfer status.{" "}
									{transferErrorMessage(latestError)}
								</ThemedText>
							</View>
						) : pendingOffer ? (
							<>
								{/* Pending offer card */}
								<View style={styles.pendingCard}>
									<ThemedText style={styles.pendingTitle}>
										Offer pending with {pendingOffer.buyer_email}
									</ThemedText>
									<ThemedText style={styles.pendingMeta}>
										Sent {formatDate(pendingOffer.created_at)}
										{remaining ? ` · expires in ${remaining}` : ""}
									</ThemedText>
									{pendingLapsed && (
										<ThemedText style={styles.pendingMeta}>
											The offer window has lapsed. Resend the email to give
											the buyer a fresh link and restart the 7-day window.
										</ThemedText>
									)}
									{pendingOffer.invitation_sent &&
										!pendingOffer.buyer_account_exists && (
											<ThemedText style={styles.pendingMeta}>
												The buyer doesn&apos;t have an account yet, so we
												invited them to create one before they can accept.
											</ThemedText>
										)}
								</View>

								{resendMutation.isSuccess && (
									<View style={styles.successBox}>
										<ThemedText style={styles.successText}>
											A fresh offer email is on its way to{" "}
											{pendingOffer.buyer_email}. The previous link no longer
											works.
										</ThemedText>
									</View>
								)}

								<TouchableOpacity
									style={[
										styles.primaryButton,
										{ opacity: isBusy ? 0.5 : 1 },
									]}
									onPress={handleResend}
									disabled={isBusy}
								>
									{resendMutation.isPending ? (
										<ActivityIndicator color="#FFFFFF" size="small" />
									) : (
										<ThemedText style={styles.primaryButtonText}>
											Resend email
										</ThemedText>
									)}
								</TouchableOpacity>
								{!resendMutation.isSuccess && (
									<ThemedText style={[styles.hint, { color: textSecondary }]}>
										Resending gives the buyer a new link; the one in the
										previous email stops working.
									</ThemedText>
								)}

								<TouchableOpacity
									style={[
										styles.withdrawButton,
										{ opacity: isBusy ? 0.5 : 1 },
									]}
									onPress={handleWithdraw}
									disabled={isBusy}
								>
									{cancelMutation.isPending ? (
										<ActivityIndicator color="#DC2626" size="small" />
									) : (
										<ThemedText style={styles.withdrawButtonText}>
											Withdraw offer
										</ThemedText>
									)}
								</TouchableOpacity>
							</>
						) : (
							<>
								{current && historyLabel && (
									<ThemedText
										style={[styles.historyLine, { color: textSecondary }]}
									>
										{historyLabel}{" "}
										<ThemedText
											style={[styles.subtitleName, { color: textColor }]}
										>
											{current.buyer_email}
										</ThemedText>{" "}
										({formatDate(current.created_at)}). You can send a new
										offer.
									</ThemedText>
								)}

								{/* Offer form */}
								<View style={styles.fieldContainer}>
									<ThemedText
										style={[styles.fieldLabel, { color: textSecondary }]}
									>
										Buyer&apos;s Email
									</ThemedText>
									<View
										style={[
											styles.inputContainer,
											{ backgroundColor: cardBg, borderColor },
										]}
									>
										<IconSymbol
											name="envelope"
											size={20}
											color={textSecondary}
											style={styles.inputIcon}
										/>
										<TextInput
											style={[styles.input, { color: textColor }]}
											value={buyerEmail}
											onChangeText={setBuyerEmail}
											placeholder="buyer@example.com"
											placeholderTextColor={textSecondary}
											keyboardType="email-address"
											autoCapitalize="none"
											autoCorrect={false}
											editable={!createMutation.isPending}
										/>
									</View>
									<ThemedText style={[styles.hint, { color: textSecondary }]}>
										They get an email with an accept link that expires in 7
										days. The booth&apos;s settings, templates, and remaining
										subscription time move with it; your sales history stays
										with you.
									</ThemedText>
								</View>

								<TouchableOpacity
									style={[
										styles.primaryButton,
										{
											opacity:
												!buyerEmail.trim() || createMutation.isPending
													? 0.5
													: 1,
										},
									]}
									onPress={handleSubmit}
									disabled={!buyerEmail.trim() || createMutation.isPending}
								>
									{createMutation.isPending ? (
										<ActivityIndicator color="#FFFFFF" size="small" />
									) : (
										<ThemedText style={styles.primaryButtonText}>
											Send Transfer Offer
										</ThemedText>
									)}
								</TouchableOpacity>
							</>
						)}
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</Modal>
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
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	headerTitle: {
		fontSize: scaleFont(18),
	},
	headerSpacer: {
		width: 22,
	},
	content: {
		paddingHorizontal: Spacing.lg,
		paddingTop: Spacing.sm,
		paddingBottom: Spacing.xl,
	},
	subtitle: {
		fontSize: scaleFont(14),
		marginBottom: Spacing.lg,
	},
	subtitleName: {
		fontSize: scaleFont(14),
		fontWeight: "600",
	},
	loadingIndicator: {
		marginVertical: Spacing.xl,
	},
	errorBox: {
		backgroundColor: "rgba(239, 68, 68, 0.1)",
		borderColor: "rgba(239, 68, 68, 0.2)",
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		padding: Spacing.md,
		marginBottom: Spacing.md,
	},
	errorText: {
		color: "#EF4444",
		fontSize: scaleFont(14),
	},
	successBox: {
		backgroundColor: "rgba(34, 197, 94, 0.1)",
		borderColor: "rgba(34, 197, 94, 0.2)",
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		padding: Spacing.md,
		marginBottom: Spacing.md,
	},
	successText: {
		color: "#16A34A",
		fontSize: scaleFont(14),
	},
	pendingCard: {
		backgroundColor: "rgba(245, 158, 11, 0.1)",
		borderColor: "rgba(245, 158, 11, 0.25)",
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		padding: Spacing.md,
		marginBottom: Spacing.md,
		gap: Spacing.xs,
	},
	pendingTitle: {
		color: "#B45309",
		fontSize: scaleFont(14),
		fontWeight: "600",
	},
	pendingMeta: {
		color: "#B45309",
		fontSize: scaleFont(13),
		opacity: 0.9,
	},
	historyLine: {
		fontSize: scaleFont(14),
		marginBottom: Spacing.lg,
	},
	fieldContainer: {
		marginBottom: Spacing.lg,
	},
	fieldLabel: {
		fontSize: scaleFont(13),
		fontWeight: "500",
		marginBottom: Spacing.xs,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		paddingHorizontal: Spacing.md,
		height: 48,
	},
	inputIcon: {
		marginRight: Spacing.sm,
	},
	input: {
		flex: 1,
		fontSize: scaleFont(16),
		height: "100%",
	},
	hint: {
		fontSize: scaleFont(12),
		marginTop: Spacing.xs,
		lineHeight: scaleFont(17),
	},
	primaryButton: {
		backgroundColor: BRAND_COLOR,
		borderRadius: BorderRadius.lg,
		height: 48,
		alignItems: "center",
		justifyContent: "center",
		marginTop: Spacing.sm,
	},
	primaryButtonText: {
		color: "#FFFFFF",
		fontSize: scaleFont(16),
		fontWeight: "600",
	},
	withdrawButton: {
		borderColor: "rgba(220, 38, 38, 0.4)",
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		height: 48,
		alignItems: "center",
		justifyContent: "center",
		marginTop: Spacing.md,
	},
	withdrawButtonText: {
		color: "#DC2626",
		fontSize: scaleFont(16),
		fontWeight: "600",
	},
});
