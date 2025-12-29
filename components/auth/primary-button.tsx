/**
 * PrimaryButton Component
 * 
 * Main CTA button for authentication forms.
 * Uses brand color with loading state support.
 * 
 * @see https://reactnative.dev/docs/touchableopacity - React Native TouchableOpacity docs
 */

import React from 'react';
import { 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing, BorderRadius, BRAND_COLOR, withAlpha } from '@/constants/theme';

interface PrimaryButtonProps {
  /** Button text */
  text: string;
  /** Press handler */
  onPress: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Variant */
  variant?: 'primary' | 'secondary';
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  text,
  onPress,
  isLoading = false,
  disabled = false,
  variant = 'primary',
}) => {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { 
          backgroundColor: isPrimary 
            ? (isDisabled ? withAlpha(BRAND_COLOR, 0.5) : BRAND_COLOR)
            : 'transparent',
          borderWidth: isPrimary ? 0 : 1,
          borderColor: isPrimary ? 'transparent' : BRAND_COLOR,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isDisabled}
    >
      {isLoading ? (
        <ActivityIndicator color={isPrimary ? 'white' : BRAND_COLOR} />
      ) : (
        <ThemedText 
          style={[
            styles.buttonText, 
            { color: isPrimary ? 'white' : BRAND_COLOR }
          ]}
        >
          {text}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

