/**
 * StrandedSessionDetailsModal Component
 *
 * Shows context for one stranded paid session and — when the transaction
 * is not yet refunded — lets the operator record a refund (accounting
 * closure only; money must be returned physically first).
 *
 * Already-refunded events render in a read-only "Refunded $X by <user>"
 * state using the inline refund summary on the critical event.
 *
 * @see POST /api/v1/booths/{booth_id}/transactions/{transaction_code}/refund
 */
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
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

import { useRefundBoothTransaction } from "@/api/booths";
import type { RefundMethod } from "@/api/booths/types";
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
import {
	formatCriticalEventTag,
	formatCurrency,
	formatPaymentMethod,
	formatStrandedReason,
	type StrandedSessionRow,
} from "@/utils";

interface StrandedSessionDetailsModalProps {
	visible: boolean;
	boothId: string;
	row: StrandedSessionRow | null;
	onClose: () => void;
}

const NOTE_MAX_LENGTH = 1000;

const REFUND_METHOD_OPTIONS: { value: RefundMethod; label: string }[] = [
	{ value: "cash_till", label: "Cash Till" },
	{ value: "card_void", label: "Card Void" },
	{ value: "manual_credit_reverse", label: "Manual Credit" },
	{ value: "other", label: "Other" },
];

/**
 * Infer the refund channel from the transaction's payment_method.
 * Mirrors the doc's UX guidance: Cash → cash_till, Credit → card_void,
 * else → other.
 */
function inferRefundMethod(paymentMethod: string | null): RefundMethod {
	const m = paymentMethod?.toLowerCase() ?? "";
	if (m.includes("cash")) return "cash_till";
	if (m.includes("credit") || m.includes("card")) return "card_void";
	return "other";
}

function formatDateTime(timestamp: string): string {
	const d = new Date(timestamp);
	return `${d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	})} · ${d.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	})}`;
}

