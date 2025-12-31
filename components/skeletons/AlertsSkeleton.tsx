/**
 * Alerts Skeleton
 *
 * Loading placeholder for the Alerts screen.
 * Matches the layout of the actual alerts content.
 * Renders without ScrollView to avoid nested scroll conflicts.
 */

import React from "react";
import { StyleSheet, View } from "react-native";

import {
  Skeleton,
  SkeletonAlertCard,
} from "@/components/ui/skeleton";
import { BorderRadius, Spacing } from "@/constants/theme";

export const AlertsSkeleton: React.FC = () => {
  return (
    <View style={styles.content}>
      {/* Filter Chips */}
      <View style={styles.section}>
        <View style={styles.filterRow}>
          <Skeleton width={60} height={32} borderRadius={BorderRadius.md} />
          <Skeleton width={80} height={32} borderRadius={BorderRadius.md} />
          <Skeleton width={70} height={32} borderRadius={BorderRadius.md} />
          <Skeleton width={50} height={32} borderRadius={BorderRadius.md} />
        </View>
      </View>

      {/* Alert Summary */}
      <View style={styles.section}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Skeleton circle width={32} height={32} />
            <Skeleton width={20} height={16} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.summaryItem}>
            <Skeleton circle width={32} height={32} />
            <Skeleton width={20} height={16} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.summaryItem}>
            <Skeleton circle width={32} height={32} />
            <Skeleton width={20} height={16} style={{ marginTop: 4 }} />
          </View>
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Skeleton width={100} height={18} />
          <Skeleton width={60} height={14} />
        </View>
      </View>

      {/* Alert Cards */}
      <SkeletonAlertCard />
      <SkeletonAlertCard />
      <SkeletonAlertCard />
      <SkeletonAlertCard />
      <SkeletonAlertCard />

      {/* Bottom spacing */}
      <View style={{ height: Spacing.xxl }} />
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
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
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
});
