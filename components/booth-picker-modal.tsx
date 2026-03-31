/**
 * BoothPickerModal
 *
 * Global booth picker modal for switching between booths from any screen.
 * Follows the Shopify/Toast/Notion pattern — a page-sheet modal with
 * booth list, "All Booths" aggregate option, and search filtering.
 *
 * @see components/licensing/BoothSelectionModal.tsx - Similar modal pattern
 * @see stores/booth-store.ts - Global booth selection state
 */

import { useMemo, useState } from "react";
import {
	FlatList,
	Modal,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBoothOverview } from "@/api/booths/queries";
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
import { ALL_BOOTHS_ID, useBoothStore } from "@/stores/booth-store";

interface BoothPickerModalProps {
	visible: boolean;
	onClose: () => void;
}

export function BoothPickerModal({ visible, onClose }: BoothPickerModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");
	const textColor = useThemeColor({}, "text");

	const { selectedBoothId, setSelectedBoothId } = useBoothStore();
	const { data: boothData } = useBoothOverview({ enabled: visible });

	const [searchQuery, setSearchQuery] = useState("");

	const summary = boothData?.summary;

	const filteredBooths = useMemo(() => {
		const booths = boothData?.booths ?? [];
		if (!searchQuery) return booths;
		const query = searchQuery.toLowerCase();
		return booths.filter(
			(booth) =>
				booth.booth_name.toLowerCase().includes(query) ||
				(booth.booth_address?.toLowerCase().includes(query) ?? false),
		);
	}, [boothData?.booths, searchQuery]);

	const handleSelect = (boothId: string) => {
		setSelectedBoothId(boothId);
		setSearchQuery("");
		onClose();
	};

	const handleClose = () => {
		setSearchQuery("");
		onClose();
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={handleClose}
		>
			<SafeAreaView style={[styles.container, { backgroundColor }]}>
				{/* Header */}
				<View style={[styles.header, { borderBottomColor: borderColor }]}>
					<ThemedText type="subtitle">Switch Booth</ThemedText>
					<TouchableOpacity
						onPress={handleClose}
						hitSlop={8}
						testID="close-button"
					>
						<IconSymbol name="xmark" size={20} color={textSecondary} />
					</TouchableOpacity>
				</View>

				{/* Search */}
				<View style={styles.searchContainer}>
					<View
						style={[
							styles.searchBar,
							{ backgroundColor: cardBg, borderColor },
						]}
					>
						<IconSymbol
							name="magnifyingglass"
							size={16}
							color={textSecondary}
						/>
						<TextInput
							style={[styles.searchInput, { color: textColor }]}
							placeholder="Search booths..."
							placeholderTextColor={textSecondary}
							value={searchQuery}
							onChangeText={setSearchQuery}
							testID="search-input"
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity onPress={() => setSearchQuery("")}>
								<IconSymbol name="xmark" size={16} color={textSecondary} />
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Booth List */}
				<FlatList
					data={filteredBooths}
					keyExtractor={(item) => item.booth_id}
					contentContainerStyle={styles.listContent}
					keyboardShouldPersistTaps="handled"
					ListHeaderComponent={
						// "All Booths" option — only show when not searching
						!searchQuery ? (
							<TouchableOpacity
								style={[
									styles.boothRow,
									{
										backgroundColor:
											selectedBoothId === ALL_BOOTHS_ID
												? withAlpha(BRAND_COLOR, 0.1)
												: cardBg,
										borderColor:
											selectedBoothId === ALL_BOOTHS_ID
												? BRAND_COLOR
												: borderColor,
									},
								]}
								onPress={() => handleSelect(ALL_BOOTHS_ID)}
								activeOpacity={0.7}
								testID="booth-option-all"
							>
								<View style={styles.boothRowLeft}>
									<View
										style={[
											styles.boothIcon,
											{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
										]}
									>
										<IconSymbol
											name="rectangle.stack"
											size={20}
											color={BRAND_COLOR}
										/>
									</View>
									<View style={styles.boothRowText}>
										<ThemedText type="defaultSemiBold">All Booths</ThemedText>
										{summary && (
											<ThemedText
												style={[styles.boothSubtext, { color: textSecondary }]}
											>
												{summary.online_count} online ·{" "}
												{summary.offline_count} offline
											</ThemedText>
										)}
									</View>
								</View>
								{selectedBoothId === ALL_BOOTHS_ID && (
									<View testID="checkmark-all">
										<IconSymbol
											name="checkmark.circle.fill"
											size={22}
											color={BRAND_COLOR}
										/>
									</View>
								)}
							</TouchableOpacity>
						) : null
					}
					renderItem={({ item }) => {
						const isSelected = selectedBoothId === item.booth_id;
						const statusColor =
							item.booth_status === "online"
								? StatusColors.success
								: item.booth_status === "warning"
									? StatusColors.warning
									: StatusColors.error;

						return (
							<TouchableOpacity
								style={[
									styles.boothRow,
									{
										backgroundColor: isSelected
											? withAlpha(BRAND_COLOR, 0.1)
											: cardBg,
										borderColor: isSelected ? BRAND_COLOR : borderColor,
									},
								]}
								onPress={() => handleSelect(item.booth_id)}
								activeOpacity={0.7}
								testID={`booth-option-${item.booth_id}`}
							>
								<View style={styles.boothRowLeft}>
									<View
										style={[
											styles.boothIcon,
											{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
										]}
									>
										<IconSymbol
											name="photo.stack"
											size={20}
											color={BRAND_COLOR}
										/>
									</View>
									<View style={styles.boothRowText}>
										<View style={styles.boothNameRow}>
											<ThemedText type="defaultSemiBold" numberOfLines={1}>
												{item.booth_name}
											</ThemedText>
											<View
												style={[
													styles.statusDot,
													{ backgroundColor: statusColor },
												]}
											/>
										</View>
										<ThemedText
											style={[styles.boothSubtext, { color: textSecondary }]}
											numberOfLines={1}
										>
											{item.booth_address || "No address"}
										</ThemedText>
									</View>
								</View>
								{isSelected && (
									<View testID={`checkmark-${item.booth_id}`}>
										<IconSymbol
											name="checkmark.circle.fill"
											size={22}
											color={BRAND_COLOR}
										/>
									</View>
								)}
							</TouchableOpacity>
						);
					}}
				/>
			</SafeAreaView>
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
	searchContainer: {
		padding: Spacing.lg,
		paddingBottom: Spacing.sm,
	},
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.sm,
		paddingHorizontal: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.sm,
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
		paddingVertical: Spacing.xs,
	},
	listContent: {
		padding: Spacing.lg,
		paddingTop: Spacing.sm,
		gap: Spacing.sm,
	},
	boothRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	boothRowLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		gap: Spacing.md,
	},
	boothIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	boothRowText: {
		flex: 1,
	},
	boothNameRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs,
	},
	boothSubtext: {
		fontSize: 13,
		marginTop: 2,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
});
