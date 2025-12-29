/**
 * SectionHeader Component
 * 
 * Reusable header for content sections with optional "View All" action.
 * Provides consistent typography and spacing for sections.
 * 
 * Used in: All screens with content sections
 * 
 * @see https://reactnative.dev/docs/text - React Native Text docs
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing } from '@/constants/theme';

interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Whether to show "View All" link */
  showViewAll?: boolean;
  /** Callback when "View All" is pressed */
  onViewAllPress?: () => void;
  /** Custom view all text */
  viewAllText?: string;
  /** Right-side action component */
  rightAction?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  showViewAll = false,
  onViewAllPress,
  viewAllText = 'View All',
  rightAction,
}) => {
  const textSecondary = useThemeColor({}, 'textSecondary');
  const tint = useThemeColor({}, 'tint');

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <View style={styles.textContainer}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              {subtitle}
            </ThemedText>
          )}
        </View>
        
        {/* Right side action */}
        {rightAction ? (
          rightAction
        ) : showViewAll && onViewAllPress ? (
          <TouchableOpacity 
            onPress={onViewAllPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ThemedText style={[styles.viewAllText, { color: tint }]}>
              {viewAllText}
            </ThemedText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

