/**
 * StatCard Component
 * 
 * Displays a single metric with value, label, and optional trend indicator.
 * Uses brand color consistently - no random accent colors.
 * 
 * Used in: Dashboard, Analytics screens
 * 
 * @see https://reactnative.dev/docs/view - React Native View docs
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { StatusColors, BorderRadius, Spacing, BRAND_COLOR, withAlpha } from '@/constants/theme';

interface StatCardProps {
  /** Label for the metric */
  label: string;
  /** Primary value to display */
  value: string;
  /** Percentage change (positive or negative) */
  change?: number;
  /** Sub-label or secondary info */
  subValue?: string;
  /** Callback when card is pressed */
  onPress?: () => void;
  /** Whether this card is selected/active */
  isActive?: boolean;
}

/**
 * Formats change value with appropriate sign and color
 * Uses status colors for directional indicators
 */
const formatChange = (change: number): { text: string; color: string } => {
  if (change > 0) {
    return { text: `↑ ${change.toFixed(1)}%`, color: StatusColors.success };
  } else if (change < 0) {
    return { text: `↓ ${Math.abs(change).toFixed(1)}%`, color: StatusColors.error };
  }
  return { text: '→ 0%', color: '#8B949E' }; // Neutral gray
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  subValue,
  onPress,
  isActive = false,
}) => {
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const tint = useThemeColor({}, 'tint');

  const CardWrapper = onPress ? TouchableOpacity : View;
  const cardProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  const changeInfo = change !== undefined ? formatChange(change) : null;

  return (
    <CardWrapper
      style={[
        styles.card,
        { 
          backgroundColor: cardBg, 
          borderColor: isActive ? tint : borderColor,
          borderWidth: isActive ? 2 : 1,
        },
      ]}
      {...cardProps}
    >
      {/* Accent bar at top - always brand color */}
      <View style={[styles.accentBar, { backgroundColor: BRAND_COLOR }]} />
      
      <View style={styles.content}>
        {/* Label */}
        <ThemedText style={[styles.label, { color: textSecondary }]}>
          {label}
        </ThemedText>
        
        {/* Value */}
        <ThemedText type="title" style={styles.value}>
          {value}
        </ThemedText>
        
        {/* Change indicator and sub-value row */}
        <View style={styles.footer}>
          {changeInfo && (
            <View style={[styles.changeBadge, { backgroundColor: withAlpha(changeInfo.color, 0.15) }]}>
              <ThemedText style={[styles.changeText, { color: changeInfo.color }]}>
                {changeInfo.text}
              </ThemedText>
            </View>
          )}
          {subValue && (
            <ThemedText style={[styles.subValue, { color: textSecondary }]}>
              {subValue}
            </ThemedText>
          )}
        </View>
      </View>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    flex: 1,
    minWidth: 140,
  },
  accentBar: {
    height: 4,
  },
  content: {
    padding: Spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
    marginBottom: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  changeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subValue: {
    fontSize: 11,
  },
});
