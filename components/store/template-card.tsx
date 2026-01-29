/**
 * TemplateCard Component
 *
 * Displays a template in the store grid with preview image,
 * name, price, rating, and add-to-cart button.
 */

import { Image } from "expo-image";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

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
import { useCartStore } from "@/stores/cart-store";
import type { Template } from "@/api/templates/types";

interface TemplateCardProps {
  template: Template;
  onPress: (template: Template) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPress,
}) => {
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const textSecondary = useThemeColor({}, "textSecondary");

  const addItem = useCartStore((s) => s.addItem);
  const isInCart = useCartStore((s) => s.isInCart(template.id));

  const price = parseFloat(template.price);
  const isFree = price === 0;
  const isOnSale = template.original_price !== null;
  const originalPrice = isOnSale ? parseFloat(template.original_price!) : null;
  const rating = parseFloat(template.rating_average);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      activeOpacity={0.7}
      onPress={() => onPress(template)}
    >
      {/* Preview Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: template.preview_url }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        {/* Badges */}
        <View style={styles.badgeRow}>
          {template.is_featured && (
            <View style={[styles.badge, { backgroundColor: BRAND_COLOR }]}>
              <ThemedText style={styles.badgeText}>Featured</ThemedText>
            </View>
          )}
          {template.is_new && (
            <View
              style={[
                styles.badge,
                { backgroundColor: StatusColors.success },
              ]}
            >
              <ThemedText style={styles.badgeText}>New</ThemedText>
            </View>
          )}
          {isOnSale && (
            <View
              style={[
                styles.badge,
                { backgroundColor: StatusColors.error },
              ]}
            >
              <ThemedText style={styles.badgeText}>Sale</ThemedText>
            </View>
          )}
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <ThemedText numberOfLines={1} style={styles.name}>
          {template.name}
        </ThemedText>

        {/* Rating */}
        {template.review_count > 0 && (
          <View style={styles.ratingRow}>
            <IconSymbol name="star.fill" size={12} color="#FFB300" />
            <ThemedText style={[styles.ratingText, { color: textSecondary }]}>
              {rating.toFixed(1)} ({template.review_count})
            </ThemedText>
          </View>
        )}

        {/* Price + Cart */}
        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            {isFree ? (
              <ThemedText style={[styles.price, { color: StatusColors.success }]}>
                Free
              </ThemedText>
            ) : (
              <>
                <ThemedText style={styles.price}>
                  ${price.toFixed(2)}
                </ThemedText>
                {isOnSale && originalPrice && (
                  <ThemedText
                    style={[styles.originalPrice, { color: textSecondary }]}
                  >
                    ${originalPrice.toFixed(2)}
                  </ThemedText>
                )}
              </>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.cartButton,
              {
                backgroundColor: isInCart
                  ? withAlpha(BRAND_COLOR, 0.15)
                  : BRAND_COLOR,
              },
            ]}
            onPress={(e) => {
              e.stopPropagation?.();
              if (!isInCart) addItem(template);
            }}
            disabled={isInCart}
          >
            <IconSymbol
              name={isInCart ? "checkmark" : "plus"}
              size={16}
              color={isInCart ? BRAND_COLOR : "#FFFFFF"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
    flex: 1,
    marginBottom: Spacing.md,
  },
  imageContainer: {
    aspectRatio: 3 / 4,
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badgeRow: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: "row",
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  info: {
    padding: Spacing.sm,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  cartButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
