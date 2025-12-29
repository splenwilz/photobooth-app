/**
 * Verify Email Screen
 * 
 * Email verification screen where users enter the 6-digit code sent to their email.
 * 
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/auth/primary-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing, BorderRadius, BRAND_COLOR, withAlpha } from '@/constants/theme';

// API hooks
import { useVerifyEmail } from '@/api/auth/verify-email/queries';
import { useSignin } from '@/api/auth/signin/queries';
import { 
  saveTokens, 
  saveUser, 
  getPendingPassword, 
  clearPendingPassword,
  clearQueryCache,
  ApiError,
} from '@/api/client';
import type { AuthResponse } from '@/api/auth/types';

const CODE_LENGTH = 6;

export default function VerifyEmailScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textColor = useThemeColor({}, 'text');

  // Get params from navigation
  // Note: pending_authentication_token comes from signin response after signup
  const params = useLocalSearchParams<{ 
    email: string; 
    pending_authentication_token: string;
  }>();
  
  const email = typeof params.email === 'string' ? params.email : '';
  const initialToken = typeof params.pending_authentication_token === 'string' 
    ? params.pending_authentication_token 
    : '';

  // State
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [pendingToken, setPendingToken] = useState(initialToken);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Update pending token when params change
  useEffect(() => {
    if (initialToken) {
      setPendingToken(initialToken);
    }
  }, [initialToken]);

  // API mutation hooks
  const { mutate: verifyEmail, isPending, error: apiError } = useVerifyEmail();
  const { mutateAsync: signinMutation } = useSignin();

  // Handle code input
  const handleCodeChange = (value: string, index: number) => {
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
      
      // Focus last input or next empty
      const nextIndex = Math.min(index + pastedCode.length, CODE_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      // Auto-focus next input
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
  const handleVerify = () => {
    const fullCode = code.join('');
    if (fullCode.length !== CODE_LENGTH || !pendingToken) return;

    verifyEmail(
      { 
        pending_authentication_token: pendingToken,
        code: fullCode,
      },
      {
        onSuccess: async (response) => {
          console.log('[VerifyEmail] Success:', response);
          
          // Clear stored password after successful verification
          await clearPendingPassword();
          
          // Save tokens and user
          clearQueryCache();
          await saveTokens(response.access_token, response.refresh_token);
          await saveUser(response.user);

          // Navigate to main app
          router.replace('/(tabs)');
        },
        onError: (error) => {
          console.error('[VerifyEmail] Error:', error);
          // Clear code on error
          setCode(Array(CODE_LENGTH).fill(''));
          inputRefs.current[0]?.focus();
        },
      }
    );
  };

  /**
   * Resend verification code
   * Uses stored password from SecureStore to call signin again
   * @see tryrack-app/app/auth/verify-email.tsx for reference
   */
  const handleResend = async () => {
    try {
      setIsResending(true);
      const storedPassword = await getPendingPassword();

      if (!storedPassword || !email) {
        // Clear password and redirect to sign in
        await clearPendingPassword();
        Alert.alert(
          'Unable to Resend',
          'Please return to the sign in screen and sign in again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Go to Sign In', 
              onPress: () => router.replace('/auth/signin'),
            },
          ]
        );
        return;
      }

      // Resend code by signing in again with stored password
      const response = await signinMutation({
        email,
        password: storedPassword,
      });

      if ('requires_verification' in response) {
        // Update pending token if it changed
        setPendingToken(response.pending_authentication_token);
        Alert.alert(
          'Code Resent',
          'A new verification code has been sent to your email.',
          [{ text: 'OK' }]
        );
      } else {
        // User is already verified, redirect to app
        const authResponse = response as AuthResponse;
        await saveTokens(authResponse.access_token, authResponse.refresh_token);
        await saveUser(authResponse.user);
        await clearPendingPassword();
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('[VerifyEmail] Resend error:', error);
      const message = error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Failed to resend verification code.';
      Alert.alert('Error', message);
    } finally {
      setIsResending(false);
    }
  };

  const isCodeComplete = code.every(c => c !== '');

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
              Verify Your Email
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              We sent a 6-digit code to
            </ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.email}>
              {email || 'your email'}
            </ThemedText>
          </View>

          {/* API Error */}
          {apiError && (
            <View style={styles.errorBanner}>
              <ThemedText style={styles.errorText}>
                {apiError.message || 'Verification failed. Please try again.'}
              </ThemedText>
            </View>
          )}

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
              text="Verify Email"
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
              Didn't receive the code?{' '}
            </ThemedText>
            <ThemedText style={[
              styles.resendLink, 
              { color: BRAND_COLOR, opacity: isResending ? 0.6 : 1 },
            ]}>
              {isResending ? 'Sending...' : 'Resend'}
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
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
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
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    marginTop: Spacing.xs,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: '#FF5252',
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
});

