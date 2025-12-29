/**
 * StatusCard Component
 * 
 * Displays hardware component status with visual indicators.
 * Combines colored status dots with progress bars for supply levels.
 * 
 * Used in: Dashboard, Hardware Diagnostics screens
 * 
 * @see https://reactnative.dev/docs/view - React Native View docs
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { StatusColors, BorderRadius, Spacing, withAlpha } from '@/constants/theme';
import type { ComponentStatus } from '@/types/photobooth';

interface StatusCardProps {
  /** Card title (e.g., "Camera", "Printer") */
  title: string;
  /** Current status */
  status: ComponentStatus;
  /** Model or type description */
  subtitle?: string;
  /** Optional progress value (0-100) for supply levels */
  progress?: number;
  /** Label for progress bar */
  progressLabel?: string;
  /** Secondary progress value (e.g., ink level) */
  secondaryProgress?: number;
  /** Label for secondary progress */
  secondaryProgressLabel?: string;
  /** Additional info text */
  infoText?: string;
  /** Icon component to display */
  icon?: React.ReactNode;
  /** Callback when card is pressed */
  onPress?: () => void;
}

/**
 * Maps component status to display color
 * Uses traffic light colors for quick visual recognition
 */
const getStatusColor = (status: ComponentStatus): string => {
  switch (status) {
    case 'healthy':
      return StatusColors.success;
    case 'warning':
      return StatusColors.warning;
    case 'error':
      return StatusColors.error;
    default:
      return StatusColors.neutral;
  }
};

/**
 * Maps status to human-readable label
 */
const getStatusLabel = (status: ComponentStatus): string => {
  switch (status) {
    case 'healthy':
      return 'Healthy';
    case 'warning':
      return 'Warning';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
};

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  status,
  subtitle,
  progress,
  progressLabel,
  secondaryProgress,
  secondaryProgressLabel,
  infoText,
  icon,
  onPress,
}) => {
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const statusColor = getStatusColor(status);

  const CardWrapper = onPress ? TouchableOpacity : View;
  const cardProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  return (
    <CardWrapper
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor },
      ]}
      {...cardProps}
    >
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <View style={styles.titleContainer}>
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {title}
            </ThemedText>
            {subtitle && (
              <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
                {subtitle}
              </ThemedText>
            )}
          </View>
        </View>
        
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.15) }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <ThemedText style={[styles.statusText, { color: statusColor }]}>
            {getStatusLabel(status)}
          </ThemedText>
        </View>
      </View>

      {/* Progress Bars (for supply levels) */}
      {progress !== undefined && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <ThemedText style={[styles.progressLabel, { color: textSecondary }]}>
              {progressLabel || 'Level'}
            </ThemedText>
            <ThemedText style={styles.progressValue}>{progress}%</ThemedText>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: withAlpha(statusColor, 0.2) }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                  backgroundColor: progress < 25 ? StatusColors.error : 
                                   progress < 50 ? StatusColors.warning : 
                                   StatusColors.success,
                }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Secondary Progress Bar */}
      {secondaryProgress !== undefined && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <ThemedText style={[styles.progressLabel, { color: textSecondary }]}>
              {secondaryProgressLabel || 'Level'}
            </ThemedText>
            <ThemedText style={styles.progressValue}>{secondaryProgress}%</ThemedText>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: withAlpha(statusColor, 0.2) }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(100, Math.max(0, secondaryProgress))}%`,
                  backgroundColor: secondaryProgress < 25 ? StatusColors.error : 
                                   secondaryProgress < 50 ? StatusColors.warning : 
                                   StatusColors.success,
                }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Info Text */}
      {infoText && (
        <ThemedText style={[styles.infoText, { color: textSecondary }]}>
          {infoText}
        </ThemedText>
      )}
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressSection: {
    marginTop: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  infoText: {
    fontSize: 12,
    marginTop: Spacing.sm,
  },
});

