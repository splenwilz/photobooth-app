/**
 * Store Screen
 *
 * Template marketplace with search, filter modal, sorting, and a 2-column grid.
 * Users can browse templates, add to cart, and navigate to detail/cart screens.
 *
 * @see /api/templates/queries.ts - useTemplates hook
 * @see /stores/cart-store.ts - Cart state management
 */

import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTemplates } from "@/api/templates/queries";
import type { Template, TemplateType, TemplatesQueryParams } from "@/api/templates/types";
import { CustomHeader } from "@/components/custom-header";
import { TemplateCard } from "@/components/store/template-card";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  BorderRadius,
  BRAND_COLOR,
  Spacing,
  withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useCartStore } from "@/stores/cart-store";

type FilterTab = "all" | "featured" | "new" | "free";
type SortOption = "popular" | "newest" | "price_low" | "price_high" | "highest_rated";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "highest_rated", label: "Top Rated" },
];

const TYPE_OPTIONS: { value: TemplateType | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "strip", label: "Strips" },
  { value: "photo_4x6", label: "4x6" },
];

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "featured", label: "Featured" },
  { value: "new", label: "New" },
  { value: "free", label: "Free" },
];

const PER_PAGE = 24;

export default function StoreScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textColor = useThemeColor({}, "text");

  // Local state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [templateType, setTemplateType] = useState<TemplateType | undefined>(
    undefined,
  );
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [page, setPage] = useState(1);

  // Debounce search
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(text);
      setPage(1);
    }, 300);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // Build query params
  const queryParams = useMemo((): TemplatesQueryParams => {
    const params: TemplatesQueryParams = {
      page,
      per_page: PER_PAGE,
      sort_by: sortBy,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (templateType) params.template_type = templateType;
    if (filterTab === "featured") params.is_featured = true;
    if (filterTab === "new") params.is_new = true;
    if (filterTab === "free") params.is_free = true;
    return params;
  }, [page, sortBy, debouncedSearch, templateType, filterTab]);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useTemplates(queryParams);

  const cartItemCount = useCartStore((s) => s.getItemCount());

  const handleTemplatePress = useCallback((template: Template) => {
    router.push(`/store/${template.id}`);
  }, []);

  const renderTemplate = useCallback(
    ({ item }: { item: Template }) => (
      <View style={styles.gridItem}>
        <TemplateCard template={item} onPress={handleTemplatePress} />
      </View>
    ),
    [handleTemplatePress],
  );

  const hasActiveFilters =
    templateType !== undefined || filterTab !== "all" || sortBy !== "popular";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
      <CustomHeader
        title="Template Store"
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push("/store/purchased")}
            >
              <IconSymbol name="arrow.down.circle" size={22} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cartHeaderButton}
              onPress={() => router.push("/store/cart")}
            >
              <IconSymbol name="bag" size={22} color={textColor} />
              {cartItemCount > 0 && (
                <View style={styles.cartBadge}>
                  <ThemedText style={styles.cartBadgeText}>
                    {cartItemCount}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        }
      />

      <FlatList
        data={data?.templates ?? []}
        renderItem={renderTemplate}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={BRAND_COLOR}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Search */}
            <View
              style={[
                styles.searchContainer,
                { backgroundColor: cardBg, borderColor },
              ]}
            >
              <IconSymbol name="magnifyingglass" size={18} color={textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Search templates..."
                placeholderTextColor={textSecondary}
                value={search}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch("")}>
                  <IconSymbol name="xmark.circle.fill" size={18} color={textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Results count + active filter hint */}
            {data && (
              <ThemedText style={[styles.resultsCount, { color: textSecondary }]}>
                {data.total} template{data.total !== 1 ? "s" : ""}
                {hasActiveFilters ? " (filtered)" : ""}
              </ThemedText>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={BRAND_COLOR} />
            </View>
          ) : (
            <View style={styles.centerState}>
              <IconSymbol name="photo.stack" size={48} color={textSecondary} />
              <ThemedText
                style={[styles.emptyText, { color: textSecondary }]}
              >
                No templates found
              </ThemedText>
              <TouchableOpacity
                style={[styles.clearButton, { borderColor: BRAND_COLOR }]}
                onPress={() => {
                  handleSearch("");
                  setTemplateType(undefined);
                  setFilterTab("all");
                  setSortBy("popular");
                  setPage(1);
                }}
              >
                <ThemedText style={{ color: BRAND_COLOR, fontSize: 14 }}>
                  Clear filters
                </ThemedText>
              </TouchableOpacity>
            </View>
          )
        }
        ListFooterComponent={
          data && data.total_pages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  { borderColor, opacity: page <= 1 ? 0.4 : 1 },
                ]}
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              >
                <IconSymbol name="chevron.left" size={16} color={textColor} />
                <ThemedText style={styles.pageButtonText}>Prev</ThemedText>
              </TouchableOpacity>

              <ThemedText style={[styles.pageInfo, { color: textSecondary }]}>
                {page} / {data.total_pages}
              </ThemedText>

              <TouchableOpacity
                style={[
                  styles.pageButton,
                  {
                    borderColor,
                    opacity: page >= data.total_pages ? 0.4 : 1,
                  },
                ]}
                disabled={page >= data.total_pages}
                onPress={() => setPage((p) => p + 1)}
              >
                <ThemedText style={styles.pageButtonText}>Next</ThemedText>
                <IconSymbol name="chevron.right" size={16} color={textColor} />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* Filter FAB — bottom left */}
      <TouchableOpacity
        style={[styles.filterFab, hasActiveFilters && styles.filterFabActive]}
        onPress={() => setShowFilterModal(true)}
        activeOpacity={0.8}
      >
        <IconSymbol name="line.3.horizontal.decrease" size={20} color="#FFFFFF" />
        {hasActiveFilters && <View style={styles.filterFabDot} />}
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowFilterModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            {/* Handle bar */}
            <View style={styles.modalHandle}>
              <View style={[styles.handleBar, { backgroundColor: borderColor }]} />
            </View>

            {/* Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Filters</ThemedText>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <IconSymbol name="xmark" size={20} color={textColor} />
              </TouchableOpacity>
            </View>

            {/* Template Type */}
            <View style={styles.filterSection}>
              <ThemedText style={[styles.filterLabel, { color: textSecondary }]}>
                Template Type
              </ThemedText>
              <View style={styles.filterOptions}>
                {TYPE_OPTIONS.map((opt) => {
                  const active = templateType === opt.value;
                  return (
                    <Pressable
                      key={opt.label}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active
                            ? BRAND_COLOR
                            : withAlpha(BRAND_COLOR, 0.1),
                          borderColor: active ? BRAND_COLOR : borderColor,
                        },
                      ]}
                      onPress={() => setTemplateType(opt.value)}
                    >
                      <ThemedText
                        style={[
                          styles.filterChipText,
                          { color: active ? "#FFFFFF" : textColor },
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Category Filter */}
            <View style={styles.filterSection}>
              <ThemedText style={[styles.filterLabel, { color: textSecondary }]}>
                Category
              </ThemedText>
              <View style={styles.filterOptions}>
                {FILTER_TABS.map((tab) => {
                  const active = filterTab === tab.value;
                  return (
                    <Pressable
                      key={tab.value}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active
                            ? BRAND_COLOR
                            : withAlpha(BRAND_COLOR, 0.1),
                          borderColor: active ? BRAND_COLOR : borderColor,
                        },
                      ]}
                      onPress={() => setFilterTab(tab.value)}
                    >
                      <ThemedText
                        style={[
                          styles.filterChipText,
                          { color: active ? "#FFFFFF" : textColor },
                        ]}
                      >
                        {tab.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Sort By */}
            <View style={styles.filterSection}>
              <ThemedText style={[styles.filterLabel, { color: textSecondary }]}>
                Sort By
              </ThemedText>
              <View style={styles.sortList}>
                {SORT_OPTIONS.map((opt) => {
                  const active = sortBy === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.sortRow,
                        {
                          backgroundColor: active
                            ? withAlpha(BRAND_COLOR, 0.1)
                            : "transparent",
                          borderColor,
                        },
                      ]}
                      onPress={() => setSortBy(opt.value)}
                    >
                      <ThemedText
                        style={[
                          styles.sortRowText,
                          active && { color: BRAND_COLOR, fontWeight: "600" },
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                      {active && (
                        <IconSymbol name="checkmark" size={16} color={BRAND_COLOR} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButtonSecondary, { borderColor }]}
                onPress={() => {
                  setTemplateType(undefined);
                  setFilterTab("all");
                  setSortBy("popular");
                  setPage(1);
                }}
              >
                <ThemedText style={[styles.modalButtonText, { color: textColor }]}>
                  Reset
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => {
                  setPage(1);
                  setShowFilterModal(false);
                }}
              >
                <ThemedText style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
                  Apply
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  gridRow: {
    gap: Spacing.sm,
  },
  gridItem: {
    flex: 1,
    maxWidth: "50%",
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },

  // Results
  resultsCount: {
    fontSize: 13,
    marginBottom: Spacing.sm,
  },

  // Empty
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
  clearButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  // Pagination
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  pageButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  pageInfo: {
    fontSize: 14,
  },

  // Header actions
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerIconButton: {
    padding: Spacing.xs,
  },
  cartHeaderButton: {
    position: "relative",
    padding: Spacing.xs,
  },
  cartBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: BRAND_COLOR,
    borderRadius: BorderRadius.full,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },

  // Filter FAB
  filterFab: {
    position: "absolute",
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: BRAND_COLOR,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  filterFabActive: {
    backgroundColor: BRAND_COLOR,
  },
  filterFabDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF3B30",
    borderWidth: 2,
    borderColor: BRAND_COLOR,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: "80%",
  },
  modalHandle: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },

  // Filter sections
  filterSection: {
    marginBottom: Spacing.lg,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Sort list
  sortList: {
    gap: 2,
  },
  sortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
  },
  sortRowText: {
    fontSize: 15,
  },

  // Modal actions
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  modalButtonSecondary: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  modalButtonPrimary: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: BRAND_COLOR,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