export function StrandedSessionDetailsModal({
	visible,
	boothId,
	row,
	onClose,
}: StrandedSessionDetailsModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");

	const refundMutation = useRefundBoothTransaction();

	// Track whether the modal is still mounted + visible at the moment a
	// refund mutation resolves. If the user dismissed the modal mid-flight,
	// we skip the success/error Alert (it would surface on the wrong screen)
	// and the redundant onClose call.
	const isMountedRef = useRef(true);
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);
	const visibleRef = useRef(visible);
	useEffect(() => {
		visibleRef.current = visible;
	}, [visible]);

	const defaultAmount = useMemo(() => {
		if (!row) return "";
		const amt =
			row.event.transaction_total_price ?? row.transaction?.total_price ?? null;
		return amt !== null ? amt.toFixed(2) : "";
	}, [row]);

	const defaultMethod = useMemo<RefundMethod>(
		() => inferRefundMethod(row?.transaction?.payment_method ?? null),
		[row?.transaction?.payment_method],
	);

	const [amount, setAmount] = useState(defaultAmount);
	const [method, setMethod] = useState<RefundMethod>(defaultMethod);
	const [note, setNote] = useState("");

	// Reset local form state when:
	//   - the modal opens (visible flips true)
	//   - the user opens a different row (event.id changes)
	//   - the underlying defaults hydrate after the modal is already open
	//     (e.g. transactions query lands later and supplies a real
	//     payment_method, flipping defaultMethod from "other" → "cash_till").
	// Adding defaultAmount + defaultMethod to the deps catches the third case.
	// Defaults are derived from row data via toFixed/inferRefundMethod, so
	// re-renders with unchanged data produce equal strings → no spurious
	// reset.
	useEffect(() => {
		if (visible) {
			setAmount(defaultAmount);
			setMethod(defaultMethod);
			setNote("");
			refundMutation.reset();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible, row?.event.id, defaultAmount, defaultMethod]);

	if (!row) return null;
	const { event, transaction } = row;
	// Union both sources: the inline-joined event.refund AND the transaction's
	// own refunded_at. The two queries refetch independently — there's a
	// race window where the transaction is refunded but the event's join
	// hasn't refreshed yet. Honoring both prevents offering a Refund button
	// the API will reject with 409.
	const refundSummary = (() => {
		if (event.refund) return { ...event.refund, note: transaction?.refund_note ?? null };
		if (
			transaction?.refunded_at &&
			transaction.refund_amount !== null &&
			transaction.refund_method !== null &&
			transaction.refunded_by_user_id !== null
		) {
			return {
				refunded_at: transaction.refunded_at,
				refunded_by_user_id: transaction.refunded_by_user_id,
				refund_amount: transaction.refund_amount,
				refund_method: transaction.refund_method,
				note: transaction.refund_note,
			};
		}
		return null;
	})();
	const isRefunded = refundSummary !== null;
	const maxRefundable =
		event.transaction_total_price ?? transaction?.total_price ?? null;

	const handleCopyCode = async () => {
		if (!event.transaction_code) return;
		try {
			await Clipboard.setStringAsync(event.transaction_code);
			Alert.alert("Copied", "Transaction code copied to clipboard.");
		} catch {
			Alert.alert("Copy failed", "Could not copy transaction code.");
		}
	};

	const parsedAmount = Number(amount);
	const amountInvalid =
		!Number.isFinite(parsedAmount) ||
		parsedAmount <= 0 ||
		(maxRefundable !== null && parsedAmount > maxRefundable + 0.0001);
	const canSubmit =
		!isRefunded &&
		!!event.transaction_code &&
		!amountInvalid &&
		!refundMutation.isPending;

	const handleSubmit = async () => {
		if (!canSubmit || !event.transaction_code) return;
		try {
			await refundMutation.mutateAsync({
				boothId,
				transactionCode: event.transaction_code,
				amount: parsedAmount,
				method,
				...(note.trim() ? { note: note.trim() } : {}),
			});
			if (!isMountedRef.current || !visibleRef.current) return;
			Alert.alert(
				"Refund recorded",
				`${formatCurrency(parsedAmount)} via ${REFUND_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method}.`,
			);
			onClose();
		} catch (e: unknown) {
			if (!isMountedRef.current || !visibleRef.current) return;
			const msg = e instanceof Error ? e.message : "Refund failed";
			Alert.alert("Could not record refund", msg);
		}
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<SafeAreaView style={[styles.container, { backgroundColor }]}>
				<View style={styles.header}>
					<TouchableOpacity
						onPress={onClose}
						hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						accessibilityRole="button"
						accessibilityLabel="Close"
						accessibilityHint="Closes this sheet"
					>
						<IconSymbol name="xmark" size={22} color={textSecondary} />
					</TouchableOpacity>
					<ThemedText type="subtitle" style={styles.headerTitle}>
						{isRefunded ? "Refund Record" : "Record Refund"}
					</ThemedText>
					<View style={styles.headerSpacer} />
				</View>

				<KeyboardAvoidingView
					style={styles.flex}
					behavior={Platform.OS === "ios" ? "padding" : undefined}
				>
					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
					>
						<View
							style={[
								styles.tagBadge,
								{
									backgroundColor: withAlpha(
										isRefunded ? StatusColors.success : StatusColors.error,
										0.12,
									),
								},
							]}
						>
							<IconSymbol
								name={
									isRefunded
										? "checkmark.circle.fill"
										: "exclamationmark.triangle.fill"
								}
								size={14}
								color={
									isRefunded ? StatusColors.success : StatusColors.error
								}
							/>
							<ThemedText
								style={[
									styles.tagText,
									{
										color: isRefunded
											? StatusColors.success
											: StatusColors.error,
									},
								]}
								numberOfLines={1}
							>
								{isRefunded ? "Refunded" : formatCriticalEventTag(event.tag)}
							</ThemedText>
						</View>

						{maxRefundable !== null && (
							<ThemedText type="title" style={styles.amountHeadline}>
								{formatCurrency(maxRefundable)}
								{transaction && (
									<ThemedText style={[styles.amountMeta, { color: textSecondary }]}>
										{" · "}
										{formatPaymentMethod(transaction.payment_method)}
									</ThemedText>
								)}
							</ThemedText>
						)}
						<ThemedText style={[styles.occurredAt, { color: textSecondary }]}>
							Occurred {formatDateTime(event.occurred_at)}
						</ThemedText>

						{/* Reference code */}
						<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
							<ThemedText style={[styles.cardLabel, { color: textSecondary }]}>
								Customer Reference Code
							</ThemedText>
							<View style={styles.codeRow}>
								<ThemedText type="defaultSemiBold" style={styles.codeText}>
									{event.transaction_code ?? "—"}
								</ThemedText>
								{event.transaction_code && (
									<TouchableOpacity
										style={[styles.copyBtn, { borderColor }]}
										onPress={handleCopyCode}
									>
										<IconSymbol name="doc.on.doc" size={14} color={BRAND_COLOR} />
										<ThemedText style={[styles.copyBtnText, { color: BRAND_COLOR }]}>
											Copy
										</ThemedText>
									</TouchableOpacity>
								)}
							</View>
						</View>

						{/* Refund block: either read-only record or input form */}
						{refundSummary ? (
							<View
								style={[
									styles.card,
									{
										backgroundColor: withAlpha(StatusColors.success, 0.08),
										borderColor: withAlpha(StatusColors.success, 0.3),
									},
								]}
							>
								<ThemedText
									style={[styles.cardLabel, { color: StatusColors.success }]}
								>
									Already Refunded
								</ThemedText>
								<DetailRow
									label="Amount"
									value={formatCurrency(refundSummary.refund_amount)}
									textSecondary={textSecondary}
								/>
								<DetailRow
									label="Method"
									value={humanMethod(refundSummary.refund_method)}
									textSecondary={textSecondary}
								/>
								<DetailRow
									label="When"
									value={formatDateTime(refundSummary.refunded_at)}
									textSecondary={textSecondary}
								/>
								<DetailRow
									label="By"
									value={refundSummary.refunded_by_user_id}
									textSecondary={textSecondary}
								/>
								{refundSummary.note && (
									<View style={styles.noteBlock}>
										<ThemedText
											style={[styles.noteLabel, { color: textSecondary }]}
										>
											Note
										</ThemedText>
										<ThemedText style={styles.noteText}>
											{refundSummary.note}
										</ThemedText>
									</View>
								)}
							</View>
						) : (
							<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
								<ThemedText style={[styles.cardLabel, { color: textSecondary }]}>
									Record Refund
								</ThemedText>

								{/* Amount */}
								<ThemedText
									style={[styles.fieldLabel, { color: textSecondary }]}
								>
									Amount
								</ThemedText>
								<View
									style={[
										styles.inputWrap,
										{
											backgroundColor,
											borderColor: amountInvalid
												? StatusColors.error
												: borderColor,
										},
									]}
								>
									<ThemedText style={[styles.dollarPrefix, { color: textSecondary }]}>
										$
									</ThemedText>
									<TextInput
										style={[styles.input, { color: textColor }]}
										value={amount}
										onChangeText={setAmount}
										placeholder="0.00"
										placeholderTextColor={textSecondary}
										keyboardType="decimal-pad"
										editable={!refundMutation.isPending}
									/>
								</View>
								{maxRefundable !== null && (
									<ThemedText
										style={[styles.helper, { color: textSecondary }]}
									>
										Max refundable: {formatCurrency(maxRefundable)}
									</ThemedText>
								)}

								{/* Method */}
								<ThemedText
									style={[
										styles.fieldLabel,
										{ color: textSecondary, marginTop: Spacing.md },
									]}
								>
									Method
								</ThemedText>
								<View style={styles.methodGrid}>
									{REFUND_METHOD_OPTIONS.map((opt) => {
										const selected = method === opt.value;
										return (
											<TouchableOpacity
												key={opt.value}
												style={[
													styles.methodChip,
													{
														backgroundColor: selected
															? withAlpha(BRAND_COLOR, 0.15)
															: "transparent",
														borderColor: selected ? BRAND_COLOR : borderColor,
														opacity: refundMutation.isPending ? 0.5 : 1,
													},
												]}
												onPress={() => setMethod(opt.value)}
												disabled={refundMutation.isPending}
											>
												<ThemedText
													style={[
														styles.methodChipText,
														{ color: selected ? BRAND_COLOR : textSecondary },
													]}
												>
													{opt.label}
												</ThemedText>
											</TouchableOpacity>
										);
									})}
								</View>

								{/* Note */}
								<ThemedText
									style={[
										styles.fieldLabel,
										{ color: textSecondary, marginTop: Spacing.md },
									]}
								>
									Note (optional)
								</ThemedText>
								<View
									style={[
										styles.inputWrap,
										styles.multilineWrap,
										{ backgroundColor, borderColor },
									]}
								>
									<TextInput
										style={[
											styles.input,
											styles.multilineInput,
											{ color: textColor },
										]}
										value={note}
										onChangeText={setNote}
										placeholder="Receipt #, incident context, etc."
										placeholderTextColor={textSecondary}
										multiline
										maxLength={NOTE_MAX_LENGTH}
										editable={!refundMutation.isPending}
									/>
								</View>
								<ThemedText style={[styles.charCount, { color: textSecondary }]}>
									{note.length}/{NOTE_MAX_LENGTH}
								</ThemedText>
							</View>
						)}

						{/* Raw exception details */}
						<View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
							<ThemedText style={[styles.cardLabel, { color: textSecondary }]}>
								Incident Details
							</ThemedText>
							<ThemedText style={styles.detailsText}>
								{event.details || "No additional details."}
							</ThemedText>
							{transaction?.stranded_reason && (
								<ThemedText
									style={[styles.reasonTag, { color: textSecondary }]}
								>
									Reason: {formatStrandedReason(transaction.stranded_reason)}
								</ThemedText>
							)}
						</View>

						<ThemedText style={[styles.guidance, { color: textSecondary }]}>
							Return funds physically (till or local card void) before
							recording the refund — this endpoint records accounting closure
							only, it does not move money.
						</ThemedText>
					</ScrollView>

					<View style={[styles.footer, { borderTopColor: borderColor }]}>
						{isRefunded ? (
							<TouchableOpacity
								style={[styles.primaryBtn, { backgroundColor: BRAND_COLOR }]}
								onPress={onClose}
							>
								<ThemedText style={styles.primaryBtnText}>Done</ThemedText>
							</TouchableOpacity>
						) : (
							<TouchableOpacity
								style={[
									styles.primaryBtn,
									{
										backgroundColor: canSubmit
											? StatusColors.success
											: withAlpha(StatusColors.success, 0.4),
									},
								]}
								onPress={handleSubmit}
								disabled={!canSubmit}
							>
								{refundMutation.isPending ? (
									<ActivityIndicator color="#FFFFFF" />
								) : (
									<ThemedText style={styles.primaryBtnText}>
										Record Refund
									</ThemedText>
								)}
							</TouchableOpacity>
						)}
					</View>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</Modal>
	);
}

