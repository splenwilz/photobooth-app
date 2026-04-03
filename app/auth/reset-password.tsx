/**
 * Reset Password - Code Entry Screen
 *
 * Step 2 of the password reset flow. User enters the 6-digit OTP code
 * sent to their email. On success, navigates to the new-password screen
 * with the returned token.
 *
 * Flow:
 * 1. Forgot-password screen sends code to email, navigates here with email param
 * 2. User enters 6-digit code
 * 3. POST /api/v1/auth/verify-reset-code → returns {token}
 * 4. Navigate to new-password screen with token
 *
 * @see /api/auth/verify-reset-code/queries.ts - useVerifyResetCode hook
 */

import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/auth/primary-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing, BorderRadius, BRAND_COLOR, StatusColors, withAlpha } from '@/constants/theme';
// API hooks
import { useVerifyResetCode } from '@/api/auth/verify-reset-code/queries';
import { useForgotPassword } from '@/api/auth/forgot-password/queries';

const CODE_LENGTH = 6;

export default function ResetPasswordScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');

  // Extract email from navigation params (passed from forgot-password screen)
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  // API mutation hooks
  const { mutateAsync: verifyResetCodeMutation, isPending } = useVerifyResetCode();
  const { mutateAsync: forgotPasswordMutation } = useForgotPassword();

  // State
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Handle code input
  const handleCodeChange = (value: string, index: number) => {
    if (error) setError('');

    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, CODE_LENGTH).split('');
      const newCode = [...code];
      pastedCode.forEach((char, i) => {
        if (index + i < CODE_LENGTH) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);

      const nextIndex = Math.min(index + pastedCode.length, CODE_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      if (value && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle backspace
  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verify code
  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== CODE_LENGTH) {
      setError('Please enter the 6-digit code');
      return;
    }

    try {
      // @see POST /api/v1/auth/verify-reset-code
      const response = await verifyResetCodeMutation({ code: fullCode });
      console.log('[ResetPassword] Code verified:', response);

      // Navigate to new-password screen with the returned token
      router.push({ pathname: '/auth/new-password', params: { token: response.token } });
    } catch (err: unknown) {
      console.error('[ResetPassword] Verify error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Invalid or expired code. Please try again.';
      setError(errorMessage);
      // Clear code and refocus first input
      setCode(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  // Resend code
  const handleResend = async () => {
    if (!email) {
      Alert.alert(
        'Unable to Resend',
        'Please go back and enter your email again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go Back', onPress: () => router.back() },
        ]
      );
      return;
    }

    try {
      setIsResending(true);
      await forgotPasswordMutation({ email });
      setCode(Array(CODE_LENGTH).fill(''));
      setError('');
      inputRefs.current[0]?.focus();
      Alert.alert('Code Resent', 'A new reset code has been sent to your email.');
    } catch (err: unknown) {
      console.error('[ResetPassword] Resend error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend code. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const isCodeComplete = code.every(c => c !== '');

  // Fallback if no email param
  if (!email) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.fallbackContainer}>
          <View style={[styles.iconContainer, { backgroundColor: withAlpha(StatusColors.warning, 0.15) }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={40} color={StatusColors.warning} />
          </View>
          <ThemedText type="title" style={styles.title}>
            Missing Information
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
              <IconSymbol name="envelope" size={40} color={BRAND_COLOR} />
            </View>
            <ThemedText type="title" style={styles.title}>
              Enter Reset Code
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              We sent a 6-digit code to
            </ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.emailText}>
              {email}
            </ThemedText>
          </View>

          {/* Error */}
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: withAlpha(StatusColors.error, 0.1) }]}>
              <ThemedText style={[styles.errorText, { color: StatusColors.error }]}>
                {error}
              </ThemedText>
            </View>
          ) : null}

          {/* Code Input */}
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.codeInput,
                  {
                    backgroundColor: cardBg,
                    borderColor: digit ? BRAND_COLOR : borderColor,
                    color: textColor,
                  },
                ]}
                value={digit}
                onChangeText={(value) => handleCodeChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Verify Button */}
          <View style={styles.buttonSection}>
            <PrimaryButton
              text="Verify Code"
              onPress={handleVerify}
              isLoading={isPending}
              disabled={!isCodeComplete}
            />
          </View>

          {/* Resend Link */}
          <TouchableOpacity
            style={styles.resendSection}
            onPress={handleResend}
            disabled={isResending || isPending}
          >
            <ThemedText style={[styles.resendText, { color: textSecondary }]}>
              {"Didn't receive the code? "}
            </ThemedText>
            <ThemedText style={[
              styles.resendLink,
              { color: BRAND_COLOR, opacity: isResending ? 0.6 : 1 },
            ]}>
              {isResending ? 'Sending...' : 'Resend'}
            </ThemedText>
          </TouchableOpacity>

          {/* Back to Sign In */}
          <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/auth/signin')}>
            <ThemedText style={[styles.backLinkText, { color: BRAND_COLOR }]}>
              Back to Sign In
            </ThemedText>
          </TouchableOpacity>
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
  emailText: {
    fontSize: 16,
    marginTop: Spacing.xs,
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
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonSection: {
    marginBottom: Spacing.lg,
  },
  resendSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
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
