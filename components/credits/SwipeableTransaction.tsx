/**
 * Swipeable Transaction Card
 *
 * Transaction card with swipe-to-delete functionality.
 */

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
	BorderRadius,
	Spacing,
	StatusColors,
	withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { CreditTransaction, CreditTransactionType } from "@/api/credits/types";
import { formatRelativeTime } from "@/utils";
import { useRef } from "react";
import {
	Animated,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

interface SwipeableTransactionProps {
	item: CreditTransaction;
	onDelete: (id: string) => void;
	getTransactionIcon: (type: CreditTransactionType) => string;
	getTransactionColor: (type: CreditTransactionType) => string;
	formatAmount: (amount: number, type: CreditTransactionType) => string;
	getSourceDisplayName: (source: string) => string;
}

export function SwipeableTransaction({
	item,
	onDelete,
	getTransactionIcon,
	getTransactionColor,
	formatAmount,
	getSourceDisplayName,
}: SwipeableTransactionProps) {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	const swipeableRef = useRef<Swipeable>(null);

	const typeColor = getTransactionColor(item.transaction_type);
	const typeIcon = getTransactionIcon(item.transaction_type);

	const handleDelete = () => {
		swipeableRef.current?.close();
		onDelete(item.id);
	};

	const renderRightActions = (
		progress: Animated.AnimatedInterpolation<number>,
		dragX: Animated.AnimatedInterpolation<number>,
	) => {
		const scale = dragX.interpolate({
			inputRange: [-100, 0],
			outputRange: [1, 0.5],
			extrapolate: "clamp",
		});

		const opacity = dragX.interpolate({
			inputRange: [-100, -50, 0],
			outputRange: [1, 0.8, 0],
			extrapolate: "clamp",
		});

		return (
			<Animated.View
				style={[
					styles.deleteAction,
					{
						opacity,
						transform: [{ scale }],
					},
				]}
			>
				<TouchableOpacity
					style={[styles.deleteButton, { backgroundColor: StatusColors.error }]}
					onPress={handleDelete}
					activeOpacity={0.8}
				>
					<IconSymbol name="trash.fill" size={22} color="white" />
					<ThemedText style={styles.deleteText}>Delete</ThemedText>
				</TouchableOpacity>
			</Animated.View>
		);
	};

	return (
		<Swipeable
			ref={swipeableRef}
			renderRightActions={renderRightActions}
			rightThreshold={40}
			overshootRight={false}
			friction={2}
		>
			<View
				style={[
					styles.transactionCard,
					{ backgroundColor: cardBg, borderColor },
				]}
			>
				<View
					style={[
						styles.transactionIcon,
						{ backgroundColor: withAlpha(typeColor, 0.15) },
					]}
				>
					<IconSymbol name={typeIcon} size={20} color={typeColor} />
				</View>

				<View style={styles.transactionContent}>
					<View style={styles.transactionHeader}>
						<ThemedText type="defaultSemiBold" style={{ color: typeColor }}>
							{formatAmount(item.amount, item.transaction_type)} credits
						</ThemedText>
						<ThemedText
							style={[styles.balanceAfter, { color: textSecondary }]}
						>
							Bal: {item.balance_after?.toLocaleString() ?? "—"}
						</ThemedText>
					</View>
					<View style={styles.transactionFooter}>
						<ThemedText
							style={[styles.transactionNote, { color: textSecondary }]}
							numberOfLines={1}
						>
							{item.description}
						</ThemedText>
						<ThemedText
							style={[styles.transactionTime, { color: textSecondary }]}
						>
							{formatRelativeTime(item.created_at)}
						</ThemedText>
					</View>
					<View style={styles.transactionMeta}>
						<ThemedText style={[styles.sourceText, { color: textSecondary }]}>
							{getSourceDisplayName(item.source)}
						</ThemedText>
					</View>
				</View>
			</View>
		</Swipeable>
	);
}

const styles = StyleSheet.create({
	transactionCard: {
		flexDirection: "row",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.md,
		backgroundColor: "white",
	},
	transactionIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	transactionContent: {
		flex: 1,
	},
	transactionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 4,
	},
	transactionFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: Spacing.xs,
	},
	transactionNote: {
		fontSize: 12,
		flex: 1,
	},
	transactionTime: {
		fontSize: 11,
		marginLeft: Spacing.sm,
	},
	balanceAfter: {
		fontSize: 12,
		fontWeight: "500",
	},
	transactionMeta: {
		marginTop: Spacing.xs,
	},
	sourceText: {
		fontSize: 11,
		textTransform: "capitalize",
	},
	// Delete action
	deleteAction: {
		justifyContent: "center",
		alignItems: "flex-end",
		paddingLeft: Spacing.sm,
	},
	deleteButton: {
		justifyContent: "center",
		alignItems: "center",
		width: 80,
		height: "100%",
		borderRadius: BorderRadius.lg,
		gap: 4,
	},
	deleteText: {
		color: "white",
		fontSize: 12,
		fontWeight: "600",
	},
});
