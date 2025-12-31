/**
 * Dashboard Skeleton
 *
 * Loading placeholder for the Dashboard screen.
 * Matches the layout of the actual dashboard content.
 */

import React from "react";
import { StyleSheet, View } from "react-native";

import {
  Skeleton,
  SkeletonChart,
  SkeletonStatCard,
  SkeletonStatusCard,
} from "@/components/ui/skeleton";
import { Spacing } from "@/constants/theme";

interface DashboardSkeletonProps {
  /** Whether in "All Booths" mode (shows different layout) */
  isAllBoothsMode?: boolean;
}

/**
 * Dashboard Skeleton - renders without ScrollView to avoid nested scroll conflicts
 * Parent screen provides the ScrollView wrapper
 */
export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  isAllBoothsMode = false,
}) => {
  return (
    <View style={styles.content}>
      {/* Booth Status Header (single booth mode only) */}
      {!isAllBoothsMode && (
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Skeleton width={100} height={20} />
            <Skeleton width={60} height={16} />
          </View>
          <View style={styles.statusHeader}>
            <Skeleton circle width={48} height={48} />
            <View style={styles.statusHeaderText}>
              <Skeleton width={150} height={18} />
              <Skeleton width={100} height={12} style={{ marginTop: Spacing.xs }} />
            </View>
            <Skeleton width={70} height={28} borderRadius={14} />
          </View>
        </View>
      )}

      {/* Fleet Overview (all booths mode) */}
      {isAllBoothsMode && (
        <View style={styles.section}>
          <Skeleton width={120} height={20} style={{ marginBottom: Spacing.md }} />
          <View style={styles.statsRow}>
            <SkeletonStatCard />
            <SkeletonStatCard />
          </View>
          <View style={[styles.statsRow, { marginTop: Spacing.sm }]}>
            <SkeletonStatCard />
            <SkeletonStatCard />
          </View>
        </View>
      )}

      {/* Revenue Overview Section */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Skeleton width={140} height={20} />
          <Skeleton width={80} height={28} borderRadius={8} />
        </View>
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

      {/* Hardware Status (single booth mode) */}
      {!isAllBoothsMode && (
        <View style={styles.section}>
          <Skeleton width={140} height={20} style={{ marginBottom: Spacing.md }} />
          <SkeletonStatusCard />
          <SkeletonStatusCard />
          <SkeletonStatusCard />
        </View>
      )}

      {/* Hardware Summary (all booths mode) */}
      {isAllBoothsMode && (
        <View style={styles.section}>
          <Skeleton width={160} height={20} style={{ marginBottom: Spacing.md }} />
          <View style={styles.statsRow}>
            <SkeletonStatCard />
            <SkeletonStatCard />
          </View>
        </View>
      )}

      {/* Recent Alerts */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Skeleton width={120} height={20} />
          <Skeleton width={60} height={16} />
        </View>
        <SkeletonStatusCard />
        <SkeletonStatusCard />
      </View>

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
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  statusHeaderText: {
    flex: 1,
  },
});

