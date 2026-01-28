/**
 * Template Detail Screen
 *
 * Shows full template details, reviews, and add-to-cart functionality.
 *
 * @see /api/templates/queries.ts - useTemplateById, useTemplateReviews
 */

import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
	useSubmitReview,
	useTemplateById,
	useTemplateReviews,
	useUpdateReview,
} from "@/api/templates/queries";
import { TemplateReviewCard } from "@/components/store/template-review-card";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	StatusColors,
	withAlpha,
} from "@/constants/theme";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useCartStore } from "@/stores/cart-store";

export default function TemplateDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const templateId = id ? Number(id) : null;

	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");

	const { data: template, isLoading } = useTemplateById(templateId);
	const { data: reviewsData } = useTemplateReviews(templateId);

	const addItem = useCartStore((s) => s.addItem);
	const isInCart = useCartStore((s) =>
		template ? s.isInCart(template.id) : false,
	);

	const { session } = useAuthSession();
	const submitReview = useSubmitReview();
	const updateReview = useUpdateReview();
	const [reviewRating, setReviewRating] = useState(0);
	const [reviewTitle, setReviewTitle] = useState("");
	const [reviewComment, setReviewComment] = useState("");

	// Find the current user's existing review
	const existingReview = useMemo(() => {
		if (!session?.id || !reviewsData?.reviews) return null;
		return reviewsData.reviews.find((r) => r.user_id === session.id) ?? null;
	}, [session?.id, reviewsData?.reviews]);

	// Pre-fill form when existing review is found
	useEffect(() => {
		if (existingReview) {
			setReviewRating(existingReview.rating);
			setReviewTitle(existingReview.title ?? "");
			setReviewComment(existingReview.comment ?? "");
		}
	}, [existingReview]);

	const isEditing = !!existingReview;
	const isMutating = submitReview.isPending || updateReview.isPending;

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

	if (isLoading || !template) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor }]}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
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
						source={{ uri: template.preview_url }}
						style={styles.image}
						contentFit="contain"
						transition={200}
					/>
				</View>

				{/* Info Section */}
				<View
					style={[styles.infoSection, { backgroundColor: cardBg, borderColor }]}
				>
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

					{/* Add to Cart Button */}
					<TouchableOpacity
						style={[
							styles.addToCartButton,
							{
								backgroundColor: isInCart
									? withAlpha(BRAND_COLOR, 0.15)
									: BRAND_COLOR,
							},
						]}
						onPress={() => {
							if (!isInCart) addItem(template);
						}}
						disabled={isInCart}
					>
						<IconSymbol
							name={isInCart ? "checkmark" : "bag.badge.plus"}
							size={20}
							color={isInCart ? BRAND_COLOR : "#FFFFFF"}
						/>
						<ThemedText
							style={[
								styles.addToCartText,
								{ color: isInCart ? BRAND_COLOR : "#FFFFFF" },
							]}
						>
							{isInCart ? "In Cart" : "Add to Cart"}
						</ThemedText>
					</TouchableOpacity>
				</View>

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
								onPress={() => setReviewRating(star)}
							>
								<IconSymbol
									name={star <= reviewRating ? "star.fill" : "star"}
									size={32}
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

					{/* Submit button */}
					<TouchableOpacity
						style={[
							styles.submitReviewButton,
							{ opacity: isMutating ? 0.6 : 1 },
						]}
						onPress={handleSubmitReview}
						disabled={isMutating}
					>
						{isMutating ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<ThemedText style={styles.submitReviewText}>
								{isEditing ? "Update Review" : "Submit Review"}
							</ThemedText>
						)}
					</TouchableOpacity>
				</View>

				{/* Reviews Section */}
				<View style={styles.reviewsSection}>
					<ThemedText style={styles.sectionTitle}>
						Reviews ({reviewsData?.total ?? 0})
					</ThemedText>
					{reviewsData?.reviews.map((review) => (
						<TemplateReviewCard key={review.id} review={review} />
					))}
					{(!reviewsData || reviewsData.reviews.length === 0) && (
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
		fontSize: 16,
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
		margin: Spacing.md,
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.sm,
	},
	name: {
		fontSize: 22,
		fontWeight: "700",
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
		fontSize: 12,
		fontWeight: "600",
	},
	category: {
		fontSize: 13,
	},
	ratingRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	ratingText: {
		fontSize: 13,
		marginLeft: 4,
	},
	priceRow: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: Spacing.sm,
	},
	priceLarge: {
		fontSize: 28,
		fontWeight: "800",
		paddingTop: Spacing.md,
    
	},
	originalPriceLarge: {
		fontSize: 18,
		textDecorationLine: "line-through",
	},
	description: {
		fontSize: 14,
		lineHeight: 20,
	},
	addToCartButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		gap: Spacing.sm,
		marginTop: Spacing.xs,
	},
	addToCartText: {
		fontSize: 16,
		fontWeight: "700",
	},

	// Review form
	reviewFormSection: {
		margin: Spacing.md,
		marginTop: 0,
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.sm,
	},
	starSelector: {
		flexDirection: "row",
		gap: Spacing.sm,
	},
	reviewInput: {
		borderWidth: 1,
		borderRadius: BorderRadius.md,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		fontSize: 15,
	},
	reviewTextArea: {
		minHeight: 80,
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
		fontSize: 15,
		fontWeight: "600",
	},

	// Reviews
	reviewsSection: {
		paddingHorizontal: Spacing.md,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "700",
		marginBottom: Spacing.md,
	},
	noReviews: {
		fontSize: 14,
		textAlign: "center",
		paddingVertical: Spacing.lg,
	},
});
