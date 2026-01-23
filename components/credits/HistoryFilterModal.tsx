/**
 * History Filter Modal
 *
 * Modal for filtering credit history transactions.
 */

import type {
	CreditSourceFilter,
	CreditTransactionType,
} from "@/api/credits/types";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useEffect, useState } from "react";
import {
	Modal,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";

// Filter types
type TransactionFilter = "all" | CreditTransactionType;
type SourceFilter = "all" | CreditSourceFilter;
type DateRangeFilter = "all" | "today" | "7days" | "30days";

interface FilterState {
	transactionFilter: TransactionFilter;
	sourceFilter: SourceFilter;
	dateFilter: DateRangeFilter;
}

interface HistoryFilterModalProps {
	visible: boolean;
	filters: FilterState;
	onClose: () => void;
	onApply: (filters: FilterState) => void;
}

export function HistoryFilterModal({
	visible,
	filters,
	onClose,
	onApply,
}: HistoryFilterModalProps) {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	// Local state for filters (applied on "Apply" button)
	const [localFilters, setLocalFilters] = useState<FilterState>(filters);

	// Reset local state when modal opens
	useEffect(() => {
		if (visible) {
			setLocalFilters(filters);
		}
	}, [visible, filters]);

	const transactionOptions: { value: TransactionFilter; label: string }[] = [
		{ value: "all", label: "All Types" },
		{ value: "Add", label: "Added" },
		{ value: "Deduct", label: "Deducted" },
		{ value: "Reset", label: "Reset" },
	];

	const sourceOptions: { value: SourceFilter; label: string }[] = [
		{ value: "all", label: "All Sources" },
		{ value: "cloud", label: "Mobile App" },
		{ value: "booth_admin", label: "Booth Admin" },
		{ value: "booth_pcb", label: "PCB Payment" },
		{ value: "booth_system", label: "System" },
	];

	const dateOptions: { value: DateRangeFilter; label: string }[] = [
		{ value: "all", label: "All Time" },
		{ value: "today", label: "Today" },
		{ value: "7days", label: "Last 7 Days" },
		{ value: "30days", label: "Last 30 Days" },
	];

	const hasActiveFilters =
		localFilters.transactionFilter !== "all" ||
		localFilters.sourceFilter !== "all" ||
		localFilters.dateFilter !== "all";

	const handleClearAll = () => {
		setLocalFilters({
			transactionFilter: "all",
			sourceFilter: "all",
			dateFilter: "all",
		});
	};

	const handleApply = () => {
		onApply(localFilters);
		onClose();
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<View
					style={[
						styles.modalContainer,
						{ backgroundColor, borderColor },
					]}
				>
					{/* Header */}
					<View style={[styles.header, { borderColor }]}>
						<ThemedText type="subtitle" style={styles.title}>
							Filter Transactions
						</ThemedText>
						<TouchableOpacity
							onPress={onClose}
							hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						>
							<IconSymbol name="xmark" size={20} color={textSecondary} />
						</TouchableOpacity>
					</View>

					{/* Content */}
					<ScrollView
						style={styles.content}
						showsVerticalScrollIndicator={false}
					>
						{/* Transaction Type */}
						<View style={styles.filterSection}>
							<ThemedText
								type="defaultSemiBold"
								style={styles.sectionTitle}
							>
								Transaction Type
							</ThemedText>
							<View style={styles.optionsGrid}>
								{transactionOptions.map((option) => {
									const isActive =
										localFilters.transactionFilter === option.value;
									return (
										<TouchableOpacity
											key={option.value}
											style={[
												styles.optionButton,
												{
													backgroundColor: isActive
														? BRAND_COLOR
														: cardBg,
													borderColor: isActive
														? BRAND_COLOR
														: borderColor,
												},
											]}
											onPress={() =>
												setLocalFilters((prev) => ({
													...prev,
													transactionFilter: option.value,
												}))
											}
											activeOpacity={0.7}
										>
											<ThemedText
												style={[
													styles.optionText,
													{ color: isActive ? "white" : textSecondary },
												]}
											>
												{option.label}
											</ThemedText>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>

						{/* Source */}
						<View style={styles.filterSection}>
							<ThemedText
								type="defaultSemiBold"
								style={styles.sectionTitle}
							>
								Source
							</ThemedText>
							<View style={styles.optionsGrid}>
								{sourceOptions.map((option) => {
									const isActive = localFilters.sourceFilter === option.value;
									return (
										<TouchableOpacity
											key={option.value}
											style={[
												styles.optionButton,
												{
													backgroundColor: isActive
														? BRAND_COLOR
														: cardBg,
													borderColor: isActive
														? BRAND_COLOR
														: borderColor,
												},
											]}
											onPress={() =>
												setLocalFilters((prev) => ({
													...prev,
													sourceFilter: option.value,
												}))
											}
											activeOpacity={0.7}
										>
											<ThemedText
												style={[
													styles.optionText,
													{ color: isActive ? "white" : textSecondary },
												]}
											>
												{option.label}
											</ThemedText>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>

						{/* Date Range */}
						<View style={styles.filterSection}>
							<ThemedText
								type="defaultSemiBold"
								style={styles.sectionTitle}
							>
								Date Range
							</ThemedText>
							<View style={styles.optionsGrid}>
								{dateOptions.map((option) => {
									const isActive = localFilters.dateFilter === option.value;
									return (
										<TouchableOpacity
											key={option.value}
											style={[
												styles.optionButton,
												{
													backgroundColor: isActive
														? BRAND_COLOR
														: cardBg,
													borderColor: isActive
														? BRAND_COLOR
														: borderColor,
												},
											]}
											onPress={() =>
												setLocalFilters((prev) => ({
													...prev,
													dateFilter: option.value,
												}))
											}
											activeOpacity={0.7}
										>
											<ThemedText
												style={[
													styles.optionText,
													{ color: isActive ? "white" : textSecondary },
												]}
											>
												{option.label}
											</ThemedText>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>
					</ScrollView>

					{/* Footer */}
					<View style={[styles.footer, { borderColor }]}>
						{hasActiveFilters && (
							<TouchableOpacity
								style={[styles.clearButton, { borderColor }]}
								onPress={handleClearAll}
								activeOpacity={0.7}
							>
								<ThemedText
									style={[styles.clearButtonText, { color: textSecondary }]}
								>
									Clear All
								</ThemedText>
							</TouchableOpacity>
						)}
						<TouchableOpacity
							style={[
								styles.applyButton,
								{ backgroundColor: BRAND_COLOR },
								hasActiveFilters ? {} : { flex: 1 },
							]}
							onPress={handleApply}
							activeOpacity={0.7}
						>
							<ThemedText style={styles.applyButtonText}>
								Apply Filters
							</ThemedText>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "flex-end",
	},
	modalContainer: {
		borderTopLeftRadius: BorderRadius.xl,
		borderTopRightRadius: BorderRadius.xl,
		maxHeight: "80%",
		borderWidth: 1,
		borderBottomWidth: 0,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: Spacing.lg,
		borderBottomWidth: 1,
	},
	title: {
		fontSize: 18,
	},
	content: {
		padding: Spacing.lg,
	},
	filterSection: {
		marginBottom: Spacing.xl,
	},
	sectionTitle: {
		marginBottom: Spacing.sm,
	},
	optionsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
	},
	optionButton: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
	},
	optionText: {
		fontSize: 14,
		fontWeight: "500",
	},
	footer: {
		flexDirection: "row",
		padding: Spacing.lg,
		gap: Spacing.sm,
		borderTopWidth: 1,
	},
	clearButton: {
		flex: 1,
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		alignItems: "center",
	},
	clearButtonText: {
		fontSize: 14,
		fontWeight: "600",
	},
	applyButton: {
		flex: 2,
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.md,
		alignItems: "center",
	},
	applyButtonText: {
		color: "white",
		fontSize: 14,
		fontWeight: "600",
	},
});

export type { FilterState, TransactionFilter, SourceFilter, DateRangeFilter };
