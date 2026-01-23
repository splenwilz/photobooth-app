/**
 * Booth Selection Modal
 *
 * Shows list of user's booths to select for activation after QR scan.
 * Displays subscription status for each booth.
 */

import { useBoothSubscriptions } from "@/api/payments";
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
import {
	ActivityIndicator,
	FlatList,
	Modal,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";

interface BoothSelectionModalProps {
	/** Whether modal is visible */
	visible: boolean;
	/** Callback when modal is closed */
	onClose: () => void;
	/** Callback when a booth is selected */
	onSelectBooth: (boothId: string, boothName: string) => void;
	/** Whether selection is in progress */
	isSelecting?: boolean;
	/** Currently selected booth ID (for loading state) */
	selectedBoothId?: string | null;
}

export function BoothSelectionModal({
	visible,
	onClose,
	onSelectBooth,
	isSelecting = false,
	selectedBoothId = null,
}: BoothSelectionModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	const { data: subscriptions, isLoading } = useBoothSubscriptions();

	const booths = subscriptions?.items ?? [];

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<View style={[styles.container, { backgroundColor }]}>
				{/* Header */}
				<View style={[styles.header, { borderColor }]}>
					<ThemedText type="subtitle">Select Booth to Activate</ThemedText>
					<TouchableOpacity onPress={onClose} hitSlop={8} disabled={isSelecting}>
						<IconSymbol name="xmark" size={20} color={textSecondary} />
					</TouchableOpacity>
				</View>

				{/* Instructions */}
				<View style={styles.instructions}>
					<View
						style={[
							styles.instructionIcon,
							{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
						]}
					>
						<IconSymbol name="qrcode.viewfinder" size={24} color={BRAND_COLOR} />
					</View>
					<ThemedText style={[styles.instructionText, { color: textSecondary }]}>
						Choose which booth to activate on this device. Booths need an active
						subscription to be activated.
					</ThemedText>
				</View>

				{/* Loading State */}
				{isLoading && (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={BRAND_COLOR} />
						<ThemedText style={[styles.loadingText, { color: textSecondary }]}>
							Loading your booths...
						</ThemedText>
					</View>
				)}

				{/* Empty State */}
				{!isLoading && booths.length === 0 && (
					<View style={styles.emptyContainer}>
						<View
							style={[
								styles.emptyIcon,
								{ backgroundColor: withAlpha(StatusColors.warning, 0.15) },
							]}
						>
							<IconSymbol
								name="photo.stack"
								size={48}
								color={StatusColors.warning}
							/>
						</View>
						<ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
							No Booths Found
						</ThemedText>
						<ThemedText style={[styles.emptyText, { color: textSecondary }]}>
							You don&apos;t have any booths yet. Create a booth first, then come
							back to activate it.
						</ThemedText>
						<TouchableOpacity
							style={[styles.button, { backgroundColor: BRAND_COLOR }]}
							onPress={onClose}
						>
							<ThemedText style={styles.buttonText}>Close</ThemedText>
						</TouchableOpacity>
					</View>
				)}

				{/* Booth List */}
				{!isLoading && booths.length > 0 && (
					<FlatList
						data={booths}
						keyExtractor={(item) => item.booth_id}
						contentContainerStyle={styles.listContent}
						renderItem={({ item }) => {
							const isActive = item.is_active;
							const isCurrentlySelected = selectedBoothId === item.booth_id;
							const isDisabled = isSelecting && !isCurrentlySelected;

							return (
								<TouchableOpacity
									style={[
										styles.boothItem,
										{
											backgroundColor: cardBg,
											borderColor: isCurrentlySelected ? BRAND_COLOR : borderColor,
											borderWidth: isCurrentlySelected ? 2 : 1,
											opacity: isDisabled ? 0.5 : 1,
										},
									]}
									onPress={() => onSelectBooth(item.booth_id, item.booth_name)}
									disabled={isSelecting}
									activeOpacity={0.7}
								>
									<View style={styles.boothInfo}>
										<ThemedText type="defaultSemiBold" style={styles.boothName}>
											{item.booth_name}
										</ThemedText>
										<View style={styles.subscriptionRow}>
											{isActive ? (
												<>
													<IconSymbol
														name="checkmark.circle.fill"
														size={14}
														color={StatusColors.success}
													/>
													<ThemedText
														style={[
															styles.subscriptionText,
															{ color: StatusColors.success },
														]}
													>
														Subscribed
													</ThemedText>
												</>
											) : (
												<>
													<IconSymbol
														name="exclamationmark.triangle"
														size={14}
														color={StatusColors.warning}
													/>
													<ThemedText
														style={[
															styles.subscriptionText,
															{ color: StatusColors.warning },
														]}
													>
														No subscription
													</ThemedText>
												</>
											)}
										</View>
									</View>

									{/* Selection/Loading indicator */}
									<View style={styles.boothAction}>
										{isCurrentlySelected && isSelecting ? (
											<ActivityIndicator size="small" color={BRAND_COLOR} />
										) : (
											<IconSymbol
												name="chevron.right"
												size={20}
												color={textSecondary}
											/>
										)}
									</View>
								</TouchableOpacity>
							);
						}}
					/>
				)}
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: Spacing.lg,
		borderBottomWidth: 1,
	},
	instructions: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: Spacing.lg,
		gap: Spacing.md,
	},
	instructionIcon: {
		width: 48,
		height: 48,
		borderRadius: 24,
		justifyContent: "center",
		alignItems: "center",
	},
	instructionText: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: Spacing.md,
	},
	loadingText: {
		fontSize: 14,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing.xl,
		gap: Spacing.md,
	},
	emptyIcon: {
		width: 96,
		height: 96,
		borderRadius: 48,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.md,
	},
	emptyTitle: {
		fontSize: 18,
		textAlign: "center",
	},
	emptyText: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
	},
	button: {
		paddingVertical: Spacing.md,
		paddingHorizontal: Spacing.xl,
		borderRadius: BorderRadius.lg,
		marginTop: Spacing.md,
	},
	buttonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
	listContent: {
		padding: Spacing.lg,
		gap: Spacing.sm,
	},
	boothItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		marginBottom: Spacing.sm,
	},
	boothInfo: {
		flex: 1,
	},
	boothName: {
		fontSize: 16,
		marginBottom: 4,
	},
	subscriptionRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	subscriptionText: {
		fontSize: 13,
	},
	boothAction: {
		width: 32,
		alignItems: "center",
	},
});
