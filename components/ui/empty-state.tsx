/**
 * EmptyState Component
 * 
 * Displays a message when there's no data to show.
 * Provides optional action button.
 * 
 * Used in: All screens with empty states
 * 
 * @see https://reactnative.dev/docs/view - React Native View docs
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing, withAlpha } from '@/constants/theme';

interface EmptyStateProps {
  /** Emoji or icon to display */
  emoji: string;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional button text */
  buttonText?: string;
  /** Callback for button press */
  onButtonPress?: () => void;
  /** Route to navigate to on button press */
  buttonRoute?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  emoji,
  title,
  description,
  buttonText,
  onButtonPress,
  buttonRoute,
}) => {
  const tint = useThemeColor({}, 'tint');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const handlePress = () => {
    if (onButtonPress) {
      onButtonPress();
    } else if (buttonRoute) {
      router.push(buttonRoute as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.emojiContainer, { backgroundColor: withAlpha(tint, 0.1) }]}>
        <ThemedText style={styles.emoji}>{emoji}</ThemedText>
      </View>
      
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      
      <ThemedText style={[styles.description, { color: textSecondary }]}>
        {description}
      </ThemedText>
      
      {buttonText && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: tint }]}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.buttonText}>{buttonText}</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emojiContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
    maxWidth: 280,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

