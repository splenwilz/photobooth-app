/**
 * Skeleton Loading Component
 *
 * Provides skeleton placeholders with shimmer animation for loading states.
 * Creates a polished loading experience by showing content shape before data loads.
 *
 * @see https://uxdesign.cc/what-you-should-know-about-skeleton-screens-a820c45a571a
 */

import { useEffect, useMemo, useRef } from "react";
import type { ViewStyle } from "react-native";
import { Animated, StyleSheet, View } from "react-native";

import { BorderRadius, Spacing, withAlpha } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface SkeletonProps {
  /** Width of the skeleton (number or percentage string like "100%" or "60%") */
  width?: number | `${number}%`;
  /** Height of the skeleton */
  height?: number;
  /** Border radius (defaults to sm) */
  borderRadius?: number;
  /** Whether to show as a circle */
  circle?: boolean;
  /** Additional styles */
  style?: ViewStyle;
}

/**
 * Base skeleton element with shimmer animation
 *
 * Usage:
 * ```tsx
 * <Skeleton width={200} height={20} />
 * <Skeleton width="100%" height={40} borderRadius={8} />
 * <Skeleton circle width={48} height={48} />
 * ```
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 16,
  borderRadius = BorderRadius.sm,
  circle = false,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const borderColor = useThemeColor({}, "border");

  // Calculate actual border radius
  const actualBorderRadius = circle ? (typeof height === "number" ? height / 2 : 24) : borderRadius;

  // Shimmer animation loop
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  // Interpolate opacity for shimmer effect
  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: actualBorderRadius,
          backgroundColor: withAlpha(borderColor, 0.5),
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Skeleton text line - simulates a line of text
 */
export const SkeletonText: React.FC<{
  width?: number | `${number}%`;
  lines?: number;
  style?: ViewStyle;
}> = ({ width = "100%", lines = 1, style }) => {
  // Memoize line configs to avoid regenerating on each render
  const lineConfigs = useMemo(
    () =>
      Array.from({ length: lines }, (_, i) => ({
        id: `line-${i}-${Math.random().toString(36).substr(2, 9)}`,
        isLast: i === lines - 1 && lines > 1,
        hasMargin: i > 0,
      })),
    [lines]
  );

  return (
    <View style={[styles.textContainer, style]}>
      {lineConfigs.map((config) => (
        <Skeleton
          key={config.id}
          width={config.isLast ? "60%" : width}
          height={14}
          style={config.hasMargin ? { marginTop: Spacing.sm } : undefined}
        />
      ))}
    </View>
  );
};

/**
 * Skeleton card - simulates a card component
 */
export const SkeletonCard: React.FC<{
  height?: number;
  style?: ViewStyle;
}> = ({ height = 120, style }) => {
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor, height },
        style,
      ]}
    >
      <View style={styles.cardContent}>
        <Skeleton width={120} height={16} />
        <Skeleton width="80%" height={12} style={{ marginTop: Spacing.sm }} />
        <Skeleton width="60%" height={12} style={{ marginTop: Spacing.xs }} />
      </View>
    </View>
  );
};

/**
 * Skeleton stat card - simulates a StatCard component
 */
export const SkeletonStatCard: React.FC<{
  style?: ViewStyle;
}> = ({ style }) => {
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");

  return (
    <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }, style]}>
      <Skeleton width={80} height={12} />
      <Skeleton width={60} height={28} style={{ marginTop: Spacing.sm }} />
      <Skeleton width={50} height={10} style={{ marginTop: Spacing.xs }} />
    </View>
  );
};

/**
 * Skeleton status card - simulates a StatusCard component
 */
export const SkeletonStatusCard: React.FC<{
  style?: ViewStyle;
}> = ({ style }) => {
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");

  return (
    <View style={[styles.statusCard, { backgroundColor: cardBg, borderColor }, style]}>
      <View style={styles.statusCardHeader}>
        <Skeleton circle width={40} height={40} />
        <View style={styles.statusCardText}>
          <Skeleton width={100} height={14} />
          <Skeleton width={60} height={10} style={{ marginTop: Spacing.xs }} />
        </View>
      </View>
      <View style={styles.statusCardFooter}>
        <Skeleton width={80} height={10} />
        <Skeleton width={40} height={10} />
      </View>
    </View>
  );
};

