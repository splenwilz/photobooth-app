/**
 * Connection Details Modal
 *
 * Displays booth connection credentials (API key and QR code) for reconnection.
 * Shows large QR code for easy scanning and copyable API key.
 *
 * @see GET /api/v1/booths/{booth_id}/credentials
 */

import * as Clipboard from "expo-clipboard";
import React, { useCallback } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBoothCredentials } from "@/api/booths";
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

  // Fetch credentials from API
  // @see GET /api/v1/booths/{booth_id}/credentials
  const {
    data: credentials,
    isLoading,
    error,
    refetch,
  } = useBoothCredentials(visible ? boothId : null);

  // Debug: Log credentials response to check QR code format
  React.useEffect(() => {
    if (credentials) {
      console.log("[ConnectionDetailsModal] Credentials loaded:", {
        id: credentials.id,
        api_key: credentials.api_key ? "***" : "missing",
        qr_code_length: credentials.qr_code?.length ?? 0,
        qr_code_prefix: credentials.qr_code?.substring(0, 30) ?? "missing",
      });
    }
  }, [credentials]);

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
              {/* QR Code Section */}
              <View style={[styles.qrSection, { backgroundColor: cardBg, borderColor }]}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Scan QR Code
                </ThemedText>
                <ThemedText style={[styles.sectionDescription, { color: textSecondary }]}>
                  Open the PhotoBooth app on your booth PC and scan this code to connect.
                </ThemedText>

                <View style={styles.qrContainer}>
                  {credentials.qr_code ? (
                    <Image
                      source={{
                        // Handle both raw base64 and data URI formats
                        uri: credentials.qr_code.startsWith("data:")
                          ? credentials.qr_code
                          : `data:image/png;base64,${credentials.qr_code}`,
                      }}
                      style={styles.qrImage}
                      resizeMode="contain"
                      onError={(e) => {
                        console.error("[ConnectionDetailsModal] QR image error:", e.nativeEvent.error);
                        console.log("[ConnectionDetailsModal] QR code prefix:", credentials.qr_code.substring(0, 50));
                      }}
                    />
                  ) : (
                    <View style={[styles.qrPlaceholder, { borderColor }]}>
                      <IconSymbol name="qrcode" size={48} color={textSecondary} />
                      <ThemedText style={[styles.qrPlaceholderText, { color: textSecondary }]}>
                        QR code not available
                      </ThemedText>
                    </View>
                  )}
                </View>
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
                      Open the PhotoBooth desktop application on your booth PC.
                    </ThemedText>
                  </View>

                  <View style={styles.instructionItem}>
                    <View style={[styles.instructionNumber, { backgroundColor: BRAND_COLOR }]}>
                      <ThemedText style={styles.instructionNumberText}>2</ThemedText>
                    </View>
                    <ThemedText style={[styles.instructionText, { color: textSecondary }]}>
                      Go to Settings → Connection and select &quot;Scan QR Code&quot;.
                    </ThemedText>
                  </View>

                  <View style={styles.instructionItem}>
                    <View style={[styles.instructionNumber, { backgroundColor: BRAND_COLOR }]}>
                      <ThemedText style={styles.instructionNumberText}>3</ThemedText>
                    </View>
                    <ThemedText style={[styles.instructionText, { color: textSecondary }]}>
                      Point your webcam at the QR code above to connect automatically.
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
  // QR Code Section
  qrSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
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
  qrContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  qrImage: {
    width: 250,
    height: 250,
  },
  qrPlaceholder: {
    width: 250,
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
  },
  qrPlaceholderText: {
    marginTop: Spacing.sm,
    fontSize: 13,
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

