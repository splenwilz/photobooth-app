/**
 * Analytics Skeleton
 *
 * Loading placeholder for the Analytics screen.
 * Matches the layout of the actual analytics content.
 */

import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import {
  Skeleton,
  SkeletonChart,
  SkeletonListItem,
  SkeletonStatCard,
} from "@/components/ui/skeleton";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

export const AnalyticsSkeleton: React.FC = () => {
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Period Selector */}
      <View style={styles.section}>
        <View style={styles.periodSelector}>
          {["Today", "Week", "Month", "Year"].map((_, i) => (
            <Skeleton
              key={i}
              width={70}
              height={32}
              borderRadius={BorderRadius.md}
            />
          ))}
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.section}>
        <View style={styles.statsRow}>
          <SkeletonStatCard />
          <SkeletonStatCard />
        </View>
        <View style={[styles.statsRow, { marginTop: Spacing.sm }]}>
          <SkeletonStatCard />
          <SkeletonStatCard />
        </View>
      </View>

      {/* Revenue Chart */}
      <View style={styles.section}>
        <Skeleton width={160} height={20} style={{ marginBottom: Spacing.md }} />
        <SkeletonChart height={220} />
      </View>

      {/* Breakdown Cards */}
      <View style={styles.section}>
        <Skeleton width={140} height={20} style={{ marginBottom: Spacing.md }} />
        <View style={[styles.breakdownCard, { backgroundColor: cardBg, borderColor }]}>
          <Skeleton width={100} height={16} style={{ marginBottom: Spacing.md }} />
          <View style={styles.breakdownItems}>
            <View style={styles.breakdownItem}>
              <Skeleton width={80} height={12} />
              <Skeleton width={40} height={12} />
            </View>
            <View style={styles.breakdownItem}>
              <Skeleton width={80} height={12} />
              <Skeleton width={40} height={12} />
            </View>
            <View style={styles.breakdownItem}>
              <Skeleton width={80} height={12} />
              <Skeleton width={40} height={12} />
            </View>
          </View>
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Skeleton width={160} height={20} />
          <Skeleton width={60} height={16} />
        </View>
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
      </View>

      {/* Bottom spacing */}
      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  periodSelector: {
    flexDirection: "row",
    gap: Spacing.xs,
    justifyContent: "center",
  },
  breakdownCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  breakdownItems: {
    gap: Spacing.sm,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

