/**
 * Forgot Password Screen
 *
 * Password reset request screen where users enter their email.
 * Sends reset code to email via POST /api/v1/auth/forgot-password
 *
 * Flow:
 * 1. User enters email
 * 2. API sends 6-digit OTP code to email
 * 3. Navigates to reset-password screen to enter code + new password
 *
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 * @see /api/auth/forgot-password/queries.ts - useForgotPassword hook
 */

import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { FormInput } from '@/components/auth/form-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing, BRAND_COLOR, withAlpha } from '@/constants/theme';
// API hook for forgot password
import { useForgotPassword } from '@/api/auth/forgot-password/queries';
import { savePendingResetEmail } from '@/api/client';

export default function ForgotPasswordScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textSecondary = useThemeColor({}, 'textSecondary');

  // API mutation hook
  const { mutateAsync: forgotPasswordMutation, isPending } = useForgotPassword();

  // Form state
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  // Validate and submit
  const handleSubmit = async () => {
    // Clear error
    setError('');

    // Validate email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
      return;
    }

    try {
      // Call forgot password API
      // @see POST /api/v1/auth/forgot-password
      const trimmedEmail = email.trim();
      const response = await forgotPasswordMutation({ email: trimmedEmail });
      if (__DEV__) console.log('[ForgotPassword] Success:', response);
      // Save email to secure storage and navigate without PII in params
      await savePendingResetEmail(trimmedEmail);
      router.push('/auth/reset-password');
    } catch (err: unknown) {
      if (__DEV__) console.error('[ForgotPassword] Error:', err);
      // Extract error message from API response
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset code. Please try again.';
      setError(errorMessage);
    }
  };

  // Navigate back to sign in
  const handleBackToSignIn = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleBackToSignIn}>
            <IconSymbol name="chevron.left" size={24} color={textSecondary} />
            <ThemedText style={[styles.backText, { color: textSecondary }]}>
              Back
            </ThemedText>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: withAlpha(BRAND_COLOR, 0.15) }]}>
              <IconSymbol name="key.fill" size={40} color={BRAND_COLOR} />
            </View>
            <ThemedText type="title" style={styles.title}>
              Forgot Password?
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              {"No worries! Enter your email and we'll send you a reset code."}
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label="Email"
              placeholder="john@example.com"
              icon="envelope"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (error) setError('');
              }}
              error={error}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <View style={styles.buttonSection}>
              <PrimaryButton
                text="Send Reset Code"
                onPress={handleSubmit}
                isLoading={isPending}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  backText: {
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  form: {
    marginBottom: Spacing.lg,
  },
  buttonSection: {
    marginTop: Spacing.md,
  },
});