function humanMethod(method: RefundMethod): string {
	const found = REFUND_METHOD_OPTIONS.find((o) => o.value === method);
	return found?.label ?? method;
}

function DetailRow({
	label,
	value,
	textSecondary,
}: {
	label: string;
	value: string;
	textSecondary: string;
}) {
	return (
		<View style={styles.detailRow}>
			<ThemedText style={[styles.detailLabel, { color: textSecondary }]}>
				{label}
			</ThemedText>
			<ThemedText style={styles.detailValue}>{value}</ThemedText>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	flex: { flex: 1 },
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	headerTitle: { fontSize: 18 },
	headerSpacer: { width: 22 },
	scroll: { flex: 1 },
	scrollContent: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.lg,
	},
	tagBadge: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.full,
		gap: 6,
		marginBottom: Spacing.sm,
	},
	tagText: {
		fontSize: 11,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	amountHeadline: { fontSize: 28, marginBottom: 2 },
	amountMeta: { fontSize: 14, fontWeight: "400" },
	occurredAt: { fontSize: 13, marginBottom: Spacing.lg },
	card: {
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		padding: Spacing.md,
		marginBottom: Spacing.md,
	},
	cardLabel: {
		fontSize: 11,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: Spacing.sm,
	},
	codeRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: Spacing.sm,
	},
	codeText: { fontSize: 15, flex: 1 },
	copyBtn: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 6,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		gap: 4,
	},
	copyBtnText: { fontSize: 12, fontWeight: "600" },
	fieldLabel: {
		fontSize: 11,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: Spacing.xs,
	},
	inputWrap: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: BorderRadius.md,
		paddingHorizontal: Spacing.sm,
		height: 44,
	},
	multilineWrap: {
		height: 80,
		alignItems: "flex-start",
		paddingVertical: Spacing.sm,
	},
	dollarPrefix: {
		fontSize: 16,
		marginRight: 4,
	},
	input: {
		flex: 1,
		fontSize: 15,
	},
	multilineInput: {
		height: "100%",
		textAlignVertical: "top",
	},
	helper: {
		fontSize: 11,
		marginTop: 4,
	},
	charCount: {
		fontSize: 11,
		marginTop: 4,
		alignSelf: "flex-end",
	},
	methodGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.xs,
	},
	methodChip: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderWidth: 1,
		borderRadius: BorderRadius.full,
	},
	methodChipText: {
		fontSize: 13,
		fontWeight: "500",
	},
	detailRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 6,
	},
	detailLabel: { fontSize: 13 },
	detailValue: { fontSize: 13, flexShrink: 1, textAlign: "right" },
	noteBlock: {
		marginTop: Spacing.sm,
	},
	noteLabel: {
		fontSize: 11,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 4,
	},
	noteText: { fontSize: 13, lineHeight: 18 },
	detailsText: { fontSize: 13, lineHeight: 19 },
	reasonTag: { fontSize: 12, marginTop: Spacing.sm, fontStyle: "italic" },
	guidance: {
		fontSize: 12,
		lineHeight: 17,
		paddingHorizontal: Spacing.xs,
		marginTop: Spacing.xs,
	},
	footer: {
		borderTopWidth: 1,
		padding: Spacing.lg,
	},
	primaryBtn: {
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 48,
	},
	primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
