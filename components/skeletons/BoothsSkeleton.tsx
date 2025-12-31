/**
 * Booths Skeleton
 *
 * Loading placeholder for the Booths list screen.
 * Matches the layout of the actual booths content.
 * Renders without ScrollView to avoid nested scroll conflicts.
 */

import React from "react";
import { StyleSheet, View } from "react-native";

import {
  Skeleton,
  SkeletonBoothCard,
  SkeletonStatCard,
} from "@/components/ui/skeleton";
import { Spacing } from "@/constants/theme";

export const BoothsSkeleton: React.FC = () => {
  return (
    <View style={styles.content}>
      {/* Summary Stats */}
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

      {/* Booth List Header */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Skeleton width={100} height={20} />
          <Skeleton width={40} height={20} />
        </View>
      </View>

      {/* All Booths Card */}
      <SkeletonBoothCard />

      {/* Individual Booth Cards */}
      <SkeletonBoothCard />
      <SkeletonBoothCard />
      <SkeletonBoothCard />

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
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
});
