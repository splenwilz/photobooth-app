/**
 * CustomHeader Component
 * 
 * Provides consistent header styling across all screens.
 * Supports back button, search, notifications, and custom actions.
 * 
 * Used in: All screens
 * 
 * @see https://reactnative.dev/docs/view - React Native View docs
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, BorderRadius } from '@/constants/theme';

type CustomHeaderProps = {
  /** Screen title */
  title: string;
  /** Callback for search button */
  onSearchPress?: () => void;
  /** Callback for notification button */
  onNotificationPress?: () => void;
  /** Number of unread notifications */
  notificationCount?: number;
  /** Custom right-side action */
  rightAction?: React.ReactNode;
} & (
  | { showBackButton?: false; onBackPress?: never }
  | { showBackButton: true; onBackPress: () => void }
);

export const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  onSearchPress,
  onNotificationPress,
  notificationCount = 0,
  showBackButton = false,
  onBackPress,
  rightAction,
}) => {
  const backgroundColor = useThemeColor({}, 'background');
  const iconColor = useThemeColor({}, 'icon');
  const tint = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');

  return (
    <View style={[styles.header, { backgroundColor, borderBottomColor: borderColor }]}>
      {/* Left side - Back button or Title */}
      <View style={styles.leftSection}>
        {showBackButton ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <IconSymbol
              name="chevron.right"
              size={24}
              color={iconColor}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
            <ThemedText type="title" style={styles.title}>
              {title}
            </ThemedText>
          </TouchableOpacity>
        ) : (
          <ThemedText type="title" style={styles.title}>
            {title}
          </ThemedText>
        )}
      </View>

      {/* Right side - Icons or Custom Action */}
      <View style={styles.rightSection}>
        {rightAction ? (
          rightAction
        ) : (
          <>
            {/* Search Icon */}
            {onSearchPress && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onSearchPress}
                accessibilityRole="button"
                accessibilityLabel="Search"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <IconSymbol name="magnifyingglass" size={22} color={iconColor} />
              </TouchableOpacity>
            )}

            {/* Notification Icon with Badge */}
            {onNotificationPress && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onNotificationPress}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <View style={styles.notificationContainer}>
                  <IconSymbol name="bell" size={22} color={iconColor} />
                  {notificationCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: tint }]}>
                      <Text style={styles.badgeText}>
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  leftSection: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

