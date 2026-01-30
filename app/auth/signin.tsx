/**
 * Sign In Screen
 * 
 * User login screen with email/password and social login options.
 * Uses the useSignin hook from the API layer.
 * 
 * Features:
 * - Email and password fields with validation
 * - Forgot password link
 * - Sign in with Google and Apple
 * - Link to sign up for new users
 * - Handles email verification redirect
 * 
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 */

import React, { useState } from 'react';
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
import { SocialButton } from '@/components/auth/social-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing, BRAND_COLOR, withAlpha } from '@/constants/theme';

// API hooks and utilities
import { useSignin } from '@/api/auth/signin/queries';
import { saveTokens, saveUser, clearQueryCache } from '@/api/client';
import type { AuthResponse } from '@/api/auth/types';
import type { EmailVerificationResponse } from '@/api/auth/signin/types';
import { useSocialOAuth } from '@/hooks/use-social-oauth';

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

/**
 * Type guard to check if response requires email verification
 */
function isEmailVerificationResponse(
  response: AuthResponse | EmailVerificationResponse
): response is EmailVerificationResponse {
  return 'requires_verification' in response && response.requires_verification === true;
}

export default function SignInScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');

  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // API mutation hook
  const { mutate: signin, isPending, error: apiError } = useSignin();

  // Social OAuth hook
  // @see /hooks/use-social-oauth.ts for implementation details
  const [socialError, setSocialError] = useState<string | null>(null);
  const { startSocialAuth, isSocialAuthPending } = useSocialOAuth({
    onError: (message) => setSocialError(message),
    onSuccess: async () => {
      // Social auth handles token storage internally
      // Navigate to main app
      router.replace('/(tabs)');
    },
  });

  // Update form field
  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle sign in
  const handleSignIn = () => {
    if (!validateForm()) return;

    // Clear previous query cache before signing in (prevents stale data from previous user)
    clearQueryCache();

    signin(
      { email: formData.email, password: formData.password },
      {
        onSuccess: async (response) => {
          // Check if email verification is required
          if (isEmailVerificationResponse(response)) {
            router.push({
              pathname: '/auth/verify-email',
              params: {
                email: response.email,
                token: response.pending_authentication_token,
              },
            });
            return;
          }

          // Successful login - save tokens and user
          try {
            await saveTokens(response.access_token, response.refresh_token);
            await saveUser(response.user);
            router.replace('/(tabs)');
          } catch (saveError) {
            console.error('[SignIn] Failed to save auth data:', saveError);
            Alert.alert('Error', 'Failed to complete sign in. Please try again.');
          }
        },
        onError: (error) => {
          console.error('[SignIn] Error:', error.message);
          // Error is displayed via apiError state
        },
      }
    );
  };

  // Handle social sign in
  // Provider values must match OAuthProvider type: 'AppleOAuth' | 'GoogleOAuth' | etc.
  // @see /api/auth/oauth/types.ts
  const handleGoogleSignIn = () => {
    setSocialError(null);
    startSocialAuth('GoogleOAuth');
  };

  const handleAppleSignIn = () => {
    setSocialError(null);
    startSocialAuth('AppleOAuth');
  };

  // Navigate to sign up
  const handleSignUpPress = () => {
    router.push('/auth/signup');
  };

  // Navigate to forgot password
  const handleForgotPassword = () => {
    router.push('/auth/forgot-password');
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
          {/* Logo / Branding */}
          <View style={styles.logoSection}>
            <View style={[styles.logoContainer, { backgroundColor: withAlpha(BRAND_COLOR, 0.15) }]}>
              <IconSymbol name="photo.stack" size={40} color={BRAND_COLOR} />
            </View>
            <ThemedText type="title" style={styles.brandName}>
              PhotoBoothX
            </ThemedText>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Welcome Back
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              Sign in to manage your photobooths
            </ThemedText>
          </View>

          {/* API Error Message */}
          {(apiError || socialError) && (
            <View style={styles.errorBanner}>
              <ThemedText style={styles.errorText}>
                {socialError || apiError?.message || 'Sign in failed. Please try again.'}
              </ThemedText>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label="Email"
              placeholder="john@example.com"
              icon="envelope"
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <FormInput
              label="Password"
              placeholder="Enter your password"
              icon="key.fill"
              isPassword
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              error={errors.password}
              autoComplete="current-password"
            />

            {/* Forgot Password */}
            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
            >
              <ThemedText style={[styles.forgotPasswordText, { color: BRAND_COLOR }]}>
                Forgot Password?
              </ThemedText>
            </TouchableOpacity>

            {/* Sign In Button */}
            <View style={styles.buttonSection}>
              <PrimaryButton
                text="Sign In"
                onPress={handleSignIn}
                isLoading={isPending}
              />
            </View>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: borderColor }]} />
            <ThemedText style={[styles.dividerText, { color: textSecondary }]}>
              or continue with
            </ThemedText>
            <View style={[styles.divider, { backgroundColor: borderColor }]} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialButtons}>
            <SocialButton
              provider="google"
              text="Continue with Google"
              onPress={handleGoogleSignIn}
              disabled={isSocialAuthPending || isPending}
            />
            <SocialButton
              provider="apple"
              text="Continue with Apple"
              onPress={handleAppleSignIn}
              disabled={isSocialAuthPending || isPending}
            />
          </View>

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <ThemedText style={[styles.footerText, { color: textSecondary }]}>
              {"Don't have an account? "}
            </ThemedText>
            <TouchableOpacity onPress={handleSignUpPress}>
              <ThemedText style={[styles.footerLink, { color: BRAND_COLOR }]}>
                Sign Up
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
    paddingBottom: Spacing.xxl,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  brandName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
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
  form: {
    marginBottom: Spacing.lg,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonSection: {
    marginTop: Spacing.sm,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: 14,
  },
  socialButtons: {
    marginBottom: Spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
