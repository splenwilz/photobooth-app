/**
 * New Password Screen
 *
 * Step 3 (final step) of the password reset flow. User sets a new password
 * using the token received from verify-reset-code.
 *
 * Flow:
 * 1. Reset-password screen verifies code, navigates here with token param
 * 2. User enters new password + confirmation
 * 3. POST /api/v1/auth/reset-password with {token, new_password, confirm_new_password}
 * 4. On success, redirect to sign in
 *
 * @see /api/auth/reset-password/queries.ts - useResetPassword hook
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { FormInput } from '@/components/auth/form-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing, BRAND_COLOR, StatusColors, withAlpha } from '@/constants/theme';
// API hook and schema for reset password
import { useResetPassword } from '@/api/auth/reset-password/queries';
import { passwordSchema } from '@/api/auth/reset-password/types';
import { getPendingResetToken, clearPendingResetToken } from '@/api/client';

export default function NewPasswordScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textSecondary = useThemeColor({}, 'textSecondary');

  // API mutation hook
  const { mutateAsync: resetPasswordMutation, isPending } = useResetPassword();

  // State
  const [resetToken, setResetToken] = useState('');
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string; root?: string }>({});

  // Load token from secure storage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await getPendingResetToken();
        if (storedToken) setResetToken(storedToken);
      } finally {
        setIsLoadingToken(false);
      }
    })();
  }, []);

  // Validate and submit
  const handleSubmit = async () => {
    setErrors({});

    if (!resetToken) {
      setErrors({ root: 'Reset token missing. Please start the password reset process again.' });
      return;
    }

    const newErrors: typeof errors = {};

    if (!newPassword) {
      newErrors.newPassword = 'Password is required';
    } else {
      const result = passwordSchema.safeParse(newPassword);
      if (!result.success) {
        newErrors.newPassword = result.error.issues[0].message;
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // @see POST /api/v1/auth/reset-password
      await resetPasswordMutation({
        token: resetToken,
        new_password: newPassword,
        confirm_new_password: confirmPassword,
      });
      if (__DEV__) console.log('[NewPassword] Password reset success');

      Alert.alert(
        'Password Updated',
        'Your password has been reset successfully. Please sign in with your new password.',
        [
          {
            text: 'Sign In',
            onPress: () => router.replace('/auth/signin'),
          },
        ]
      );
    } catch (err: unknown) {
      if (__DEV__) console.error('[NewPassword] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
      setErrors({ root: errorMessage });
    } finally {
      // Always clear token from secure storage — success, failure, or abandonment
      await clearPendingResetToken();
    }
  };

  // Navigate back to sign in with cleanup
  const handleBackToSignIn = async () => {
    await clearPendingResetToken();
    router.replace('/auth/signin');
  };

  // Fallback if no token in secure storage
  if (!isLoadingToken && !resetToken) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.fallbackContainer}>
          <View style={[styles.iconContainer, { backgroundColor: withAlpha(StatusColors.warning, 0.15) }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={40} color={StatusColors.warning} />
          </View>
          <ThemedText type="title" style={styles.title}>
            Missing Token
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
            Please start the password reset process from the forgot password screen.
          </ThemedText>
          <View style={styles.buttonSection}>
            <PrimaryButton
              text="Go to Forgot Password"
              onPress={() => router.replace('/auth/forgot-password')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: withAlpha(BRAND_COLOR, 0.15) }]}>
              <IconSymbol name="lock.rotation" size={40} color={BRAND_COLOR} />
            </View>
            <ThemedText type="title" style={styles.title}>
              Set New Password
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              Choose a new password with at least 8 characters, including uppercase, lowercase, and a number.
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label="New Password"
              placeholder="Enter new password"
              icon="lock"
              value={newPassword}
              onChangeText={(value) => {
                setNewPassword(value);
                if (errors.newPassword) {
                  setErrors(prev => ({ ...prev, newPassword: undefined }));
                }
              }}
              error={errors.newPassword}
              secureTextEntry
            />

            <FormInput
              label="Confirm Password"
              placeholder="Re-enter new password"
              icon="lock"
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (errors.confirmPassword) {
                  setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              error={errors.confirmPassword}
              secureTextEntry
            />

            {/* Root error */}
            {errors.root && (
              <View style={[styles.errorBox, { backgroundColor: withAlpha(StatusColors.error, 0.1) }]}>
                <ThemedText style={[styles.errorText, { color: StatusColors.error }]}>
                  {errors.root}
                </ThemedText>
              </View>
            )}

            <View style={styles.buttonSection}>
              <PrimaryButton
                text="Update Password"
                onPress={handleSubmit}
                isLoading={isPending}
              />
            </View>

            <TouchableOpacity style={styles.backLink} onPress={handleBackToSignIn}>
              <ThemedText style={[styles.backLinkText, { color: BRAND_COLOR }]}>
                Back to Sign In
              </ThemedText>
            </TouchableOpacity>
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
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
  errorBox: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonSection: {
    marginTop: Spacing.md,
  },
  backLink: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
