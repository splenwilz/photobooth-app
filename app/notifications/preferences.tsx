/**
 * Email Notification Preferences Screen
 *
 * Allows users to enable/disable email notifications per event type.
 * Preferences are grouped by category: License, Booth, Billing, Hardware.
 *
 * Features:
 * - Toggle individual notification preferences
 * - Category-level enable/disable all toggle
 * - Optimistic updates for instant UI feedback
 * - Pull-to-refresh
 * - Loading and error states
 *
 * @see GET /api/v1/notifications/preferences
 * @see PUT /api/v1/notifications/preferences/{event_type}
 * @see PUT /api/v1/notifications/preferences
 */

import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
	ActivityIndicator,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Switch,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
	useBulkUpdatePreferences,
	useNotificationPreferences,
	useUpdatePreference,
} from "@/api/notifications/queries";
import type {
	NotificationCategory,
	NotificationEventType,
	NotificationPreference,
} from "@/api/notifications/types";
import { CustomHeader } from "@/components/custom-header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SectionHeader } from "@/components/ui/section-header";
import {
	BorderRadius,
	BRAND_COLOR,
	Spacing,
	StatusColors,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

/** Category display configuration */
const CATEGORY_CONFIG: Record<
	NotificationCategory,
	{ label: string; subtitle: string; icon: string }
> = {
	license: {
		label: "License Events",
		subtitle: "Activation, deactivation, expiry",
		icon: "key.fill",
	},
	booth: {
		label: "Booth Events",
		subtitle: "Registration and connectivity",
		icon: "desktopcomputer",
	},
	billing: {
		label: "Billing Events",
		subtitle: "Subscriptions and payments",
		icon: "creditcard.fill",
	},
	hardware: {
		label: "Hardware Events",
		subtitle: "Printer and supply alerts",
		icon: "printer.fill",
	},
};

/** Category display order */
const CATEGORY_ORDER: NotificationCategory[] = [
	"license",
	"booth",
	"billing",
	"hardware",
];

/** Single preference row */
function PreferenceRow({
	preference,
	onToggle,
}: {
	preference: NotificationPreference;
	onToggle: (eventType: NotificationEventType, enabled: boolean) => void;
}) {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	return (
		<View
			style={[styles.preferenceItem, { backgroundColor: cardBg, borderColor }]}
		>
			<View style={styles.preferenceContent}>
				<ThemedText type="defaultSemiBold" style={styles.preferenceLabel}>
					{preference.label}
				</ThemedText>
				<ThemedText
					style={[styles.preferenceDescription, { color: textSecondary }]}
				>
					{preference.description}
				</ThemedText>
			</View>
			<Switch
				value={preference.enabled}
				onValueChange={(value) => onToggle(preference.event_type, value)}
				trackColor={{ false: borderColor, true: BRAND_COLOR }}
				thumbColor="white"
			/>
		</View>
	);
}

export default function NotificationPreferencesScreen() {
	const backgroundColor = useThemeColor({}, "background");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	const {
		data,
		isLoading,
		error,
		refetch,
	} = useNotificationPreferences();

	// Manual refresh state — prevents mutation-triggered refetches from showing the spinner
	const [isRefreshing, setIsRefreshing] = useState(false);
	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

	const updatePreference = useUpdatePreference();
	const bulkUpdate = useBulkUpdatePreferences();

	// Group preferences by category
	const groupedPreferences = useMemo(() => {
		if (!data?.preferences) return null;
		const groups: Record<NotificationCategory, NotificationPreference[]> = {
			license: [],
			booth: [],
			billing: [],
			hardware: [],
		};
		for (const pref of data.preferences) {
			groups[pref.category]?.push(pref);
		}
		return groups;
	}, [data?.preferences]);

	// Handle individual toggle
	const handleToggle = useCallback(
		(eventType: NotificationEventType, enabled: boolean) => {
			updatePreference.mutate({ eventType, enabled });
		},
		[updatePreference],
	);

	// Handle category-level toggle
	const handleCategoryToggle = useCallback(
		(category: NotificationCategory, enabled: boolean) => {
			if (!groupedPreferences) return;
			const prefs = groupedPreferences[category];
			const updates: Partial<Record<NotificationEventType, boolean>> = {};
			for (const pref of prefs) {
				updates[pref.event_type] = enabled;
			}
			bulkUpdate.mutate(updates);
		},
		[groupedPreferences, bulkUpdate],
	);

	// Check if all preferences in a category are enabled
	const isCategoryEnabled = useCallback(
		(category: NotificationCategory): boolean => {
			if (!groupedPreferences) return false;
			return groupedPreferences[category].every((p) => p.enabled);
		},
		[groupedPreferences],
	);

	// Loading state
	if (isLoading) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader
					title="Email Notifications"
					showBackButton
					onBackPress={() => router.back()}
				/>
				<View style={styles.centerContent}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
				</View>
			</SafeAreaView>
		);
	}

	// Error state
	if (error) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader
					title="Email Notifications"
					showBackButton
					onBackPress={() => router.back()}
				/>
				<View style={styles.centerContent}>
					<IconSymbol
						name="exclamationmark.triangle"
						size={48}
						color={StatusColors.warning}
					/>
					<ThemedText
						style={[styles.errorText, { color: textSecondary }]}
					>
						Failed to load preferences
					</ThemedText>
					<TouchableOpacity
						style={[styles.retryButton, { backgroundColor: BRAND_COLOR }]}
						onPress={() => refetch()}
						activeOpacity={0.7}
					>
						<ThemedText style={styles.retryButtonText}>Retry</ThemedText>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor }]}
			edges={["top"]}
		>
			<CustomHeader
				title="Email Notifications"
				showBackButton
				onBackPress={() => router.back()}
			/>

			<ScrollView
				style={styles.content}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={handleRefresh}
						tintColor={BRAND_COLOR}
						colors={[BRAND_COLOR]}
					/>
				}
			>
				{/* Category sections */}
				{groupedPreferences &&
					CATEGORY_ORDER.map((category) => {
						const config = CATEGORY_CONFIG[category];
						const prefs = groupedPreferences[category];
						if (!prefs.length) return null;

						const allEnabled = isCategoryEnabled(category);

						return (
							<View key={category} style={styles.section}>
								<SectionHeader
									title={config.label}
									subtitle={config.subtitle}
									rightAction={
										<Switch
											value={allEnabled}
											onValueChange={(value) =>
												handleCategoryToggle(category, value)
											}
											trackColor={{
												false: borderColor,
												true: BRAND_COLOR,
											}}
											thumbColor="white"
										/>
									}
								/>

								{prefs.map((pref) => (
									<PreferenceRow
										key={pref.event_type}
										preference={pref}
										onToggle={handleToggle}
									/>
								))}
							</View>
						);
					})}

				{/* Link to notification history */}
				<View style={styles.section}>
					<TouchableOpacity
						style={[styles.historyLink, { borderColor }]}
						onPress={() => router.push("/notifications/history")}
						activeOpacity={0.7}
					>
						<IconSymbol name="clock" size={20} color={BRAND_COLOR} />
						<ThemedText style={[styles.historyLinkText, { color: BRAND_COLOR }]}>
							View Notification History
						</ThemedText>
						<IconSymbol
							name="chevron.right"
							size={16}
							color={textSecondary}
						/>
					</TouchableOpacity>
				</View>

				{/* Bottom spacing */}
				<View style={{ height: Spacing.xxl }} />
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
		paddingHorizontal: Spacing.lg,
	},
	section: {
		marginTop: Spacing.lg,
	},
	centerContent: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: Spacing.md,
	},
	errorText: {
		fontSize: 16,
		marginTop: Spacing.sm,
	},
	retryButton: {
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		marginTop: Spacing.sm,
	},
	retryButtonText: {
		color: "white",
		fontSize: 14,
		fontWeight: "600",
	},
	preferenceItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	preferenceContent: {
		flex: 1,
		marginRight: Spacing.sm,
	},
	preferenceLabel: {
		fontSize: 14,
	},
	preferenceDescription: {
		fontSize: 12,
		marginTop: 2,
	},
	historyLink: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: Spacing.sm,
	},
	historyLinkText: {
		flex: 1,
		fontSize: 14,
		fontWeight: "600",
	},
});
