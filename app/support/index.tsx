/**
 * Support Tickets List Screen
 *
 * Displays user's support tickets with status filtering.
 * Allows creating new tickets and viewing ticket details.
 *
 * @see /api/tickets/queries.ts - useTickets
 */

import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTickets } from "@/api/tickets";
import type { TicketListItem, TicketStatus } from "@/api/tickets/types";
import { TicketCard } from "@/components/tickets";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * Status filter options
 */
const STATUS_FILTERS: { label: string; value: TicketStatus | "all" }[] = [
	{ label: "All", value: "all" },
	{ label: "Open", value: "open" },
	{ label: "Pending", value: "pending" },
	{ label: "In Progress", value: "in_progress" },
	{ label: "Resolved", value: "resolved" },
	{ label: "Closed", value: "closed" },
];

export default function SupportTicketsScreen() {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	// Filter state
	const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");

	// Manual refresh state - separate from query state to avoid spinner on filter change
	const [isManualRefreshing, setIsManualRefreshing] = useState(false);

	// Fetch tickets
	const {
		data: ticketsData,
		isLoading,
		refetch,
	} = useTickets({ status: statusFilter });

	// Show loading only on initial load with no data
	const showFullScreenLoading = isLoading && !ticketsData;

	// Navigation handlers
	const handleBack = () => {
		router.back();
	};

	const handleCreateTicket = () => {
		router.push("/support/create");
	};

	const handleTicketPress = (ticket: TicketListItem) => {
		router.push(`/support/${ticket.id}`);
	};

	// Pull-to-refresh with manual state management
	const onRefresh = useCallback(async () => {
		setIsManualRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsManualRefreshing(false);
		}
	}, [refetch]);

	// Render ticket item
	const renderTicket = useCallback(
		({ item }: { item: TicketListItem }) => (
			<TicketCard ticket={item} onPress={() => handleTicketPress(item)} />
		),
		[],
	);

	// Empty state
	const EmptyState = useMemo(
		() => (
			<View style={styles.emptyState}>
				<View
					style={[
						styles.emptyIcon,
						{ backgroundColor: withAlpha(BRAND_COLOR, 0.1) },
					]}
				>
					<IconSymbol name="ticket" size={48} color={BRAND_COLOR} />
				</View>
				<ThemedText type="subtitle" style={styles.emptyTitle}>
					No Tickets Found
				</ThemedText>
				<ThemedText style={[styles.emptySubtitle, { color: textSecondary }]}>
					{statusFilter === "all"
						? "You haven't created any support tickets yet."
						: `No tickets with status "${statusFilter}".`}
				</ThemedText>
				<TouchableOpacity
					style={[styles.emptyButton, { backgroundColor: BRAND_COLOR }]}
					onPress={handleCreateTicket}
				>
					<IconSymbol name="plus" size={18} color="white" />
					<ThemedText style={styles.emptyButtonText}>
						Create Your First Ticket
					</ThemedText>
				</TouchableOpacity>
			</View>
		),
		[statusFilter, textSecondary],
	);

	return (
		<SafeAreaView style={[styles.container, { backgroundColor }]}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={handleBack} style={styles.backButton}>
					<IconSymbol name="chevron.left" size={24} color={BRAND_COLOR} />
				</TouchableOpacity>
				<View style={styles.headerTextContainer}>
					<ThemedText type="title" style={styles.title}>
						Support
					</ThemedText>
					<ThemedText style={[styles.subtitle, { color: textSecondary }]}>
						{ticketsData?.total ?? 0} ticket
						{ticketsData?.total !== 1 ? "s" : ""}
					</ThemedText>
				</View>
				<TouchableOpacity
					style={[styles.createButton, { backgroundColor: BRAND_COLOR }]}
					onPress={handleCreateTicket}
				>
					<IconSymbol name="plus" size={20} color="white" />
				</TouchableOpacity>
			</View>

			{/* Status Filter */}
			<View style={styles.filterContainer}>
				<FlatList
					data={STATUS_FILTERS}
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.filterList}
					keyExtractor={(item) => item.value}
					renderItem={({ item }) => {
						const isActive = statusFilter === item.value;
						return (
							<TouchableOpacity
								style={[
									styles.filterChip,
									{
										backgroundColor: isActive
											? BRAND_COLOR
											: withAlpha(BRAND_COLOR, 0.1),
									},
								]}
								onPress={() => setStatusFilter(item.value)}
							>
								<ThemedText
									style={[
										styles.filterChipText,
										{ color: isActive ? "white" : BRAND_COLOR },
									]}
								>
									{item.label}
								</ThemedText>
							</TouchableOpacity>
						);
					}}
				/>
			</View>

			{/* Ticket List */}
			{showFullScreenLoading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
				</View>
			) : (
				<FlatList
					data={ticketsData?.tickets ?? []}
					renderItem={renderTicket}
					keyExtractor={(item) => item.id.toString()}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
					ListEmptyComponent={EmptyState}
					refreshControl={
						<RefreshControl
							refreshing={isManualRefreshing}
							onRefresh={onRefresh}
							tintColor={BRAND_COLOR}
							colors={[BRAND_COLOR]}
						/>
					}
				/>
			)}
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
		fontSize: 24,
		fontWeight: "bold",
	},
	subtitle: {
		fontSize: 14,
		marginTop: 2,
	},
	createButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	filterContainer: {
		paddingBottom: Spacing.sm,
	},
	filterList: {
		paddingHorizontal: Spacing.lg,
		gap: Spacing.xs,
	},
	filterChip: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.xs,
		borderRadius: BorderRadius.xl,
		marginRight: Spacing.xs,
	},
	filterChipText: {
		fontSize: 13,
		fontWeight: "600",
	},
	listContent: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.xxl,
		flexGrow: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	emptyState: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.xxl * 2,
		paddingHorizontal: Spacing.lg,
	},
	emptyIcon: {
		width: 96,
		height: 96,
		borderRadius: 48,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.lg,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "600",
		textAlign: "center",
		marginBottom: Spacing.xs,
	},
	emptySubtitle: {
		fontSize: 14,
		textAlign: "center",
		marginBottom: Spacing.lg,
	},
	emptyButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.lg,
		gap: Spacing.xs,
	},
	emptyButtonText: {
		color: "white",
		fontSize: 14,
		fontWeight: "600",
	},
});
