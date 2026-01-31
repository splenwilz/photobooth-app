/**
 * Ticket Detail Screen
 *
 * Displays a support ticket with conversation history.
 * Allows adding reply messages to open tickets.
 *
 * @see /api/tickets/queries.ts - useTicketDetail, useAddMessage
 */

import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Image,
	KeyboardAvoidingView,
	Platform,
	RefreshControl,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAddMessage, useGetUploadUrl, useTicketDetail } from "@/api/tickets";
import type {
	TicketMessage,
	TicketPriority,
	TicketStatus,
} from "@/api/tickets/types";
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

/**
 * Get status display info
 */
function getStatusInfo(status: TicketStatus): {
	label: string;
	color: string;
	icon: string;
} {
	switch (status) {
		case "open":
			return { label: "Open", color: StatusColors.info, icon: "envelope.open" };
		case "pending":
			return { label: "Pending", color: StatusColors.warning, icon: "clock" };
		case "in_progress":
			return {
				label: "In Progress",
				color: BRAND_COLOR,
				icon: "person.fill.checkmark",
			};
		case "resolved":
			return {
				label: "Resolved",
				color: StatusColors.success,
				icon: "checkmark.circle",
			};
		case "closed":
			return {
				label: "Closed",
				color: StatusColors.neutral,
				icon: "xmark.circle",
			};
		default:
			return { label: status, color: StatusColors.neutral, icon: "circle" };
	}
}

/**
 * Get priority display info
 */
function getPriorityInfo(priority: TicketPriority): {
	label: string;
	color: string;
} {
	switch (priority) {
		case "critical":
			return { label: "Critical", color: StatusColors.error };
		case "high":
			return { label: "High", color: StatusColors.warning };
		case "medium":
			return { label: "Medium", color: BRAND_COLOR };
		case "low":
			return { label: "Low", color: StatusColors.neutral };
		default:
			return { label: priority, color: StatusColors.neutral };
	}
}

/**
 * Format date for message timestamp
 */
