/**
 * Create Booth Screen
 * 
 * Screen for creating a new photobooth.
 * Displays booth name and address form, then shows API key and QR code on success.
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { FormInput } from '@/components/auth/form-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing, BorderRadius, BRAND_COLOR, withAlpha } from '@/constants/theme';

// API hooks
import { useCreateBooth } from '@/api/booths/queries';
import type { CreateBoothResponse } from '@/api/booths/types';

interface FormData {
  name: string;
  address: string;
}

interface FormErrors {
  name?: string;
  address?: string;
}

export default function CreateBoothScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'cardBackground');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');
  const successColor = useThemeColor({}, 'success');

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Success state - shows API key and QR code after booth creation
  const [createdBooth, setCreatedBooth] = useState<CreateBoothResponse | null>(null);
  const [copiedField, setCopiedField] = useState<'id' | 'apiKey' | null>(null);

  // API mutation hook
  const { mutate: createBooth, isPending, error: apiError } = useCreateBooth();

  // Update form field
  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Booth name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Booth name must be at least 2 characters';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle booth creation
  const handleCreateBooth = () => {
    if (!validateForm()) return;

    createBooth(
      { name: formData.name, address: formData.address },
      {
        onSuccess: (response) => {
          console.log('[CreateBooth] Success:', response);
          setCreatedBooth(response);
        },
        onError: (error) => {
          console.error('[CreateBooth] Error:', error);
        },
      }
    );
  };

  // Copy to clipboard
  const handleCopy = async (text: string, field: 'id' | 'apiKey') => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  // Navigate back to booths
  const handleGoToBooths = () => {
    router.replace('/(tabs)/booths');
  };

  // Create another booth
  const handleAddAnother = () => {
    setCreatedBooth(null);
    setFormData({ name: '', address: '' });
  };

  // Navigate back
  const handleBack = () => {
    router.back();
  };

  // Success state - show booth credentials
  if (createdBooth) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.successContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Icon */}
          <View style={[styles.successIcon, { backgroundColor: withAlpha(successColor, 0.15) }]}>
            <IconSymbol name="checkmark" size={48} color={successColor} />
          </View>

          <ThemedText type="title" style={styles.successTitle}>
            Booth Created!
          </ThemedText>
          <ThemedText style={[styles.successSubtitle, { color: textSecondary }]}>
            Your booth "{createdBooth.name}" has been created successfully.
          </ThemedText>

          {/* Credentials Card */}
          <View style={[styles.credentialsCard, { backgroundColor: cardBg, borderColor }]}>
            <ThemedText style={styles.credentialsTitle}>
              Connection Credentials
            </ThemedText>
            <ThemedText style={[styles.credentialsSubtitle, { color: textSecondary }]}>
              Use these to connect your physical booth
            </ThemedText>

            {/* Booth ID */}
            <View style={styles.credentialRow}>
              <ThemedText style={[styles.credentialLabel, { color: textSecondary }]}>
                Booth ID
              </ThemedText>
              <TouchableOpacity 
                style={[styles.credentialValue, { backgroundColor: withAlpha(BRAND_COLOR, 0.1), borderColor }]}
                onPress={() => handleCopy(createdBooth.id, 'id')}
              >
                <ThemedText style={styles.credentialText} numberOfLines={1}>
                  {createdBooth.id}
                </ThemedText>
                <IconSymbol 
                  name={copiedField === 'id' ? 'checkmark' : 'doc.on.doc'} 
                  size={18} 
                  color={copiedField === 'id' ? successColor : BRAND_COLOR} 
                />
              </TouchableOpacity>
            </View>

            {/* API Key */}
            <View style={styles.credentialRow}>
              <ThemedText style={[styles.credentialLabel, { color: textSecondary }]}>
                API Key
              </ThemedText>
              <TouchableOpacity 
                style={[styles.credentialValue, { backgroundColor: withAlpha(BRAND_COLOR, 0.1), borderColor }]}
                onPress={() => handleCopy(createdBooth.api_key, 'apiKey')}
              >
                <ThemedText style={styles.credentialText} numberOfLines={1}>
                  {createdBooth.api_key.slice(0, 20)}...
                </ThemedText>
                <IconSymbol 
                  name={copiedField === 'apiKey' ? 'checkmark' : 'doc.on.doc'} 
                  size={18} 
                  color={copiedField === 'apiKey' ? successColor : BRAND_COLOR} 
                />
              </TouchableOpacity>
            </View>

            {/* QR Code */}
            {createdBooth.qr_code && (
              <View style={styles.qrSection}>
                <ThemedText style={[styles.credentialLabel, { color: textSecondary }]}>
                  Or scan QR Code
                </ThemedText>
                <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF', borderColor }]}>
                  {/* Render base64 QR code image from API response */}
                  <Image
                    source={{ uri: createdBooth.qr_code }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <PrimaryButton
              text="Go to Booths"
              onPress={handleGoToBooths}
            />
            <TouchableOpacity 
              style={[styles.secondaryButton, { borderColor }]}
              onPress={handleAddAnother}
            >
              <IconSymbol name="plus" size={18} color={BRAND_COLOR} />
              <ThemedText style={[styles.secondaryButtonText, { color: BRAND_COLOR }]}>
                Add Another Booth
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Form state - create booth form
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={BRAND_COLOR} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <ThemedText type="title" style={styles.title}>
              Add New Booth
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              Set up a new photobooth
            </ThemedText>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* API Error Message */}
          {apiError && (
            <View style={styles.errorBanner}>
              <ThemedText style={styles.errorText}>
                {apiError.message || 'Failed to create booth. Please try again.'}
              </ThemedText>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label="Booth Name"
              placeholder="e.g., Main Entrance Booth"
              icon="photo.stack"
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              error={errors.name}
              autoCapitalize="words"
            />

            <FormInput
              label="Address"
              placeholder="e.g., 123 Mall of America, Minneapolis"
              icon="location"
              value={formData.address}
              onChangeText={(value) => updateField('address', value)}
              error={errors.address}
              autoCapitalize="words"
            />

            {/* Create Button */}
            <View style={styles.buttonSection}>
              <PrimaryButton
                text="Create Booth"
                onPress={handleCreateBooth}
                isLoading={isPending}
              />
            </View>
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: withAlpha(BRAND_COLOR, 0.1), borderColor }]}>
            <IconSymbol name="info.circle" size={20} color={BRAND_COLOR} />
            <ThemedText style={[styles.infoText, { color: textSecondary }]}>
              After creating the booth, you'll receive an API Key and QR code to connect your physical photobooth device.
            </ThemedText>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  successContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  successSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  credentialsCard: {
    width: '100%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  credentialsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  credentialsSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  credentialRow: {
    marginBottom: Spacing.md,
  },
  credentialLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  credentialValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  credentialText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginRight: Spacing.sm,
  },
  qrSection: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  qrContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  actionButtons: {
    width: '100%',
    gap: Spacing.md,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    marginTop: Spacing.lg,
  },
  buttonSection: {
    marginTop: Spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});

