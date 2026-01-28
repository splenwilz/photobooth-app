/**
 * Cart Screen
 *
 * Displays cart items with remove buttons, subtotal, and checkout.
 * Checkout opens Stripe hosted checkout via expo-web-browser,
 * with deep links for success/cancel callbacks.
 *
 * @see /stores/cart-store.ts - Cart state
 * @see /api/templates/queries.ts - useTemplateCheckout
 */

import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";

import { useBoothOverview } from "@/api/booths/queries";
import { useTemplateCheckout } from "@/api/templates/queries";
import type { CartItem } from "@/api/templates/types";
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
import { ALL_BOOTHS_ID, useBoothStore } from "@/stores/booth-store";
import { useCartStore } from "@/stores/cart-store";

export default function CartScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textColor = useThemeColor({}, "text");

  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore((s) => s.getSubtotal());

  const checkout = useTemplateCheckout();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const selectedBoothId = useBoothStore((s) => s.selectedBoothId);
  const { data: boothOverview } = useBoothOverview();
  const booths = boothOverview?.booths ?? [];

  // If user has a specific booth selected, use it; otherwise they need to pick
  const isAllMode = selectedBoothId === ALL_BOOTHS_ID;
  const [pickedBoothId, setPickedBoothId] = useState<string | null>(null);

  // Auto-select if only one booth
  const effectiveBoothId = isAllMode
    ? (booths.length === 1 ? booths[0].booth_id : pickedBoothId)
    : selectedBoothId;

  const handleCheckout = async () => {
    if (!effectiveBoothId) {
      Alert.alert(
        "Select a Booth",
        "Please select a booth to purchase templates for.",
      );
      return;
    }

    const paidItems = items.filter(
      (item) => parseFloat(item.template.price) > 0,
    );

    // If all items are free, no Stripe checkout needed
    if (paidItems.length === 0) {
      Alert.alert(
        "Free Templates",
        "All items in your cart are free! No payment needed.",
      );
      useCartStore.getState().clearCart();
      router.back();
      return;
    }

    setIsCheckingOut(true);
    try {
      const result = await checkout.mutateAsync({
        booth_id: effectiveBoothId,
        items: paidItems.map((item) => ({
          template_id: item.template.id,
          quantity: item.quantity,
        })),
        success_url: `${process.env.EXPO_PUBLIC_WEBSITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=templates`,
        cancel_url: `${process.env.EXPO_PUBLIC_WEBSITE_URL}/templates`,
      });

      if (result.checkout_url) {
        await WebBrowser.openBrowserAsync(result.checkout_url);
      }
    } catch (error) {
      Alert.alert(
        "Checkout Error",
        error instanceof Error
          ? error.message
          : "Failed to create checkout session. Please try again.",
      );
    } finally {
      setIsCheckingOut(false);
    }
  };

  const renderCartItem = ({ item }: { item: CartItem }) => {
    const price = parseFloat(item.template.price);
    const isFree = price === 0;

    return (
      <View style={[styles.cartItem, { backgroundColor: cardBg, borderColor }]}>
        <Image
          source={{ uri: item.template.preview_url }}
          style={styles.itemImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.itemInfo}>
          <ThemedText numberOfLines={1} style={styles.itemName}>
            {item.template.name}
          </ThemedText>
          <ThemedText style={[styles.itemType, { color: textSecondary }]}>
            {item.template.template_type === "strip"
              ? "Photo Strip"
              : "4x6 Photo"}
          </ThemedText>
          {isFree ? (
            <ThemedText
              style={[styles.itemPrice, { color: StatusColors.success }]}
            >
              Free
            </ThemedText>
          ) : (
            <ThemedText style={styles.itemPrice}>
              ${price.toFixed(2)}
            </ThemedText>
          )}
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeItem(item.template.id)}
        >
          <IconSymbol name="trash" size={18} color={StatusColors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={20} color={textColor} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          Cart ({items.length})
        </ThemedText>
        <View style={styles.backButton} />
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="bag" size={48} color={textSecondary} />
          <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
            Your cart is empty
          </ThemedText>
          <TouchableOpacity
            style={[styles.browseButton, { backgroundColor: BRAND_COLOR }]}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.browseButtonText}>
              Browse Templates
            </ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={(item) => String(item.template.id)}
            contentContainerStyle={styles.listContent}
          />

          {/* Footer */}
          <View style={[styles.footer, { backgroundColor: cardBg, borderColor }]}>
            {/* Booth picker when in "all booths" mode with multiple booths */}
            {isAllMode && booths.length > 1 && (
              <View style={styles.boothPickerSection}>
                <ThemedText style={[styles.boothPickerLabel, { color: textSecondary }]}>
                  Purchase for booth:
                </ThemedText>
                <View style={styles.boothPickerList}>
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
              </View>
            )}

            <View style={styles.subtotalRow}>
              <ThemedText style={styles.subtotalLabel}>Subtotal</ThemedText>
              <ThemedText style={styles.subtotalValue}>
                ${subtotal.toFixed(2)}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[
                styles.checkoutButton,
                {
                  backgroundColor: BRAND_COLOR,
                  opacity: isCheckingOut ? 0.6 : 1,
                },
              ]}
              onPress={handleCheckout}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <IconSymbol name="lock.fill" size={16} color="#FFFFFF" />
                  <ThemedText style={styles.checkoutButtonText}>
                    Checkout
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 16,
    fontWeight: "600",
  },

  // List
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },

  // Cart Item
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  itemImage: {
    width: 60,
    height: 80,
    borderRadius: BorderRadius.md,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemType: {
    fontSize: 12,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  removeButton: {
    padding: Spacing.sm,
  },

  // Empty
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
  browseButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  browseButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  // Footer
  footer: {
    borderTopWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subtotalLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  subtotalValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  checkoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // Booth picker
  boothPickerSection: {
    gap: Spacing.sm,
  },
  boothPickerLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  boothPickerList: {
    gap: Spacing.xs,
  },
  boothPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  boothPickerName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
});
