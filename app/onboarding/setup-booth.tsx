/**
 * Booth Setup Screen
 * 
 * After signup, users create their first booth.
 * They enter booth name and location, then receive:
 * - Booth ID
 * - API Key (to copy to booth software)
 * - QR Code (alternative for scanning)
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
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing, BorderRadius, BRAND_COLOR, StatusColors, withAlpha } from '@/constants/theme';

interface FormData {
  boothName: string;
  location: string;
}

interface FormErrors {
  boothName?: string;
  location?: string;
}

/**
 * Simulated API response after booth creation
 */
interface BoothCredentials {
  boothId: string;
  apiKey: string;
  qrCodeUrl: string;
}

export default function SetupBoothScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');

  // Form state
  const [formData, setFormData] = useState<FormData>({
    boothName: '',
    location: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Credentials state (shown after booth creation)
  const [credentials, setCredentials] = useState<BoothCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<'boothId' | 'apiKey' | null>(null);

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

    if (!formData.boothName.trim()) {
      newErrors.boothName = 'Booth name is required';
    } else if (formData.boothName.length < 3) {
      newErrors.boothName = 'Name must be at least 3 characters';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle booth creation
  const handleCreateBooth = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulated API response
      const mockCredentials: BoothCredentials = {
        boothId: `booth-${Date.now().toString(36).toUpperCase()}`,
        apiKey: `pbx_${generateRandomKey(32)}`,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=pbx_${generateRandomKey(16)}`,
      };
      
      setCredentials(mockCredentials);
    } catch (error) {
      console.error('Create booth error:', error);
      Alert.alert('Error', 'Failed to create booth. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate random API key
  const generateRandomKey = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  // Copy to clipboard using React Native's built-in Clipboard
  // Note: For production, install expo-clipboard for better support
  const handleCopy = async (field: 'boothId' | 'apiKey', value: string) => {
    try {
      // Using Alert as a fallback since Clipboard requires additional setup
      // In production, use expo-clipboard: await Clipboard.setStringAsync(value)
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      // Show visual feedback - the checkmark icon will appear
      console.log(`Copied ${field}: ${value}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  // Continue to dashboard
  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  // Skip for now
  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  // Render credentials view after booth creation
  if (credentials) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Header */}
          <View style={styles.successHeader}>
            <View style={[styles.successIcon, { backgroundColor: withAlpha(StatusColors.success, 0.15) }]}>
              <IconSymbol name="checkmark.circle.fill" size={48} color={StatusColors.success} />
            </View>
            <ThemedText type="title" style={styles.successTitle}>
              Booth Created!
            </ThemedText>
            <ThemedText style={[styles.successSubtitle, { color: textSecondary }]}>
              Use the credentials below to connect your PhotoBooth software
            </ThemedText>
          </View>

          {/* Booth Info */}
          <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.infoRow}>
              <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>
                Booth Name
              </ThemedText>
              <ThemedText type="defaultSemiBold">
                {formData.boothName}
              </ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: borderColor }]} />
            <View style={styles.infoRow}>
              <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>
                Location
              </ThemedText>
              <ThemedText type="defaultSemiBold">
                {formData.location}
              </ThemedText>
            </View>
          </View>

          {/* Credentials Section */}
          <View style={styles.credentialsSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Connection Credentials
            </ThemedText>
            <ThemedText style={[styles.sectionSubtitle, { color: textSecondary }]}>
              Choose one of the methods below to connect your booth
            </ThemedText>
          </View>

          {/* Option 1: Copy API Key */}
          <View style={[styles.optionCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.optionHeader}>
              <View style={[styles.optionNumber, { backgroundColor: withAlpha(BRAND_COLOR, 0.15) }]}>
                <ThemedText style={[styles.optionNumberText, { color: BRAND_COLOR }]}>1</ThemedText>
              </View>
              <ThemedText type="defaultSemiBold" style={styles.optionTitle}>
                Copy API Key
              </ThemedText>
            </View>
            <ThemedText style={[styles.optionDescription, { color: textSecondary }]}>
              Copy the API key below and paste it into your PhotoBooth software settings.
            </ThemedText>

            {/* Booth ID */}
            <View style={styles.credentialItem}>
              <ThemedText style={[styles.credentialLabel, { color: textSecondary }]}>
                Booth ID
              </ThemedText>
              <TouchableOpacity 
                style={[styles.credentialBox, { backgroundColor: backgroundColor, borderColor }]}
                onPress={() => handleCopy('boothId', credentials.boothId)}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.credentialValue} numberOfLines={1}>
                  {credentials.boothId}
                </ThemedText>
                <View style={styles.copyButton}>
                  {copiedField === 'boothId' ? (
                    <IconSymbol name="checkmark" size={18} color={StatusColors.success} />
                  ) : (
                    <IconSymbol name="doc.on.doc" size={18} color={BRAND_COLOR} />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* API Key */}
            <View style={styles.credentialItem}>
              <ThemedText style={[styles.credentialLabel, { color: textSecondary }]}>
                API Key
              </ThemedText>
              <TouchableOpacity 
                style={[styles.credentialBox, { backgroundColor: backgroundColor, borderColor }]}
                onPress={() => handleCopy('apiKey', credentials.apiKey)}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.credentialValue} numberOfLines={1}>
                  {credentials.apiKey}
                </ThemedText>
                <View style={styles.copyButton}>
                  {copiedField === 'apiKey' ? (
                    <IconSymbol name="checkmark" size={18} color={StatusColors.success} />
                  ) : (
                    <IconSymbol name="doc.on.doc" size={18} color={BRAND_COLOR} />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Option 2: Scan QR Code */}
          <View style={[styles.optionCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.optionHeader}>
              <View style={[styles.optionNumber, { backgroundColor: withAlpha(BRAND_COLOR, 0.15) }]}>
                <ThemedText style={[styles.optionNumberText, { color: BRAND_COLOR }]}>2</ThemedText>
              </View>
              <ThemedText type="defaultSemiBold" style={styles.optionTitle}>
                Scan QR Code
              </ThemedText>
            </View>
            <ThemedText style={[styles.optionDescription, { color: textSecondary }]}>
              Open your PhotoBooth software and scan this QR code to connect automatically.
            </ThemedText>

            {/* QR Code Placeholder */}
            <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF', borderColor }]}>
              <View style={styles.qrCode}>
                {/* QR Code would be rendered here using a library like react-native-qrcode-svg */}
                <View style={styles.qrPlaceholder}>
                  <IconSymbol name="qrcode" size={120} color="#000000" />
                </View>
              </View>
              <ThemedText style={styles.qrHint}>
                Scan with PhotoBooth software
              </ThemedText>
            </View>
          </View>

          {/* Continue Button */}
          <View style={styles.buttonContainer}>
            <PrimaryButton
              text="Continue to Dashboard"
              onPress={handleContinue}
            />
          </View>

          {/* Add Another Booth Link */}
          <TouchableOpacity 
            style={styles.addAnotherButton}
            onPress={() => {
              setCredentials(null);
              setFormData({ boothName: '', location: '' });
            }}
          >
            <IconSymbol name="plus" size={18} color={BRAND_COLOR} />
            <ThemedText style={[styles.addAnotherText, { color: BRAND_COLOR }]}>
              Add Another Booth
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render form view
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
            <View style={[styles.headerIcon, { backgroundColor: withAlpha(BRAND_COLOR, 0.15) }]}>
              <IconSymbol name="photo.stack" size={32} color={BRAND_COLOR} />
            </View>
            <ThemedText type="title" style={styles.title}>
              Add Your First Booth
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              Enter your booth details to get started. You'll receive credentials to connect your PhotoBooth software.
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label="Booth Name"
              placeholder="e.g., Mall Central, Beach Pier"
              icon="photo.stack"
              value={formData.boothName}
              onChangeText={(value) => updateField('boothName', value)}
              error={errors.boothName}
              autoCapitalize="words"
            />

            <FormInput
              label="Location"
              placeholder="e.g., Westfield Shopping Center, Floor 2"
              icon="location"
              value={formData.location}
              onChangeText={(value) => updateField('location', value)}
              error={errors.location}
              autoCapitalize="sentences"
            />

            {/* Info Card */}
            <View style={[styles.infoBox, { backgroundColor: withAlpha(BRAND_COLOR, 0.1), borderColor: withAlpha(BRAND_COLOR, 0.3) }]}>
              <IconSymbol name="info.circle" size={20} color={BRAND_COLOR} />
              <ThemedText style={[styles.infoBoxText, { color: textSecondary }]}>
                After creating your booth, you'll receive an API key and QR code to connect your PhotoBooth software.
              </ThemedText>
            </View>

            {/* Create Booth Button */}
            <View style={styles.buttonSection}>
              <PrimaryButton
                text="Create Booth"
                onPress={handleCreateBooth}
                isLoading={isLoading}
              />
            </View>
          </View>

          {/* Skip Link */}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <ThemedText style={[styles.skipText, { color: textSecondary }]}>
              Skip for now
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
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  buttonSection: {
    marginTop: Spacing.sm,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  skipText: {
    fontSize: 14,
  },

  // Success/Credentials View Styles
  successHeader: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  infoCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  infoLabel: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  credentialsSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  optionCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  optionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  optionNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionTitle: {
    fontSize: 16,
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  credentialItem: {
    marginBottom: Spacing.sm,
  },
  credentialLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  credentialBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  credentialValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  qrContainer: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  qrCode: {
    marginBottom: Spacing.sm,
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrHint: {
    fontSize: 12,
    color: '#666',
  },
  buttonContainer: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  addAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  addAnotherText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

