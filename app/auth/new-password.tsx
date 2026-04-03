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

import React, { useMemo, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { FormInput } from '@/components/auth/form-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing, BRAND_COLOR, StatusColors, withAlpha } from '@/constants/theme';
// API hook for reset password
import { useResetPassword } from '@/api/auth/reset-password/queries';

export default function NewPasswordScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textSecondary = useThemeColor({}, 'textSecondary');

  // Extract token from navigation params (passed from reset-password/code screen)
  const params = useLocalSearchParams<{ token?: string }>();

  const resetToken = useMemo(() => {
    const tokenParam = params.token;
    return typeof tokenParam === 'string' ? tokenParam : '';
  }, [params.token]);

  // API mutation hook
  const { mutateAsync: resetPasswordMutation, isPending } = useResetPassword();

  // Form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string; root?: string }>({});

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
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/\d/.test(newPassword)) {
      newErrors.newPassword = 'Password must contain at least one number';
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(newPassword)) {
      newErrors.newPassword = 'Password must contain at least one lowercase letter';
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
      const response = await resetPasswordMutation({
        token: resetToken,
        new_password: newPassword,
        confirm_new_password: confirmPassword,
      });
      console.log('[NewPassword] Success:', response);

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
      console.error('[NewPassword] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
      setErrors({ root: errorMessage });
    }
  };

  // Fallback if no token
  if (!resetToken) {
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

            <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/auth/signin')}>
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
