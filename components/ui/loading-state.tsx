/**
 * LoadingState Component
 * 
 * Displays a loading indicator with optional message.
 * 
 * Used in: All screens during data loading
 * 
 * @see https://reactnative.dev/docs/activityindicator - React Native ActivityIndicator docs
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing } from '@/constants/theme';

interface LoadingStateProps {
  /** Loading message */
  message?: string;
  /** Size of the indicator */
  size?: 'small' | 'large';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'large',
}) => {
  const tint = useThemeColor({}, 'tint');
  const textSecondary = useThemeColor({}, 'textSecondary');

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={tint} />
      {message && (
        <ThemedText style={[styles.message, { color: textSecondary }]}>
          {message}
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  message: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
});