function formatMessageTime(dateStr: string): string {
	const date = new Date(dateStr);
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();

	if (isToday) {
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}

	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	const isYesterday = date.toDateString() === yesterday.toDateString();

	if (isYesterday) {
		return `Yesterday ${date.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		})}`;
	}

	return `${date.toLocaleDateString([], {
		month: "short",
		day: "numeric",
	})} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * Message Bubble Component
 */
interface MessageBubbleProps {
	message: TicketMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	const isUser = message.sender_type === "user";

	return (
		<View
			style={[
				styles.messageBubble,
				isUser ? styles.userBubble : styles.adminBubble,
				{
					backgroundColor: isUser ? withAlpha(BRAND_COLOR, 0.1) : cardBg,
					borderColor: isUser ? withAlpha(BRAND_COLOR, 0.3) : borderColor,
				},
			]}
		>
			{/* Sender Info */}
			<View style={styles.messageHeader}>
				<View
					style={[
						styles.senderAvatar,
						{
							backgroundColor: isUser
								? withAlpha(BRAND_COLOR, 0.2)
								: withAlpha(StatusColors.success, 0.2),
						},
					]}
				>
					<IconSymbol
						name={isUser ? "person.fill" : "headphones"}
						size={14}
						color={isUser ? BRAND_COLOR : StatusColors.success}
					/>
				</View>
				<ThemedText type="defaultSemiBold" style={styles.senderName}>
					{message.sender_name}
				</ThemedText>
				<ThemedText style={[styles.messageTime, { color: textSecondary }]}>
					{formatMessageTime(message.created_at)}
				</ThemedText>
			</View>

			{/* Message Content */}
			<ThemedText style={styles.messageText}>{message.message}</ThemedText>

			{/* Attachments */}
			{message.attachments.length > 0 && (
				<View style={styles.attachments}>
					{message.attachments.map((attachment) => (
						<TouchableOpacity
							key={attachment.id}
							style={[styles.attachment, { borderColor }]}
							onPress={() => {
								// Open attachment URL in browser to view/download
								Linking.openURL(attachment.download_url);
							}}
						>
							<IconSymbol name="paperclip" size={14} color={textSecondary} />
							<ThemedText
								style={[styles.attachmentName, { color: BRAND_COLOR }]}
								numberOfLines={1}
							>
								{attachment.filename}
							</ThemedText>
						</TouchableOpacity>
					))}
				</View>
			)}
		</View>
	);
};

export default function TicketDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const parsed = id ? Number.parseInt(id, 10) : NaN;
	const ticketId = Number.isNaN(parsed) ? null : parsed;

	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");

	// Refs
	const flatListRef = useRef<FlatList>(null);
	const inputRef = useRef<TextInput>(null);

	// State
	const [replyText, setReplyText] = useState("");
	const [pendingAttachments, setPendingAttachments] = useState<
		{ uri: string; name: string; type: string }[]
	>([]);
	const [isUploading, setIsUploading] = useState(false);

	// API hooks
	const {
		data: ticket,
		isLoading,
		isRefetching,
		refetch,
	} = useTicketDetail(ticketId);
	const { mutate: addMessage, isPending: isSending } = useAddMessage();
	const { mutateAsync: getUploadUrl } = useGetUploadUrl();

	// Can reply to non-closed tickets
	const canReply = ticket && ticket.status !== "closed";

	// Navigation
	const handleBack = () => {
		router.back();
	};

	// Pull-to-refresh
	const onRefresh = useCallback(() => {
		refetch();
	}, [refetch]);

	// Pick image from library
	const handlePickImage = async () => {
		const permissionResult =
			await ImagePicker.requestMediaLibraryPermissionsAsync();

		if (!permissionResult.granted) {
			Alert.alert(
				"Permission Required",
				"Please allow access to your photo library to attach images.",
			);
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsMultipleSelection: false,
			quality: 0.8,
		});

		if (!result.canceled && result.assets[0]) {
			const asset = result.assets[0];
			const fileName = asset.fileName ?? `image_${Date.now()}.jpg`;
			const mimeType = asset.mimeType ?? "image/jpeg";

			setPendingAttachments((prev) => [
				...prev,
				{ uri: asset.uri, name: fileName, type: mimeType },
			]);
		}
	};

	// Remove pending attachment
	const handleRemoveAttachment = (index: number) => {
		setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
	};

	// Upload attachment to S3 and return s3_key
	const uploadAttachment = async (
		attachment: { uri: string; name: string; type: string },
	): Promise<string> => {
		if (!ticketId) throw new Error("No ticket ID");

		// Get presigned upload URL
		const { upload_url, s3_key } = await getUploadUrl({
			ticketId,
			data: { filename: attachment.name, content_type: attachment.type },
		});

		// Fetch the file and upload to S3
		const response = await fetch(attachment.uri);
		const blob = await response.blob();

		await fetch(upload_url, {
			method: "PUT",
			headers: { "Content-Type": attachment.type },
			body: blob,
		});

		return s3_key;
	};

	// Send reply with optional attachments
	const handleSendReply = async () => {
		if (!ticketId || (!replyText.trim() && pendingAttachments.length === 0) || isSending || isUploading) return;

		setIsUploading(true);

		try {
			// Upload all attachments first
			const s3Keys: string[] = [];
			for (const attachment of pendingAttachments) {
				const s3Key = await uploadAttachment(attachment);
				s3Keys.push(s3Key);
			}

			// Send message with attachments
			addMessage(
				{
					ticketId,
					data: {
						message: replyText.trim() || "Attachment",
						attachment_s3_keys: s3Keys.length > 0 ? s3Keys : undefined,
					},
				},
				{
					onSuccess: () => {
						setReplyText("");
						setPendingAttachments([]);
						// Scroll to bottom after new message
						setTimeout(() => {
							flatListRef.current?.scrollToEnd({ animated: true });
						}, 100);
					},
					onError: (error) => {
						Alert.alert("Error", "Failed to send message. Please try again.");
						console.error("[TicketDetail] Error sending message:", error);
					},
				},
			);
		} catch (error) {
			Alert.alert("Upload Failed", "Failed to upload attachment. Please try again.");
			console.error("[TicketDetail] Error uploading attachment:", error);
		} finally {
			setIsUploading(false);
		}
	};

	// Render message
	const renderMessage = useCallback(
		({ item }: { item: TicketMessage }) => <MessageBubble message={item} />,
		[],
	);

	// Header with ticket info
	const ListHeader = useMemo(() => {
		if (!ticket) return null;

		const statusInfo = getStatusInfo(ticket.status);
		const priorityInfo = getPriorityInfo(ticket.priority);

		return (
			<View style={styles.ticketHeader}>
				{/* Ticket Number & Status */}
				<View style={styles.ticketMeta}>
					<ThemedText style={[styles.ticketNumber, { color: textSecondary }]}>
						{ticket.ticket_number}
					</ThemedText>
					<View
						style={[
							styles.statusBadge,
							{ backgroundColor: withAlpha(statusInfo.color, 0.15) },
						]}
					>
						<IconSymbol
							name={statusInfo.icon as any}
							size={12}
							color={statusInfo.color}
						/>
						<ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
							{statusInfo.label}
						</ThemedText>
					</View>
				</View>

				{/* Subject */}
				<ThemedText type="subtitle" style={styles.ticketSubject}>
					{ticket.subject}
				</ThemedText>

				{/* Priority & Booth */}
				<View style={styles.ticketInfo}>
					<View
						style={[
							styles.priorityBadge,
							{ backgroundColor: withAlpha(priorityInfo.color, 0.15) },
						]}
					>
						<View
							style={[
								styles.priorityDot,
								{ backgroundColor: priorityInfo.color },
							]}
						/>
						<ThemedText
							style={[styles.priorityText, { color: priorityInfo.color }]}
						>
							{priorityInfo.label} Priority
						</ThemedText>
					</View>
					{ticket.booth && (
						<View style={[styles.boothBadge, { backgroundColor: cardBg }]}>
							<IconSymbol name="photo.stack" size={12} color={textSecondary} />
							<ThemedText style={[styles.boothName, { color: textSecondary }]}>
								{ticket.booth.name}
							</ThemedText>
						</View>
					)}
				</View>

				{/* Divider */}
				<View style={[styles.divider, { backgroundColor: borderColor }]} />

				{/* Conversation Label */}
				<ThemedText style={[styles.conversationLabel, { color: textSecondary }]}>
					Conversation
				</ThemedText>
			</View>
		);
	}, [ticket, textSecondary, cardBg, borderColor]);

	// Loading state
	if (isLoading) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor }]}>
				<View style={styles.header}>
					<TouchableOpacity onPress={handleBack} style={styles.backButton}>
						<IconSymbol name="chevron.left" size={24} color={BRAND_COLOR} />
					</TouchableOpacity>
					<View style={styles.headerTextContainer}>
						<ThemedText type="title" style={styles.title}>
							Loading...
						</ThemedText>
					</View>
				</View>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
				</View>
			</SafeAreaView>
		);
	}

	// Not found state
	if (!ticket) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor }]}>
				<View style={styles.header}>
					<TouchableOpacity onPress={handleBack} style={styles.backButton}>
						<IconSymbol name="chevron.left" size={24} color={BRAND_COLOR} />
					</TouchableOpacity>
					<View style={styles.headerTextContainer}>
						<ThemedText type="title" style={styles.title}>
							Ticket Not Found
						</ThemedText>
					</View>
				</View>
				<View style={styles.emptyContainer}>
					<ThemedText style={{ color: textSecondary }}>
						This ticket could not be found.
					</ThemedText>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor }]} edges={["top"]}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={handleBack} style={styles.backButton}>
					<IconSymbol name="chevron.left" size={24} color={BRAND_COLOR} />
				</TouchableOpacity>
				<View style={styles.headerTextContainer}>
					<ThemedText type="title" style={styles.title}>
						Ticket Details
					</ThemedText>
				</View>
			</View>

			<KeyboardAvoidingView
				style={styles.keyboardView}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={0}
			>
				{/* Messages List */}
				<FlatList
					ref={flatListRef}
					data={ticket.messages}
					renderItem={renderMessage}
					keyExtractor={(item) => item.id.toString()}
					ListHeaderComponent={ListHeader}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={isRefetching}
							onRefresh={onRefresh}
							tintColor={BRAND_COLOR}
							colors={[BRAND_COLOR]}
						/>
					}
					onContentSizeChange={() => {
						// Scroll to bottom when new messages arrive
						flatListRef.current?.scrollToEnd({ animated: false });
					}}
				/>

				{/* Reply Input */}
				{canReply ? (
					<View
						style={[
							styles.replyContainer,
							{ backgroundColor: cardBg, borderColor },
						]}
					>
						{/* Pending Attachments Preview */}
						{pendingAttachments.length > 0 && (
							<View style={styles.attachmentsPreview}>
								{pendingAttachments.map((attachment, index) => (
									<View key={index} style={styles.attachmentPreviewItem}>
										<Image
											source={{ uri: attachment.uri }}
											style={styles.attachmentPreviewImage}
										/>
										<TouchableOpacity
											style={styles.removeAttachmentButton}
											onPress={() => handleRemoveAttachment(index)}
										>
											<IconSymbol name="xmark.circle.fill" size={20} color={StatusColors.error} />
										</TouchableOpacity>
									</View>
								))}
							</View>
						)}

						{/* Input Row */}
						<View style={styles.inputRow}>
							{/* Attachment Button */}
							<TouchableOpacity
								style={styles.attachButton}
								onPress={handlePickImage}
								disabled={isUploading || isSending}
							>
								<IconSymbol
									name="paperclip"
									size={22}
									color={isUploading ? textSecondary : BRAND_COLOR}
								/>
							</TouchableOpacity>

							<TextInput
								ref={inputRef}
								style={[styles.replyInput, { color: textColor }]}
								placeholder="Type your reply..."
								placeholderTextColor={textSecondary}
								value={replyText}
								onChangeText={setReplyText}
								multiline
								maxLength={5000}
							/>

							<TouchableOpacity
								style={[
									styles.sendButton,
									{
										backgroundColor:
											(replyText.trim() || pendingAttachments.length > 0) && !isSending && !isUploading
												? BRAND_COLOR
												: withAlpha(BRAND_COLOR, 0.3),
									},
								]}
								onPress={handleSendReply}
								disabled={(!replyText.trim() && pendingAttachments.length === 0) || isSending || isUploading}
							>
								{isSending || isUploading ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									<IconSymbol name="arrow.up" size={20} color="white" />
								)}
							</TouchableOpacity>
						</View>
					</View>
				) : (
					<View
						style={[
							styles.closedBanner,
							{ backgroundColor: withAlpha(StatusColors.neutral, 0.1) },
						]}
					>
						<IconSymbol
							name="lock.fill"
							size={16}
							color={StatusColors.neutral}
						/>
						<ThemedText style={[styles.closedText, { color: textSecondary }]}>
							This ticket is closed and cannot receive new messages.
						</ThemedText>
					</View>
				)}
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
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
		fontSize: 20,
		fontWeight: "bold",
	},
	keyboardView: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	listContent: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.md,
	},
	ticketHeader: {
		marginBottom: Spacing.md,
	},
	ticketMeta: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: Spacing.xs,
	},
	ticketNumber: {
		fontSize: 13,
		fontWeight: "500",
	},
	statusBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.sm,
		gap: 4,
	},
	statusText: {
		fontSize: 11,
		fontWeight: "600",
	},
	ticketSubject: {
		fontSize: 18,
		fontWeight: "600",
		marginBottom: Spacing.sm,
	},
	ticketInfo: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.xs,
	},
	priorityBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.sm,
		gap: 6,
	},
	priorityDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	priorityText: {
		fontSize: 11,
		fontWeight: "500",
	},
	boothBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.sm,
		paddingVertical: 4,
		borderRadius: BorderRadius.sm,
		gap: 4,
	},
	boothName: {
		fontSize: 11,
	},
	divider: {
		height: 1,
		marginVertical: Spacing.md,
	},
	conversationLabel: {
		fontSize: 12,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	messageBubble: {
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		padding: Spacing.md,
		marginTop: Spacing.sm,
	},
	userBubble: {
		marginLeft: Spacing.lg,
	},
	adminBubble: {
		marginRight: Spacing.lg,
	},
	messageHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: Spacing.xs,
		gap: Spacing.xs,
	},
	senderAvatar: {
		width: 24,
		height: 24,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
	},
	senderName: {
		flex: 1,
		fontSize: 13,
	},
	messageTime: {
		fontSize: 11,
	},
	messageText: {
		fontSize: 14,
		lineHeight: 20,
	},
	attachments: {
		marginTop: Spacing.sm,
		gap: Spacing.xs,
	},
	attachment: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.sm,
		borderRadius: BorderRadius.sm,
		borderWidth: 1,
		gap: Spacing.xs,
	},
	attachmentName: {
		flex: 1,
		fontSize: 12,
	},
	replyContainer: {
		padding: Spacing.md,
		borderTopWidth: 1,
	},
	attachmentsPreview: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
		marginBottom: Spacing.sm,
	},
	attachmentPreviewItem: {
		position: "relative",
	},
	attachmentPreviewImage: {
		width: 60,
		height: 60,
		borderRadius: BorderRadius.sm,
	},
	removeAttachmentButton: {
		position: "absolute",
		top: -8,
		right: -8,
		backgroundColor: "white",
		borderRadius: 10,
	},
	inputRow: {
		flexDirection: "row",
		alignItems: "flex-end",
		gap: Spacing.sm,
	},
	attachButton: {
		width: 40,
		height: 40,
		justifyContent: "center",
		alignItems: "center",
	},
	replyInput: {
		flex: 1,
		maxHeight: 100,
		fontSize: 15,
		lineHeight: 20,
		paddingVertical: Spacing.sm,
	},
	sendButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	closedBanner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing.md,
		gap: Spacing.xs,
	},
	closedText: {
		fontSize: 13,
	},
});
