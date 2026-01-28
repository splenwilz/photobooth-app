/**
 * Purchased Templates Screen
 *
 * Shows the user's purchased templates with download buttons.
 *
 * @see /api/templates/queries.ts - usePurchasedTemplates, useDownloadTemplate
 */

import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, StyleSheet, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDownloadTemplate, usePurchasedTemplates } from "@/api/templates/queries";
import type { TemplatePurchase } from "@/api/templates/types";
import { downloadTemplateAsZip } from "@/lib/download-zip";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  BorderRadius,
  BRAND_COLOR,
  Spacing,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function PurchasedTemplatesScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textColor = useThemeColor({}, "text");

  const { data, isLoading, refetch, isRefetching } = usePurchasedTemplates();
  const downloadMutation = useDownloadTemplate();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownload = async (purchase: TemplatePurchase) => {
    setDownloadingId(purchase.template.id);
    try {
      const result = await downloadMutation.mutateAsync(purchase.template.id);
      if (!result.download_url) {
        Alert.alert("Download Error", "Download link not available. Please try again.");
        return;
      }
      await downloadTemplateAsZip({
        name: purchase.template.name,
        downloadUrl: result.download_url,
        previewUrl: purchase.template.preview_url,
        fileType: purchase.template.file_type,
      });
    } catch (error) {
      Alert.alert(
        "Download Error",
        error instanceof Error
          ? error.message
          : "Failed to download template.",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const renderPurchase = ({ item }: { item: TemplatePurchase }) => (
    <View style={[styles.item, { backgroundColor: cardBg, borderColor }]}>
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
        <ThemedText style={[styles.itemDate, { color: textSecondary }]}>
          {new Date(item.purchased_at).toLocaleDateString()}
        </ThemedText>
      </View>
      <TouchableOpacity
        style={[styles.downloadButton, { backgroundColor: BRAND_COLOR, opacity: downloadingId === item.template.id ? 0.6 : 1 }]}
        onPress={() => handleDownload(item)}
        disabled={downloadingId === item.template.id}
      >
        {downloadingId === item.template.id ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <IconSymbol name="arrow.down.circle.fill" size={20} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={20} color={textColor} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>My Templates</ThemedText>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={BRAND_COLOR} />
        </View>
      ) : (
        <FlatList
          data={data?.purchases ?? []}
          renderItem={renderPurchase}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <IconSymbol name="tray" size={48} color={textSecondary} />
              <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
                No purchased templates yet
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  item: {
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
  itemDate: {
    fontSize: 12,
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
