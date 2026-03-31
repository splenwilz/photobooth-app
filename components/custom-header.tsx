/**
 * CustomHeader Component
 *
 * Provides consistent header styling across all screens.
 * Supports back button, search, notifications, custom actions,
 * and an optional booth context mode that shows the current booth
 * as a tappable title (Shopify/Toast/Notion pattern).
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
import { Spacing, BorderRadius, BRAND_COLOR, StatusColors, withAlpha } from '@/constants/theme';
import { ALL_BOOTHS_ID, useBoothStore } from '@/stores/booth-store';
import { useBoothDetail, useBoothOverview, useDashboardOverview } from '@/api/booths/queries';

type CustomHeaderProps = {
  /** Screen title (also used as fallback when booth context data is loading) */
  title: string;
  /** Callback for search button */
  onSearchPress?: () => void;
  /** Callback for notification button */
  onNotificationPress?: () => void;
  /** Number of unread notifications */
  notificationCount?: number;
  /** Custom right-side action */
  rightAction?: React.ReactNode;
  /** Enable booth context mode — title area shows current booth with picker trigger */
  boothContext?: boolean;
  /** Callback when booth selector is pressed (opens picker modal) */
  onBoothPress?: () => void;
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
  boothContext = false,
  onBoothPress,
}) => {
  const backgroundColor = useThemeColor({}, 'background');
  const iconColor = useThemeColor({}, 'icon');
  const tint = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  // Booth context data — only read from store/hooks when boothContext is enabled
  const { selectedBoothId } = useBoothStore();
  const isAllMode = !boothContext || selectedBoothId === ALL_BOOTHS_ID || !selectedBoothId;

  const { data: dashboardOverview } = useDashboardOverview({
    enabled: boothContext && isAllMode,
  });
  const { data: boothDetail } = useBoothDetail(
    boothContext && !isAllMode ? selectedBoothId : null,
  );
  // Booth overview is already cached by the picker — use it for instant name/address lookup
  // Only fetch when boothContext is enabled to avoid unnecessary API calls on non-context screens
  const { data: boothOverview } = useBoothOverview({
    enabled: boothContext && !isAllMode,
  });

  // Look up booth from the cached overview list (available instantly after picker use)
  const overviewBooth = !isAllMode && boothOverview?.booths
    ? boothOverview.booths.find((b) => b.booth_id === selectedBoothId)
    : undefined;

  // Derive booth display info — prefer boothDetail, fall back to overview cache (no loading flash)
  const boothName = isAllMode
    ? 'All Booths'
    : (boothDetail?.booth_name ?? overviewBooth?.booth_name ?? title);
  const boothSubtitle = isAllMode
    ? `${dashboardOverview?.summary?.online_count ?? 0} online · ${dashboardOverview?.summary?.offline_count ?? 0} offline`
    : (boothDetail?.booth_address ?? overviewBooth?.booth_address ?? '');
  const boothStatus = !isAllMode
    ? (boothDetail?.booth_status ?? overviewBooth?.booth_status)
    : undefined;
  const statusColor = boothStatus === 'online'
    ? StatusColors.success
    : boothStatus === 'warning'
      ? StatusColors.warning
      : boothStatus === 'offline'
        ? StatusColors.error
        : undefined;

  /** Renders the booth-context-aware title area */
  const renderBoothTitle = () => (
    <TouchableOpacity
      style={styles.boothTitleButton}
      onPress={onBoothPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Current booth: ${boothName}. Tap to switch.`}
      testID="booth-context-selector"
    >
      <View style={styles.boothTitleContent}>
        <View style={styles.boothTitleRow}>
          <ThemedText type="title" style={styles.title} numberOfLines={1}>
            {boothName}
          </ThemedText>
          {boothStatus && (
            <View
              style={[styles.boothStatusDot, { backgroundColor: statusColor }]}
            />
          )}
          <IconSymbol name="chevron.down" size={14} color={textSecondary} />
        </View>
        {boothSubtitle ? (
          <ThemedText
            style={[styles.boothSubtitle, { color: textSecondary }]}
            numberOfLines={1}
          >
            {boothSubtitle}
          </ThemedText>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.header, { backgroundColor, borderBottomColor: borderColor }]}>
      {/* Left side - Back button, Booth context, or static Title */}
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
        ) : boothContext ? (
          renderBoothTitle()
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
  boothTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boothTitleContent: {
    flexShrink: 1,
  },
  boothTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  boothStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  boothSubtitle: {
    fontSize: 12,
    marginTop: 1,
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

