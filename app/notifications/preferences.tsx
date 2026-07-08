/**
 * Notification Preferences Screen
 *
 * EMAIL-only preferences: push is system-controlled (not a user choice), so the
 * only per-event toggle here is email — shown only for events that offer it.
 * Grouped by category, rendered dynamically from the API response so a new
 * backend category can't break the screen.
 *
 * Features:
 * - One email toggle per email-offered event, optimistic updates
 * - In-context "Enable push" prompt (permission) with a Settings deep-link
 * - Pull-to-refresh, loading and error states
 *
 * @see GET /api/v1/notifications/preferences
 * @see PATCH /api/v1/notifications/preferences
 */

import { router } from "expo-router";
import * as Linking from "expo-linking";
import { useCallback, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Switch,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRegisterDevice } from "@/api/push/queries";
import {
	useNotificationPreferences,
	useUpdateChannelPreference,
} from "@/api/notifications/queries";
import type {
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
	scaleFont,
} from "@/constants/theme";
import { usePushPermission } from "@/hooks/use-push-permission";
import { useThemeColor } from "@/hooks/use-theme-color";
import { acquireExpoPushToken } from "@/utils/push-notifications";

/** Display config for known categories; unknown ones fall back gracefully. */
const CATEGORY_CONFIG: Record<
	string,
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

/** Preferred category order; any categories not listed are appended after. */
const CATEGORY_ORDER = ["license", "booth", "billing", "hardware"];

function titleCase(value: string): string {
	return value
		.split(/[_\s]+/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

function getCategoryConfig(category: string) {
	return (
		CATEGORY_CONFIG[category] ?? {
			label: titleCase(category),
			subtitle: "",
			icon: "bell.fill",
		}
	);
}

/**
 * Single email-preference row. Push is system-controlled (not a user choice),
 * so the only toggle here is email — shown only for events that offer it.
 */
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
				value={preference.channels.email ?? false}
				onValueChange={(v) => onToggle(preference.event_type, v)}
				trackColor={{ false: borderColor, true: BRAND_COLOR }}
				thumbColor="white"
				accessibilityLabel={`Email notifications for ${preference.label}`}
			/>
		</View>
	);
}

