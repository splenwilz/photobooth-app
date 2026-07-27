/**
 * Template Buy Section — the only purchase affordance in the store.
 *
 * Storefront policy (Guideline 3.1.1(a)):
 * - US storefront (useExternalPurchases().enabled): a Buy button that opens
 *   Stripe web checkout for the selected booth.
 * - Every other storefront: a neutral "not available in the app" line for
 *   paid templates — deliberately with NO link, URL, or call to action.
 * - Gate still resolving: render nothing (never flash a CTA that may be
 *   forbidden).
 *
 * Template purchases are per-booth, so when the user is in "all booths" mode
 * with several booths they pick the target booth here (same pattern as
 * app/store/purchased.tsx).
 */

import { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

import { useBoothOverview } from "@/api/booths/queries";
import { usePurchasedTemplates } from "@/api/templates/queries";
import type { Template } from "@/api/templates/types";
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
import { useTemplatePurchase } from "@/hooks/use-template-purchase";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ALL_BOOTHS_ID, useBoothStore } from "@/stores/booth-store";

export function TemplateBuySection({ template }: { template: Template }) {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	const { enabled, isLoading: isGateLoading } = useExternalPurchases();

	const selectedBoothId = useBoothStore((s) => s.selectedBoothId);
	const { data: boothOverview } = useBoothOverview();
	const booths = boothOverview?.booths ?? [];
	const isAllMode = selectedBoothId === ALL_BOOTHS_ID;
	const [pickedBoothId, setPickedBoothId] = useState<string | null>(null);
	const effectiveBoothId = isAllMode
		? booths.length === 1
			? booths[0].booth_id
			: pickedBoothId
		: selectedBoothId;

	// Ownership is DISPLAY, not a purchase affordance — query it regardless of
	// the storefront gate so owned templates show as "Purchased" everywhere.
	// per_page 100: the ownership check must not miss purchases on page 2.
	const { data: purchasedData } = usePurchasedTemplates({
		booth_id: effectiveBoothId ?? undefined,
		per_page: 100,
	});
	const isPurchasedForBooth =
		purchasedData?.purchases.some((p) => p.template_id === template.id) ??
		false;

	const { purchase, isPurchasing } = useTemplatePurchase();

	const price = parseFloat(template.price);
	if (price === 0) return null;

	const boothName = booths.find(
		(b) => b.booth_id === effectiveBoothId,
	)?.booth_name;

	// Booth picker — shown whenever a choice exists, INCLUDING the purchased
	// state (owning it for booth A must not block buying it for booth B).
	const boothPicker = isAllMode && booths.length > 1 && (
		<View style={styles.boothPickerList}>
			<ThemedText style={[styles.boothPickerLabel, { color: textSecondary }]}>
				{isPurchasedForBooth ? "Booth:" : "Buy for booth:"}
			</ThemedText>
			{booths.map((booth) => {
				const isSelected = pickedBoothId === booth.booth_id;
				return (
					<TouchableOpacity
						key={booth.booth_id}
						style={[
							styles.boothPickerItem,
							{
								borderColor: isSelected ? BRAND_COLOR : borderColor,
								backgroundColor: isSelected
									? withAlpha(BRAND_COLOR, 0.1)
									: cardBg,
							},
						]}
						onPress={() => setPickedBoothId(booth.booth_id)}
					>
						<IconSymbol
							name={isSelected ? "checkmark.circle.fill" : "circle"}
							size={18}
							color={isSelected ? BRAND_COLOR : textSecondary}
						/>
						<ThemedText
							numberOfLines={1}
							style={[
								styles.boothPickerName,
								isSelected && { color: BRAND_COLOR },
							]}
						>
							{booth.booth_name}
						</ThemedText>
					</TouchableOpacity>
				);
			})}
		</View>
	);

	if (isPurchasedForBooth) {
		return (
			<View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
				{enabled && boothPicker}
				<View style={styles.purchasedRow}>
					<IconSymbol
						name="checkmark.circle.fill"
						size={20}
						color={StatusColors.success}
					/>
					<ThemedText
						style={[styles.purchasedText, { color: StatusColors.success }]}
					>
						Purchased{boothName ? ` for ${boothName}` : ""}
					</ThemedText>
				</View>
			</View>
		);
	}

	if (isGateLoading) return null;

	if (!enabled) {
		// Non-US storefronts: informational only. Never add a link, URL, or
		// instruction here — that would be a 3.1.1 violation outside the US.
		return (
			<View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
				<ThemedText style={[styles.unavailableText, { color: textSecondary }]}>
					Purchases are not available in the app.
				</ThemedText>
			</View>
		);
	}

	if (booths.length === 0) {
		// A template purchase is per-booth — nothing to buy for without one.
		return (
			<View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
				<ThemedText style={[styles.unavailableText, { color: textSecondary }]}>
					Create a booth to buy templates.
				</ThemedText>
			</View>
		);
	}

	const handleBuy = () => {
		if (!effectiveBoothId) {
			Alert.alert(
				"Select a Booth",
				"Choose which booth this template is for.",
			);
			return;
		}
		purchase({ templateId: template.id, boothId: effectiveBoothId })
			.then((outcome) => {
				if (outcome === "success") {
					Alert.alert(
						"Purchase Complete",
						`${template.name} is now available${boothName ? ` for ${boothName}` : ""}.`,
					);
				}
			})
			.catch((error: unknown) => {
				Alert.alert(
					"Purchase Failed",
					error instanceof Error ? error.message : "Please try again.",
				);
			});
	};

	return (
		<View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
			{boothPicker}

			<TouchableOpacity
				accessibilityRole="button"
				accessibilityLabel={`Buy ${template.name} for $${price.toFixed(2)}`}
				style={[
					styles.buyButton,
					{ backgroundColor: BRAND_COLOR },
					isPurchasing && styles.buyButtonDisabled,
				]}
				onPress={handleBuy}
				disabled={isPurchasing}
			>
				<ThemedText style={styles.buyButtonText}>
					{isPurchasing ? "Opening checkout…" : `Buy for $${price.toFixed(2)}`}
				</ThemedText>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	section: {
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		padding: Spacing.md,
		marginTop: Spacing.md,
		gap: Spacing.sm,
	},
	unavailableText: {
		fontSize: scaleFont(14),
		textAlign: "center",
	},
	purchasedRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.xs,
	},
	purchasedText: {
		fontSize: scaleFont(15),
		fontWeight: "600",
	},
	boothPickerList: {
		gap: Spacing.xs,
	},
	boothPickerLabel: {
		fontSize: scaleFont(13),
	},
	boothPickerItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs,
		borderWidth: 1,
		borderRadius: BorderRadius.md,
		paddingVertical: Spacing.sm,
		paddingHorizontal: Spacing.md,
	},
	boothPickerName: {
		fontSize: scaleFont(14),
		flexShrink: 1,
	},
	buyButton: {
		borderRadius: BorderRadius.md,
		paddingVertical: Spacing.md,
		alignItems: "center",
	},
	buyButtonDisabled: {
		opacity: 0.6,
	},
	buyButtonText: {
		color: "#fff",
		fontSize: scaleFont(16),
		fontWeight: "700",
	},
});
