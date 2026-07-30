/**
 * Template Detail Screen
 *
 * Shows full template details and reviews. Purchases are US-storefront only
 * (Guideline 3.1.1(a)): TemplateBuySection renders a Buy CTA behind the
 * useExternalPurchases() gate and stays neutral/browse-only everywhere else.
 *
 * @see /api/templates/queries.ts - useTemplateById, useTemplateReviews
 * @see /components/store/template-buy-section.tsx - gated purchase CTA
 */

import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
	useDeleteReview,
	useSubmitReview,
	useTemplateById,
	useTemplateReviews,
	useUpdateReview,
} from "@/api/templates/queries";
import { TemplateBuySection } from "@/components/store/template-buy-section";
import { TemplateReviewCard } from "@/components/store/template-review-card";
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
import { useThemeColor } from "@/hooks/use-theme-color";

export default function TemplateDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	// Template ids are UUID strings — use as-is (never coerce to Number).
	const templateId = id && id.length > 0 ? id : null;

	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");

	const { data: template, isLoading } = useTemplateById(templateId);
	const { data: reviewsData, isLoading: isLoadingReviews } = useTemplateReviews(templateId);

	const submitReview = useSubmitReview();
	const updateReview = useUpdateReview();
	const [reviewRating, setReviewRating] = useState(0);
	const [reviewTitle, setReviewTitle] = useState("");
	const [reviewComment, setReviewComment] = useState("");

	// Find the current user's existing review. The reviews API flags the
	// caller's own review with `is_own_review` (it does not return user ids).
	const existingReview = useMemo(() => {
		if (!reviewsData?.reviews) return null;
		return reviewsData.reviews.find((r) => r.is_own_review) ?? null;
	}, [reviewsData?.reviews]);

	// Pre-fill form when existing review is first found (not on refetches)
	const hasPreFilled = useRef(false);
	useEffect(() => {
		if (existingReview && !hasPreFilled.current) {
			hasPreFilled.current = true;
			setReviewRating(existingReview.rating);
			setReviewTitle(existingReview.title ?? "");
			setReviewComment(existingReview.comment ?? "");
		}
	}, [existingReview]);

	const isEditing = !!existingReview;
	const deleteReview = useDeleteReview();
	const isMutating = submitReview.isPending || updateReview.isPending || deleteReview.isPending;

	const handleSubmitReview = () => {
		if (!templateId || reviewRating === 0) {
			Alert.alert("Rating Required", "Please select a star rating.");
			return;
		}

		const reviewData = {
			rating: reviewRating,
			...(reviewTitle.trim() ? { title: reviewTitle.trim() } : {}),
			...(reviewComment.trim() ? { comment: reviewComment.trim() } : {}),
		};

		if (isEditing) {
			updateReview.mutate(
				{ templateId, reviewId: existingReview.id, data: reviewData },
				{
					onSuccess: () => {
						Alert.alert("Review Updated", "Your review has been updated.");
					},
					onError: () => {
						Alert.alert("Error", "Failed to update review. Please try again.");
					},
				},
			);
		} else {
			submitReview.mutate(
				{ templateId, data: reviewData },
				{
					onSuccess: () => {
						Alert.alert("Review Submitted", "Thanks for your feedback!");
					},
					onError: () => {
						Alert.alert("Error", "Failed to submit review. Please try again.");
					},
				},
			);
		}
	};

	const handleDeleteReview = () => {
		if (!templateId || !existingReview) return;
		Alert.alert("Delete Review", "Are you sure you want to delete your review?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => {
					deleteReview.mutate(
						{ templateId, reviewId: existingReview.id },
						{
							onSuccess: () => {
								hasPreFilled.current = false;
								setReviewRating(0);
								setReviewTitle("");
								setReviewComment("");
								Alert.alert("Review Deleted", "Your review has been removed.");
							},
							onError: () => {
								Alert.alert("Error", "Failed to delete review. Please try again.");
							},
						},
					);
				},
			},
		]);
	};

	if (isLoading) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor }]}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
				</View>
			</SafeAreaView>
		);
	}

	if (!template) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor }]}>
				<View style={[styles.header, { borderColor }]}>
					<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
						<IconSymbol name="chevron.left" size={20} color={textColor} />
					</TouchableOpacity>
					<ThemedText style={styles.headerTitle}>Template</ThemedText>
					<View style={styles.backButton} />
				</View>
				<View style={styles.loadingContainer}>
					<IconSymbol name="exclamationmark.triangle" size={48} color={textSecondary} />
					<ThemedText style={{ color: textSecondary, marginTop: Spacing.md }}>
						Template not found
					</ThemedText>
				</View>
			</SafeAreaView>
		);
	}

	const price = parseFloat(template.price);
	const isFree = price === 0;
	const isOnSale = template.original_price !== null;
	const originalPrice = isOnSale ? parseFloat(template.original_price!) : null;
	const rating = parseFloat(template.rating_average);

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor }]}
			edges={["top"]}
		>
			{/* Header */}
			<View style={[styles.header, { borderColor }]}>
				<TouchableOpacity
					onPress={() => router.back()}
					style={styles.backButton}
				>
					<IconSymbol name="chevron.left" size={20} color={textColor} />
				</TouchableOpacity>
				<ThemedText style={styles.headerTitle} numberOfLines={1}>
					{template.name}
				</ThemedText>
				<View style={styles.backButton} />
			</View>

			<ScrollView contentContainerStyle={styles.scrollContent}>
				{/* Preview Image */}
				<View style={styles.imageContainer}>
					<Image
						source={template.preview_url ? { uri: template.preview_url } : null}
						style={styles.image}
						contentFit="contain"
						transition={200}
					/>
				</View>

				{/* Info Section */}
				<View
					style={[styles.infoSection, { backgroundColor: cardBg, borderColor }]}
				>
					{/* Identity block: name, type, rating stay visually grouped */}
					<View style={styles.infoIdentity}>
						<ThemedText style={styles.name}>{template.name}</ThemedText>

						{/* Type badge */}
						<View style={styles.metaRow}>
							<View
								style={[
									styles.typeBadge,
									{ backgroundColor: withAlpha(BRAND_COLOR, 0.1) },
								]}
							>
								<ThemedText
									style={[styles.typeBadgeText, { color: BRAND_COLOR }]}
								>
									{template.template_type === "strip"
										? "Photo Strip"
										: "4x6 Photo"}
								</ThemedText>
							</View>
							<ThemedText style={[styles.category, { color: textSecondary }]}>
								{template.category.name}
							</ThemedText>
						</View>

						{/* Rating */}
						{template.review_count > 0 && (
							<View style={styles.ratingRow}>
								{[1, 2, 3, 4, 5].map((star) => (
									<IconSymbol
										key={star}
										name={star <= Math.round(rating) ? "star.fill" : "star"}
										size={16}
										color={star <= Math.round(rating) ? "#FFB300" : "#8B949E"}
									/>
								))}
								<ThemedText style={[styles.ratingText, { color: textSecondary }]}>
									{rating.toFixed(1)} ({template.review_count} review
									{template.review_count !== 1 ? "s" : ""})
								</ThemedText>
							</View>
						)}
					</View>

					<View style={[styles.divider, { backgroundColor: borderColor }]} />

					{/* Price */}
					<View style={styles.priceRow}>
						{isFree ? (
							<ThemedText
								style={[styles.priceLarge, { color: StatusColors.success }]}
							>
								Free
							</ThemedText>
						) : (
							<>
								<ThemedText style={styles.priceLarge}>
									${price.toFixed(2)}
								</ThemedText>
								{isOnSale && originalPrice && (
									<ThemedText
										style={[
											styles.originalPriceLarge,
											{ color: textSecondary },
										]}
									>
										${originalPrice.toFixed(2)}
									</ThemedText>
								)}
							</>
						)}
					</View>

					{/* Description */}
					{template.description && (
						<ThemedText style={[styles.description, { color: textSecondary }]}>
							{template.description}
						</ThemedText>
					)}
				</View>

				{/* Purchase (US storefront only — hidden or neutral elsewhere) */}
				<TemplateBuySection template={template} />

				{/* Write a Review */}
				<View
					style={[
						styles.reviewFormSection,
						{ backgroundColor: cardBg, borderColor },
					]}
				>
					<ThemedText style={styles.sectionTitle}>
						{isEditing ? "Edit Your Review" : "Write a Review"}
					</ThemedText>

					{/* Star selector */}
					<View style={styles.starSelector}>
						{[1, 2, 3, 4, 5].map((star) => (
							<TouchableOpacity
								key={star}
								style={styles.starButton}
								accessibilityRole="button"
								accessibilityLabel={`Rate ${star} star${star !== 1 ? "s" : ""}`}
								onPress={() => setReviewRating(star)}
							>
								<IconSymbol
									name={star <= reviewRating ? "star.fill" : "star"}
									size={30}
									color={star <= reviewRating ? "#FFB300" : "#8B949E"}
								/>
							</TouchableOpacity>
						))}
					</View>

					{/* Title input */}
					<TextInput
						style={[styles.reviewInput, { color: textColor, borderColor }]}
						placeholder="Title (optional)"
						placeholderTextColor={textSecondary}
						value={reviewTitle}
						onChangeText={setReviewTitle}
					/>

					{/* Comment input */}
					<TextInput
						style={[
							styles.reviewInput,
							styles.reviewTextArea,
							{ color: textColor, borderColor },
						]}
						placeholder="Write your review..."
						placeholderTextColor={textSecondary}
						value={reviewComment}
						onChangeText={setReviewComment}
						multiline
						numberOfLines={4}
						textAlignVertical="top"
					/>

					{/* Submit / Delete buttons */}
					<View style={styles.reviewButtonRow}>
						<TouchableOpacity
							style={[
								styles.submitReviewButton,
								{ opacity: isMutating ? 0.6 : 1, flex: 1 },
							]}
							onPress={handleSubmitReview}
							disabled={isMutating}
						>
							{isMutating && !deleteReview.isPending ? (
								<ActivityIndicator size="small" color="#FFFFFF" />
							) : (
								<ThemedText style={styles.submitReviewText}>
									{isEditing ? "Update Review" : "Submit Review"}
								</ThemedText>
							)}
						</TouchableOpacity>
						{isEditing && (
							<TouchableOpacity
								style={[
									styles.deleteReviewButton,
									{ opacity: isMutating ? 0.6 : 1 },
								]}
								onPress={handleDeleteReview}
								disabled={isMutating}
							>
								{deleteReview.isPending ? (
									<ActivityIndicator size="small" color={StatusColors.error} />
								) : (
									<IconSymbol name="trash" size={18} color={StatusColors.error} />
								)}
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Reviews Section */}
				<View style={styles.reviewsSection}>
					<ThemedText style={[styles.sectionTitle, styles.reviewsTitle]}>
						Reviews ({reviewsData?.total ?? 0})
					</ThemedText>
					{reviewsData?.reviews.map((review) => (
						<TemplateReviewCard key={review.id} review={review} />
					))}
					{isLoadingReviews && (
						<ActivityIndicator size="small" color={BRAND_COLOR} style={{ paddingVertical: Spacing.lg }} />
					)}
					{!isLoadingReviews && (!reviewsData || reviewsData.reviews.length === 0) && (
						<ThemedText style={[styles.noReviews, { color: textSecondary }]}>
							No reviews yet. Be the first!
						</ThemedText>
					)}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},

	// Header
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderBottomWidth: 1,
	},
	backButton: {
		width: 40,
		height: 40,
		alignItems: "center",
		justifyContent: "center",
	},
	headerTitle: {
		flex: 1,
		textAlign: "center",
		fontSize: scaleFont(16),
		fontWeight: "600",
	},

	scrollContent: {
		paddingBottom: Spacing.xxl,
	},

	// Image
	imageContainer: {
		aspectRatio: 3 / 4,
		width: "100%",
	},
	image: {
		width: "100%",
		height: "100%",
	},

	// Info
	infoSection: {
		marginHorizontal: Spacing.md,
		marginTop: Spacing.md,
		padding: Spacing.lg,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.md,
	},
	infoIdentity: {
		gap: Spacing.sm,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
	},
	name: {
		fontSize: scaleFont(22),
		fontWeight: "700",
		lineHeight: scaleFont(28),
	},
	metaRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	typeBadge: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: BorderRadius.sm,
	},
	typeBadgeText: {
		fontSize: scaleFont(12),
		fontWeight: "600",
	},
	category: {
		fontSize: scaleFont(13),
	},
	ratingRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	ratingText: {
		fontSize: scaleFont(13),
		marginLeft: 4,
	},
	priceRow: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: Spacing.sm,
	},
	priceLarge: {
		fontSize: scaleFont(28),
		fontWeight: "800",
		lineHeight: scaleFont(34),
	},
	originalPriceLarge: {
		fontSize: scaleFont(18),
		textDecorationLine: "line-through",
	},
	description: {
		fontSize: scaleFont(14),
		lineHeight: 20,
	},

	// Review form
	reviewFormSection: {
		marginHorizontal: Spacing.md,
		marginTop: Spacing.md,
		padding: Spacing.lg,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.md,
	},
	starSelector: {
		flexDirection: "row",
		marginLeft: -Spacing.xs,
	},
	starButton: {
		paddingHorizontal: Spacing.xs,
		paddingVertical: Spacing.xs,
	},
	reviewInput: {
		borderWidth: 1,
		borderRadius: BorderRadius.md,
		paddingHorizontal: Spacing.md,
		paddingVertical: 14,
		fontSize: scaleFont(15),
	},
	reviewTextArea: {
		minHeight: 110,
		paddingTop: 14,
	},
	reviewButtonRow: {
		flexDirection: "row",
		gap: Spacing.sm,
		marginTop: Spacing.xs,
	},
	submitReviewButton: {
		backgroundColor: BRAND_COLOR,
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		alignItems: "center",
		justifyContent: "center",
	},
	submitReviewText: {
		color: "#FFFFFF",
		fontSize: scaleFont(15),
		fontWeight: "600",
	},
	deleteReviewButton: {
		borderWidth: 1,
		borderColor: StatusColors.error,
		paddingHorizontal: Spacing.md,
		borderRadius: BorderRadius.lg,
		alignItems: "center",
		justifyContent: "center",
	},

	// Reviews
	reviewsSection: {
		paddingHorizontal: Spacing.md,
		marginTop: Spacing.lg,
	},
	// No marginBottom: the form card's `gap` owns the spacing below the title.
	sectionTitle: {
		fontSize: scaleFont(18),
		fontWeight: "700",
	},
	reviewsTitle: {
		marginBottom: Spacing.md,
	},
	noReviews: {
		fontSize: scaleFont(14),
		textAlign: "center",
		paddingVertical: Spacing.lg,
	},
});