export default function NotificationPreferencesScreen() {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	const { data, isLoading, error, refetch } = useNotificationPreferences();
	const updateChannel = useUpdateChannelPreference();
	const registerDevice = useRegisterDevice();

	// OS push permission — drives the "Enable push" card. Shared hook keeps it
	// fresh on foreground (e.g. after returning from the OS Settings app).
	const { state: pushPermission, refresh: refreshPermission } =
		usePushPermission();

	const handleEnablePush = useCallback(async () => {
		try {
			// Always attempt a request first — requestPermissionsAsync re-prompts
			// when the OS still allows it (Android canAskAgain) and resolves denied
			// immediately when it doesn't, so we only fall back to Settings below
			// when the OS truly won't ask again.
			const result = await acquireExpoPushToken({
				requestIfUndetermined: true,
			});
			if (result.status === "granted") {
				registerDevice.mutate({
					expo_push_token: result.token,
					device_id: result.deviceId,
					platform: result.platform,
				});
				refreshPermission();
			} else if (result.status === "denied") {
				await Linking.openSettings();
			} else {
				Alert.alert(
					"Not available",
					"Push notifications require a physical device.",
				);
			}
		} catch (e) {
			// onPress won't surface a rejected promise — handle native failures here.
			console.warn("[prefs] enable-push failed:", e);
		}
	}, [registerDevice, refreshPermission]);

	// Manual refresh state — prevents mutation-triggered refetches from spinning
	const [isRefreshing, setIsRefreshing] = useState(false);
	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

	// Group EMAIL-configurable preferences by category, dynamically, in a stable
	// order. Push is system-controlled, so only events that offer email appear.
	const categories = useMemo(() => {
		const map = new Map<string, NotificationPreference[]>();
		for (const pref of data?.preferences ?? []) {
			if (pref.channels.email === undefined) continue; // email not offered → hide
			const list = map.get(pref.category) ?? [];
			list.push(pref);
			map.set(pref.category, list);
		}
		const present = Array.from(map.keys());
		const ordered = [
			...CATEGORY_ORDER.filter((c) => map.has(c)),
			...present.filter((c) => !CATEGORY_ORDER.includes(c)),
		];
		return ordered.map((category) => ({
			category,
			prefs: map.get(category) ?? [],
		}));
	}, [data?.preferences]);

	const handleToggle = useCallback(
		(eventType: NotificationEventType, enabled: boolean) => {
			updateChannel.mutate({ eventType, channel: "email", enabled });
		},
		[updateChannel],
	);

	if (isLoading) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader
					title="Notifications"
					showBackButton
					onBackPress={() => router.back()}
				/>
				<View style={styles.centerContent}>
					<ActivityIndicator size="large" color={BRAND_COLOR} />
				</View>
			</SafeAreaView>
		);
	}

	if (error) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor }]}
				edges={["top"]}
			>
				<CustomHeader
					title="Notifications"
					showBackButton
					onBackPress={() => router.back()}
				/>
				<View style={styles.centerContent}>
					<IconSymbol
						name="exclamationmark.triangle"
						size={48}
						color={StatusColors.warning}
					/>
					<ThemedText style={[styles.errorText, { color: textSecondary }]}>
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
				title="Notifications"
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
				{/* Enable-push prompt when the OS permission isn't granted yet */}
				{(pushPermission === "undetermined" || pushPermission === "denied") && (
					<TouchableOpacity
						style={[styles.enablePushCard, { backgroundColor: cardBg, borderColor }]}
						onPress={handleEnablePush}
						activeOpacity={0.8}
						accessibilityRole="button"
					>
						<IconSymbol name="bell.fill" size={22} color={BRAND_COLOR} />
						<View style={styles.enablePushText}>
							<ThemedText type="defaultSemiBold">
								Enable push notifications
							</ThemedText>
							<ThemedText
								style={[styles.enablePushSubtitle, { color: textSecondary }]}
							>
								{pushPermission === "denied"
									? "Turn on notifications for BoothIQ in Settings"
									: "Get alerted instantly when a booth needs attention"}
							</ThemedText>
						</View>
						<IconSymbol name="chevron.right" size={16} color={textSecondary} />
					</TouchableOpacity>
				)}

				{/* Push is system-controlled; only email is user-configurable. */}
				<View style={styles.pushNote}>
					<IconSymbol name="bell.fill" size={16} color={textSecondary} />
					<ThemedText style={[styles.pushNoteText, { color: textSecondary }]}>
						Critical alerts are always sent as push notifications. You can turn
						those off only in your device Settings. The toggles below control
						email.
					</ThemedText>
				</View>

				{categories.map(({ category, prefs }) => {
					if (!prefs.length) return null;
					const config = getCategoryConfig(category);
					return (
						<View key={category} style={styles.section}>
							<SectionHeader title={config.label} subtitle={config.subtitle} />
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
						<IconSymbol name="chevron.right" size={16} color={textSecondary} />
					</TouchableOpacity>
				</View>

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
		fontSize: scaleFont(16),
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
		fontSize: scaleFont(14),
		fontWeight: "600",
	},
	enablePushCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginTop: Spacing.md,
	},
	enablePushText: {
		flex: 1,
	},
	enablePushSubtitle: {
		fontSize: scaleFont(12),
		marginTop: 2,
	},
	pushNote: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: Spacing.xs,
		marginTop: Spacing.lg,
	},
	pushNoteText: {
		flex: 1,
		fontSize: scaleFont(12),
		lineHeight: 17,
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
		fontSize: scaleFont(14),
	},
	preferenceDescription: {
		fontSize: scaleFont(12),
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
		fontSize: scaleFont(14),
		fontWeight: "600",
	},
});
