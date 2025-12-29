/**
 * SocialButton Component
 * 
 * Social login buttons (Google, Apple) with consistent styling.
 * 
 * @see https://reactnative.dev/docs/touchableopacity - React Native TouchableOpacity docs
 */

import React from 'react';
import { 
  TouchableOpacity, 
  StyleSheet, 
  View,
  Image,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing, BorderRadius } from '@/constants/theme';

type SocialProvider = 'google' | 'apple';

interface SocialButtonProps {
  /** Social provider */
  provider: SocialProvider;
  /** Button text */
  text: string;
  /** Press handler */
  onPress: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state (prevents interaction during other operations) */
  disabled?: boolean;
}

/**
 * Social provider configurations
 */
const providerConfig: Record<SocialProvider, { 
  iconLight: string; 
  iconDark: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
}> = {
  google: {
    // Google uses a simple "G" icon, we'll use text for simplicity
    iconLight: 'G',
    iconDark: 'G',
    bgLight: '#FFFFFF',
    bgDark: '#1F2937',
    textLight: '#374151',
    textDark: '#FFFFFF',
  },
  apple: {
    // Apple uses the Apple logo
    iconLight: '',
    iconDark: '',
    bgLight: '#000000',
    bgDark: '#FFFFFF',
    textLight: '#FFFFFF',
    textDark: '#000000',
  },
};

export const SocialButton: React.FC<SocialButtonProps> = ({
  provider,
  text,
  onPress,
  isLoading = false,
  disabled = false,
}) => {
  const borderColor = useThemeColor({}, 'border');
  const isDark = useThemeColor({}, 'background') === '#0D1117';
  
  const config = providerConfig[provider];
  const bgColor = isDark ? config.bgDark : config.bgLight;
  const txtColor = isDark ? config.textDark : config.textLight;

  const isDisabled = isLoading || disabled;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { 
          backgroundColor: bgColor,
          borderColor: provider === 'google' ? borderColor : 'transparent',
          borderWidth: provider === 'google' ? 1 : 0,
          opacity: isDisabled ? 0.6 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isDisabled}
    >
      {/* Icon */}
      <View style={styles.iconContainer}>
        {provider === 'google' && (
          <View style={styles.googleIcon}>
            <ThemedText style={[styles.googleIconText]}>G</ThemedText>
          </View>
        )}
        {provider === 'apple' && (
          <ThemedText style={[styles.appleIcon, { color: txtColor }]}>
            
          </ThemedText>
        )}
      </View>

      {/* Text */}
      <ThemedText style={[styles.buttonText, { color: txtColor }]}>
        {text}
      </ThemedText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  appleIcon: {
    fontSize: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