/**
 * Skeleton list item - simulates a settings/list item
 */
export const SkeletonListItem: React.FC<{
  style?: ViewStyle;
}> = ({ style }) => {
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");

  return (
    <View style={[styles.listItem, { backgroundColor: cardBg, borderColor }, style]}>
      <Skeleton circle width={40} height={40} />
      <View style={styles.listItemContent}>
        <Skeleton width={140} height={14} />
        <Skeleton width={100} height={10} style={{ marginTop: Spacing.xs }} />
      </View>
      <Skeleton width={16} height={16} />
    </View>
  );
};

/**
 * Skeleton chart - simulates a bar chart
 */
// Pre-defined bar configs for SkeletonChart - stable keys, no index dependency
const CHART_BARS = [
  { id: "bar-a", height: 60 },
  { id: "bar-b", height: 80 },
  { id: "bar-c", height: 40 },
  { id: "bar-d", height: 90 },
  { id: "bar-e", height: 50 },
  { id: "bar-f", height: 70 },
  { id: "bar-g", height: 30 },
];

export const SkeletonChart: React.FC<{
  height?: number;
  style?: ViewStyle;
}> = ({ height = 200, style }) => {
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");

  return (
    <View style={[styles.chart, { backgroundColor: cardBg, borderColor, height }, style]}>
      <View style={styles.chartHeader}>
        <Skeleton width={120} height={16} />
        <Skeleton width={80} height={24} />
      </View>
      <View style={styles.chartBars}>
        {CHART_BARS.map((bar) => (
          <Skeleton
            key={bar.id}
            width={24}
            height={bar.height}
            borderRadius={BorderRadius.sm}
          />
        ))}
      </View>
    </View>
  );
};

/**
 * Skeleton alert card - simulates an AlertCard component
 */
export const SkeletonAlertCard: React.FC<{
  style?: ViewStyle;
}> = ({ style }) => {
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");

  return (
    <View style={[styles.alertCard, { backgroundColor: cardBg, borderColor }, style]}>
      <View style={styles.alertCardHeader}>
        <Skeleton circle width={36} height={36} />
        <View style={styles.alertCardText}>
          <Skeleton width={120} height={14} />
          <Skeleton width={180} height={10} style={{ marginTop: Spacing.xs }} />
        </View>
      </View>
      <Skeleton width={60} height={10} style={{ marginTop: Spacing.sm }} />
    </View>
  );
};

/**
 * Skeleton booth card - simulates a BoothCard component
 */
export const SkeletonBoothCard: React.FC<{
  style?: ViewStyle;
}> = ({ style }) => {
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");

  return (
    <View style={[styles.boothCard, { backgroundColor: cardBg, borderColor }, style]}>
      <View style={styles.boothCardHeader}>
        <View style={styles.boothCardInfo}>
          <Skeleton width={140} height={16} />
          <Skeleton width={100} height={12} style={{ marginTop: Spacing.xs }} />
        </View>
        <Skeleton width={60} height={24} borderRadius={BorderRadius.sm} />
      </View>
      <View style={styles.boothCardStats}>
        <View style={styles.boothCardStat}>
          <Skeleton width={60} height={10} />
          <Skeleton width={40} height={16} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.boothCardStat}>
          <Skeleton width={60} height={10} />
          <Skeleton width={40} height={16} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.boothCardStat}>
          <Skeleton width={60} height={10} />
          <Skeleton width={40} height={16} style={{ marginTop: 4 }} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  textContainer: {
    gap: Spacing.xs,
  },
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  cardContent: {
    flex: 1,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statusCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  statusCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusCardText: {
    flex: 1,
  },
  statusCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  listItemContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  chart: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  chartBars: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    flex: 1,
    paddingTop: Spacing.md,
  },
  alertCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  alertCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  alertCardText: {
    flex: 1,
  },
  boothCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  boothCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  boothCardInfo: {
    flex: 1,
  },
  boothCardStats: {
    flexDirection: "row",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  boothCardStat: {
    flex: 1,
  },
});

