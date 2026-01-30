/**
 * Sign Up Screen
 * 
 * User registration screen with email/password and social login options.
 * Uses the useSignup hook from the API layer.
 * 
 * Features:
 * - First name, last name, email, password, confirm password fields
 * - Form validation with Zod schema
 * - Sign up with Google and Apple
 * - Link to sign in for existing users
 * - Redirects to booth setup after successful signup
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { FormInput } from '@/components/auth/form-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { SocialButton } from '@/components/auth/social-button';
import { Spacing, BRAND_COLOR } from '@/constants/theme';

// API hooks
import { useSignup } from '@/api/auth/signup/queries';
import { useSignin } from '@/api/auth/signin/queries';
import { savePendingPassword, saveTokens, saveUser, clearQueryCache } from '@/api/client';
import { useSocialOAuth } from '@/hooks/use-social-oauth';
import type { AuthResponse } from '@/api/auth/types';
import type { EmailVerificationResponse } from '@/api/auth/signin/types';

/**
 * Type guard to check if signin response requires email verification
 */
function isEmailVerificationResponse(
  response: AuthResponse | EmailVerificationResponse
): response is EmailVerificationResponse {
  return 'requires_verification' in response && response.requires_verification === true;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function SignUpScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');

  // Form state
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // API mutation hooks
  const { mutateAsync: signupMutation, isPending: isSignupPending } = useSignup();
  const { mutateAsync: signinMutation, isPending: isSigninPending } = useSignin();
  const [apiError, setApiError] = useState<Error | null>(null);

  // Combined loading state
  const isPending = isSignupPending || isSigninPending;

  // Social OAuth hook
  // @see /hooks/use-social-oauth.ts for implementation details
  const [socialError, setSocialError] = useState<string | null>(null);
  const { startSocialAuth, isSocialAuthPending } = useSocialOAuth({
    onError: (message) => setSocialError(message),
    onSuccess: async () => {
      // Social auth handles token storage internally
      // Navigate to main app - users can add booths from Booths tab
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

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle sign up
  // Trick: After signup, immediately call signin to trigger verification email
  // The API only sends verification emails on login attempts, not on signup
  // @see tryrack-app/app/auth/signup.tsx for reference implementation
  const handleSignUp = async () => {
    if (!validateForm()) return;

    setApiError(null);

    try {
      // Step 1: Create the account
      await signupMutation({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirmPassword,
      });

      console.log('[SignUp] Account created, triggering signin for verification email');

      // Step 2: Sign in to trigger verification email
      // This is the trick - verification email is only sent on login attempt
      const loginResponse = await signinMutation({
        email: formData.email,
        password: formData.password,
      });

      // Step 3: Handle the response
      if (isEmailVerificationResponse(loginResponse)) {
        console.log('[SignUp] Email verification required');
        // Save password securely for resending verification code
        await savePendingPassword(formData.password);
        // Navigate to email verification screen with token
        router.push({
          pathname: '/auth/verify-email',
          params: {
            email: loginResponse.email,
            pending_authentication_token: loginResponse.pending_authentication_token,
          },
        });
        return;
      }

      // If no verification required (unlikely for new signup), complete login
      const authResponse = loginResponse as AuthResponse;
      clearQueryCache();
      await saveTokens(authResponse.access_token, authResponse.refresh_token);
      await saveUser(authResponse.user);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[SignUp] Error:', error);
      setApiError(error instanceof Error ? error : new Error('Sign up failed. Please try again.'));
    }
  };

  // Handle social sign up
  // Provider values must match OAuthProvider type: 'AppleOAuth' | 'GoogleOAuth' | etc.
  // @see /api/auth/oauth/types.ts
  const handleGoogleSignUp = () => {
    setSocialError(null);
    startSocialAuth('GoogleOAuth');
  };

  const handleAppleSignUp = () => {
    setSocialError(null);
    startSocialAuth('AppleOAuth');
  };

  // Navigate to sign in
  const handleSignInPress = () => {
    router.push('/auth/signin');
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
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Create Account
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              Sign up to manage your photobooths
            </ThemedText>
          </View>

          {/* API Error Message */}
          {(apiError || socialError) && (
            <View style={styles.errorBanner}>
              <ThemedText style={styles.errorText}>
                {socialError || apiError?.message || 'Sign up failed. Please try again.'}
              </ThemedText>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            {/* Name Row */}
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <FormInput
                  label="First Name"
                  placeholder="John"
                  icon="person"
                  value={formData.firstName}
                  onChangeText={(value) => updateField('firstName', value)}
                  error={errors.firstName}
                  autoCapitalize="words"
                  autoComplete="given-name"
                />
              </View>
              <View style={styles.nameField}>
                <FormInput
                  label="Last Name"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChangeText={(value) => updateField('lastName', value)}
                  error={errors.lastName}
                  autoCapitalize="words"
                  autoComplete="family-name"
                />
              </View>
            </View>

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
              placeholder="Min. 8 characters"
              icon="key.fill"
              isPassword
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              error={errors.password}
              autoComplete="new-password"
            />

            <FormInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              icon="key.fill"
              isPassword
              value={formData.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            {/* Sign Up Button */}
            <View style={styles.buttonSection}>
              <PrimaryButton
                text="Create Account"
                onPress={handleSignUp}
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
              onPress={handleGoogleSignUp}
              disabled={isSocialAuthPending || isPending}
            />
            <SocialButton
              provider="apple"
              text="Continue with Apple"
              onPress={handleAppleSignUp}
              disabled={isSocialAuthPending || isPending}
            />
          </View>

          {/* Sign In Link */}
          <View style={styles.footer}>
            <ThemedText style={[styles.footerText, { color: textSecondary }]}>
              Already have an account?{' '}
            </ThemedText>
            <TouchableOpacity onPress={handleSignInPress}>
              <ThemedText style={[styles.footerLink, { color: BRAND_COLOR }]}>
                Sign In
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
  header: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
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
  nameRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  nameField: {
    flex: 1,
  },
  buttonSection: {
    marginTop: Spacing.md,
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
