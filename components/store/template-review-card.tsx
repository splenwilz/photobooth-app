/**
 * TemplateReviewCard Component
 *
 * Displays a single template review with rating stars, comment, and date.
 */

import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { TemplateReview } from "@/api/templates/types";

interface TemplateReviewCardProps {
  review: TemplateReview;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const TemplateReviewCard: React.FC<TemplateReviewCardProps> = ({
  review,
}) => {
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      {/* Header: Stars + Date */}
      <View style={styles.header}>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <IconSymbol
              key={star}
              name={star <= review.rating ? "star.fill" : "star"}
              size={14}
              color={star <= review.rating ? "#FFB300" : "#8B949E"}
            />
          ))}
        </View>
        <ThemedText style={[styles.date, { color: textSecondary }]}>
          {formatDate(review.created_at)}
        </ThemedText>
      </View>

      {/* Title */}
      {review.title && (
        <ThemedText style={styles.title}>{review.title}</ThemedText>
      )}

      {/* Comment */}
      {review.comment && (
        <ThemedText style={[styles.comment, { color: textSecondary }]}>
          {review.comment}
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  stars: {
    flexDirection: "row",
    gap: 2,
  },
  date: {
    fontSize: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  comment: {
    fontSize: 13,
    lineHeight: 18,
  },
});
