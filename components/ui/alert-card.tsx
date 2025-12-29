/**
 * AlertCard Component
 * 
 * Displays individual alert/notification with severity indicator.
 * Shows alert type, title, message, and timestamp.
 * 
 * Used in: Alerts screen, Dashboard notifications
 * 
 * @see https://reactnative.dev/docs/view - React Native View docs
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { StatusColors, BorderRadius, Spacing, withAlpha } from '@/constants/theme';
import type { Alert, AlertType, AlertCategory } from '@/types/photobooth';

interface AlertCardProps {
  /** Alert data */
  alert: Alert;
  /** Callback when card is pressed */
  onPress?: () => void;
  /** Callback to mark as read */
  onMarkRead?: () => void;
}

/**
 * Maps alert type to color
 */
const getAlertColor = (type: AlertType): string => {
  switch (type) {
    case 'critical':
      return StatusColors.error;
    case 'warning':
      return StatusColors.warning;
    case 'info':
      return StatusColors.info;
    default:
      return StatusColors.neutral;
  }
};

/**
 * Maps alert category to icon name
 */
const getCategoryIcon = (category: AlertCategory): string => {
  switch (category) {
    case 'hardware':
      return 'gear';
    case 'supplies':
      return 'printer';
    case 'connectivity':
      return 'wifi';
    case 'sales':
      return 'chart.bar';
    default:
      return 'bell';
  }
};

/**
 * Formats timestamp to relative time (e.g., "5 min ago")
 */
const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onPress,
  onMarkRead,
}) => {
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const alertColor = getAlertColor(alert.type);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { 
          backgroundColor: cardBg, 
          borderColor,
          opacity: alert.isRead ? 0.7 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Unread indicator */}
      {!alert.isRead && (
        <View style={[styles.unreadIndicator, { backgroundColor: alertColor }]} />
      )}

      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: withAlpha(alertColor, 0.15) }]}>
        <IconSymbol 
          name={getCategoryIcon(alert.category) as any} 
          size={20} 
          color={alertColor} 
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
            {alert.title}
          </ThemedText>
          <ThemedText style={[styles.time, { color: textSecondary }]}>
            {formatRelativeTime(alert.timestamp)}
          </ThemedText>
        </View>
        
        <ThemedText style={[styles.message, { color: textSecondary }]} numberOfLines={2}>
          {alert.message}
        </ThemedText>
        
        <ThemedText style={[styles.booth, { color: alertColor }]}>
          {alert.boothName}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    flex: 1,
    marginRight: Spacing.sm,
  },
  time: {
    fontSize: 11,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  booth: {
    fontSize: 11,
    fontWeight: '500',
  },
});

