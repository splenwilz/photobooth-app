/**
 * Connection Details Modal
 *
 * Displays booth connection credentials with registration code as the primary method.
 * Users enter the 6-digit code on their booth touchscreen to connect.
 * QR code and API key kept as fallback options.
 *
 * @see GET /api/v1/booths/{booth_id}/credentials
 * @see POST /api/v1/booths/{booth_id}/generate-code
 */

import * as Clipboard from "expo-clipboard";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBoothCredentials, useGenerateBoothCode } from "@/api/booths";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  BorderRadius,
  BRAND_COLOR,
  Spacing,
  StatusColors,
  withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface ConnectionDetailsModalProps {
  visible: boolean;
  boothId: string | null;
  boothName: string;
  onClose: () => void;
}

export const ConnectionDetailsModal: React.FC<ConnectionDetailsModalProps> = ({
  visible,
  boothId,
  boothName,
  onClose,
}) => {
  const backgroundColor = useThemeColor({}, "background");
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const textSecondary = useThemeColor({}, "textSecondary");

  // Track newly generated code (takes precedence over credentials code)
  const [generatedCode, setGeneratedCode] = useState<{
    code: string;
    expires_at: string;
  } | null>(null);

  // Reset generated code when modal closes
  React.useEffect(() => {
    if (!visible) {
      setGeneratedCode(null);
    }
  }, [visible]);

  // Fetch credentials from API
  // @see GET /api/v1/booths/{booth_id}/credentials
  const {
    data: credentials,
    isLoading,
    error,
    refetch,
  } = useBoothCredentials(visible ? boothId : null);

  // Generate new code mutation
  // @see POST /api/v1/booths/{booth_id}/generate-code
  const generateCodeMutation = useGenerateBoothCode();

  // Get current code (generated code takes precedence)
  const currentCode = generatedCode?.code ?? credentials?.registration_code;
  const currentExpiry = generatedCode?.expires_at ?? credentials?.code_expires_at;

  // Copy API key to clipboard
  const handleCopyApiKey = useCallback(async () => {
    if (!credentials?.api_key) return;

    try {
      await Clipboard.setStringAsync(credentials.api_key);
      Alert.alert("Copied!", "API key copied to clipboard.");
    } catch (err) {
      console.error("[ConnectionDetailsModal] Copy error:", err);
      Alert.alert("Error", "Failed to copy API key.");
    }
  }, [credentials?.api_key]);

  // Copy registration code to clipboard
  const handleCopyCode = useCallback(async () => {
    if (!currentCode) return;

    try {
      await Clipboard.setStringAsync(currentCode);
      Alert.alert("Copied!", "Registration code copied to clipboard.");
    } catch (err) {
      console.error("[ConnectionDetailsModal] Copy code error:", err);
      Alert.alert("Error", "Failed to copy code.");
    }
  }, [currentCode]);

  // Generate new registration code
  const handleGenerateCode = useCallback(() => {
    if (!boothId) return;

    generateCodeMutation.mutate(
      { boothId },
      {
        onSuccess: (data) => {
          setGeneratedCode({
            code: data.code,
            expires_at: data.expires_at,
          });
          Alert.alert(
            "New Code Generated",
            `Your new registration code is: ${data.code}\n\nValid for ${data.expires_in_minutes} minutes.`
          );
        },
        onError: (err) => {
          console.error("[ConnectionDetailsModal] Generate code error:", err);
          Alert.alert("Error", "Failed to generate new code. Please try again.");
        },
      }
    );
  }, [boothId, generateCodeMutation]);

  // Retry fetching credentials
  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        {/* Header */}
        <View style={[styles.header, { borderColor }]}>
          <View style={styles.headerLeft}>
            <ThemedText type="subtitle" style={styles.headerTitle}>
              Connection Details
            </ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: textSecondary }]}>
              {boothName}
            </ThemedText>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: withAlpha(BRAND_COLOR, 0.1) }]}
          >
            <IconSymbol name="xmark" size={20} color={BRAND_COLOR} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Loading State */}
          {isLoading && (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={BRAND_COLOR} />
              <ThemedText style={[styles.loadingText, { color: textSecondary }]}>
                Loading credentials...
              </ThemedText>
            </View>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <View style={styles.centerContainer}>
              <View
                style={[
                  styles.errorIconContainer,
                  { backgroundColor: withAlpha(StatusColors.error, 0.1) },
                ]}
              >
                <IconSymbol
                  name="exclamationmark.triangle"
                  size={32}
                  color={StatusColors.error}
                />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.errorTitle}>
                Failed to Load Credentials
              </ThemedText>
              <ThemedText style={[styles.errorMessage, { color: textSecondary }]}>
                {error.message || "An error occurred while fetching credentials."}
              </ThemedText>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: BRAND_COLOR }]}
                onPress={handleRetry}
              >
                <IconSymbol name="arrow.clockwise" size={18} color="white" />
                <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Credentials Display */}
          {credentials && !isLoading && (
            <>
              {/* Registration Code Section - Primary connection method */}
              <View style={[styles.registrationCodeSection, { backgroundColor: cardBg, borderColor }]}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Registration Code
                </ThemedText>
                <ThemedText style={[styles.sectionDescription, { color: textSecondary }]}>
                  Enter this 6-digit code on your booth touchscreen to connect.
                </ThemedText>

                {currentCode ? (
                  <>
                    <TouchableOpacity 
                      style={[styles.registrationCodeBox, { backgroundColor: withAlpha(BRAND_COLOR, 0.15), borderColor: BRAND_COLOR }]}
                      onPress={handleCopyCode}
                    >
                      <ThemedText style={styles.registrationCodeText}>
                        {currentCode}
                      </ThemedText>
                      <IconSymbol name="doc.on.doc" size={20} color={BRAND_COLOR} />
                    </TouchableOpacity>

                    {currentExpiry && (
                      <ThemedText style={[styles.expirationHint, { color: textSecondary }]}>
                        Valid until: {new Date(currentExpiry).toLocaleString()}
                      </ThemedText>
                    )}
                  </>
                ) : (
                  <View style={[styles.noCodeBox, { backgroundColor: withAlpha(borderColor, 0.3) }]}>
                    <ThemedText style={[styles.noCodeText, { color: textSecondary }]}>
                      No active code
                    </ThemedText>
                  </View>
                )}

                {/* Generate New Code Button */}
                <TouchableOpacity 
                  style={[
                    styles.generateButton, 
                    { backgroundColor: BRAND_COLOR },
                    generateCodeMutation.isPending && styles.generateButtonDisabled,
                  ]}
                  onPress={handleGenerateCode}
                  disabled={generateCodeMutation.isPending}
                >
                  {generateCodeMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <IconSymbol name="arrow.clockwise" size={18} color="white" />
                  )}
                  <ThemedText style={styles.generateButtonText}>
                    {generateCodeMutation.isPending ? "Generating..." : "Generate New Code"}
                  </ThemedText>
                </TouchableOpacity>

                <ThemedText style={[styles.codeInfoHint, { color: textSecondary }]}>
                  Codes are valid for 15 minutes and can only be used once.
                </ThemedText>
              </View>

              {/* API Key Section */}
              <View style={[styles.apiKeySection, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.apiKeyHeader}>
                  <View>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                      API Key
                    </ThemedText>
                    <ThemedText style={[styles.sectionDescription, { color: textSecondary }]}>
                      Use this key for manual configuration.
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    style={[styles.copyButton, { backgroundColor: withAlpha(BRAND_COLOR, 0.1) }]}
                    onPress={handleCopyApiKey}
                  >
                    <IconSymbol name="doc.on.doc" size={16} color={BRAND_COLOR} />
                    <ThemedText style={[styles.copyButtonText, { color: BRAND_COLOR }]}>
                      Copy
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={[styles.apiKeyBox, { backgroundColor: withAlpha(borderColor, 0.3) }]}>
                  <ThemedText style={styles.apiKeyText} numberOfLines={1} ellipsizeMode="middle">
                    {credentials.api_key}
                  </ThemedText>
                </View>
              </View>

              {/* Instructions */}
              <View style={[styles.instructionsSection, { backgroundColor: cardBg, borderColor }]}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  How to Connect
                </ThemedText>

                <View style={styles.instructionsList}>
                  <View style={styles.instructionItem}>
                    <View style={[styles.instructionNumber, { backgroundColor: BRAND_COLOR }]}>
                      <ThemedText style={styles.instructionNumberText}>1</ThemedText>
                    </View>
                    <ThemedText style={[styles.instructionText, { color: textSecondary }]}>
                      Open the PhotoBooth application on your booth PC.
                    </ThemedText>
                  </View>

                  <View style={styles.instructionItem}>
                    <View style={[styles.instructionNumber, { backgroundColor: BRAND_COLOR }]}>
                      <ThemedText style={styles.instructionNumberText}>2</ThemedText>
                    </View>
                    <ThemedText style={[styles.instructionText, { color: textSecondary }]}>
                      Go to Settings → Connection and enter the 6-digit code shown above.
                    </ThemedText>
                  </View>

                  <View style={styles.instructionItem}>
                    <View style={[styles.instructionNumber, { backgroundColor: BRAND_COLOR }]}>
                      <ThemedText style={styles.instructionNumberText}>3</ThemedText>
                    </View>
                    <ThemedText style={[styles.instructionText, { color: textSecondary }]}>
                      Your booth will connect automatically once the code is verified.
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Warning Notice */}
              <View
                style={[
                  styles.warningNotice,
                  {
                    backgroundColor: withAlpha(StatusColors.warning, 0.1),
                    borderColor: StatusColors.warning,
                  },
                ]}
              >
                <IconSymbol name="exclamationmark.triangle" size={20} color={StatusColors.warning} />
                <ThemedText style={[styles.warningText, { color: textSecondary }]}>
                  Keep these credentials secure. Anyone with access can control your booth.
                </ThemedText>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: 16,
    marginBottom: Spacing.xs,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  retryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  // Registration Code Section
  registrationCodeSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  registrationCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  registrationCodeText: {
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 4,
    fontFamily: "monospace",
    paddingVertical: 2,
    marginTop:4
  },
  expirationHint: {
    fontSize: 11,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  noCodeBox: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    alignItems: "center",
  },
  noCodeText: {
    fontSize: 14,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  codeInfoHint: {
    fontSize: 11,
    marginTop: Spacing.sm,
    textAlign: "center",
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  // API Key Section
  apiKeySection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  apiKeyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  apiKeyBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  apiKeyText: {
    fontFamily: "monospace",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  // Instructions Section
  instructionsSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  instructionsList: {
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  instructionNumberText: {
    color: "white",
    fontSize: 13,
    fontWeight: "bold",
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    paddingTop: 2,
  },
  // Warning Notice
  warningNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});

