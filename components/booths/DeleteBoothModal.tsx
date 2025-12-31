/**
 * Delete Booth Modal
 *
 * Confirmation modal for permanently deleting a booth.
 * Requires typing the booth name to confirm deletion for safety.
 *
 * @see DELETE /api/v1/booths/{booth_id}
 */

import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDeleteBooth } from "@/api/booths";
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

interface DeleteBoothModalProps {
  visible: boolean;
  boothId: string | null;
  boothName: string;
  onClose: () => void;
  onDeleted: () => void;
}

export const DeleteBoothModal: React.FC<DeleteBoothModalProps> = ({
  visible,
  boothId,
  boothName,
  onClose,
  onDeleted,
}) => {
  const backgroundColor = useThemeColor({}, "background");
  const cardBg = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "border");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textColor = useThemeColor({}, "text");

  // Confirmation input state
  const [confirmationText, setConfirmationText] = useState("");

  // Delete mutation
  const deleteBoothMutation = useDeleteBooth();

  // Check if confirmation matches booth name (case-insensitive)
  const isConfirmed = confirmationText.toLowerCase() === boothName.toLowerCase();

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setConfirmationText("");
    onClose();
  }, [onClose]);

  // Handle delete action
  const handleDelete = useCallback(() => {
    if (!boothId || !isConfirmed) return;

    deleteBoothMutation.mutate(
      { boothId },
      {
        onSuccess: () => {
          setConfirmationText("");
          onDeleted();
        },
        onError: (error) => {
          console.error("[DeleteBoothModal] Delete error:", error);
        },
      }
    );
  }, [boothId, isConfirmed, deleteBoothMutation, onDeleted]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modal, { backgroundColor: cardBg, borderColor }]}>
            {/* Icon */}
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: withAlpha(StatusColors.error, 0.1) },
              ]}
            >
              <IconSymbol
                name="exclamationmark.triangle.fill"
                size={32}
                color={StatusColors.error}
              />
            </View>

            {/* Title */}
            <ThemedText type="subtitle" style={styles.title}>
              Delete Booth?
            </ThemedText>

            {/* Warning Message */}
            <ThemedText style={[styles.message, { color: textSecondary }]}>
              This action cannot be undone. All data associated with{" "}
              <ThemedText type="defaultSemiBold">{boothName}</ThemedText> will be
              permanently deleted, including:
            </ThemedText>

            {/* What will be deleted */}
            <View style={styles.deleteList}>
              <View style={styles.deleteItem}>
                <IconSymbol name="chart.bar" size={16} color={StatusColors.error} />
                <ThemedText style={[styles.deleteItemText, { color: textSecondary }]}>
                  All revenue and transaction history
                </ThemedText>
              </View>
              <View style={styles.deleteItem}>
                <IconSymbol name="creditcard" size={16} color={StatusColors.error} />
                <ThemedText style={[styles.deleteItemText, { color: textSecondary }]}>
                  Credit balance and history
                </ThemedText>
              </View>
              <View style={styles.deleteItem}>
                <IconSymbol name="bell" size={16} color={StatusColors.error} />
                <ThemedText style={[styles.deleteItemText, { color: textSecondary }]}>
                  All alerts and notifications
                </ThemedText>
              </View>
              <View style={styles.deleteItem}>
                <IconSymbol name="gear" size={16} color={StatusColors.error} />
                <ThemedText style={[styles.deleteItemText, { color: textSecondary }]}>
                  Booth configuration and pricing
                </ThemedText>
              </View>
            </View>

            {/* Confirmation Input */}
            <View style={styles.confirmationSection}>
              <ThemedText style={[styles.confirmationLabel, { color: textSecondary }]}>
                Type <ThemedText type="defaultSemiBold">{boothName}</ThemedText> to
                confirm:
              </ThemedText>
              <TextInput
                style={[
                  styles.confirmationInput,
                  {
                    backgroundColor,
                    borderColor: isConfirmed ? StatusColors.error : borderColor,
                    color: textColor,
                  },
                ]}
                value={confirmationText}
                onChangeText={setConfirmationText}
                placeholder={boothName}
                placeholderTextColor={withAlpha(textSecondary, 0.5)}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!deleteBoothMutation.isPending}
              />
            </View>

            {/* Error Message */}
            {deleteBoothMutation.error && (
              <View
                style={[
                  styles.errorContainer,
                  { backgroundColor: withAlpha(StatusColors.error, 0.1) },
                ]}
              >
                <IconSymbol
                  name="exclamationmark.circle"
                  size={16}
                  color={StatusColors.error}
                />
                <ThemedText style={[styles.errorText, { color: StatusColors.error }]}>
                  {deleteBoothMutation.error.message || "Failed to delete booth"}
                </ThemedText>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor }]}
                onPress={handleClose}
                disabled={deleteBoothMutation.isPending}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  {
                    backgroundColor: isConfirmed
                      ? StatusColors.error
                      : withAlpha(StatusColors.error, 0.3),
                  },
                ]}
                onPress={handleDelete}
                disabled={!isConfirmed || deleteBoothMutation.isPending}
              >
                {deleteBoothMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <IconSymbol name="trash" size={18} color="white" />
                    <ThemedText style={styles.deleteButtonText}>
                      Delete Booth
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "100%",
    paddingHorizontal: Spacing.lg,
  },
  modal: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  deleteList: {
    alignSelf: "stretch",
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  deleteItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  deleteItemText: {
    fontSize: 13,
    flex: 1,
  },
  confirmationSection: {
    alignSelf: "stretch",
    marginBottom: Spacing.md,
  },
  confirmationLabel: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  confirmationInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignSelf: "stretch",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  deleteButton: {
    flex: 1.5,
    flexDirection: "row",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
});

