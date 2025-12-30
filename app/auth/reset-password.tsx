/**
 * Reset Password Screen
 * 
 * Allows users to set a new password after clicking the reset link in email.
 * Opens via deep link: photoboothapp://auth/reset-password?token=xyz
 * 
 * Flow:
 * 1. User clicks reset link in email
 * 2. Deep link opens app to this screen with token in URL params
 * 3. User enters new password
 * 4. Submits to POST /api/v1/auth/reset-password with token
 * 5. On success, redirects to sign in
 * 
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
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

export default function ResetPasswordScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'card');

  // Extract token from URL params (from deep link)
  // e.g., photoboothapp://auth/reset-password?token=abc123
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
    // Clear errors
    setErrors({});

    // Validate token
    if (!resetToken) {
      setErrors({ root: 'Reset token missing. Please open the password reset link again.' });
      return;
    }

    // Validate password
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
      // Call reset password API
      // @see POST /api/v1/auth/reset-password
      const response = await resetPasswordMutation({
        token: resetToken,
        new_password: newPassword,
        confirm_new_password: confirmPassword,
      });
      console.log('[ResetPassword] Success:', response);
      
      // Show success and redirect to sign in
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
      console.error('[ResetPassword] Error:', err);
      // Extract error message from API response
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
      setErrors({ root: errorMessage });
    }
  };

  // Navigate back to sign in
  const handleBackToSignIn = () => {
    router.push('/auth/signin');
  };

  // Show error if token is missing
  const hasValidToken = Boolean(resetToken);

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
              Update Your Password
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              Set a new password with at least 8 characters, including uppercase, lowercase, and a number.
            </ThemedText>
          </View>

          {/* Token Status */}
          <View style={[styles.tokenStatus, { backgroundColor: cardBg }]}>
            <IconSymbol 
              name={hasValidToken ? "checkmark.circle.fill" : "exclamationmark.triangle.fill"} 
              size={20} 
              color={hasValidToken ? StatusColors.success : StatusColors.warning} 
            />
            <ThemedText style={[styles.tokenText, { color: textSecondary }]}>
              {hasValidToken 
                ? 'Reset link verified' 
                : 'Reset token missing. Please open the password reset link from your email.'}
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
                disabled={!hasValidToken}
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
  tokenStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  tokenText: {
    flex: 1,
    fontSize: 13,
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
});

