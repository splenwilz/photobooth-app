/**
 * Settings Screen
 *
 * Booth configuration and settings management.
 * Uses cohesive brand color throughout - no random accent colors.
 *
 * Features:
 * - Booth configuration (name, location, operation mode)
 * - Products & pricing management
 * - Credits management
 * - System actions (restart, sync, etc.)
 *
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 */

import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// API hooks for credits, booth details, and alerts
import { useAlerts } from "@/api/alerts/queries";
import { useSignout } from "@/api/auth/signout/queries";
import {
  useBoothDetail,
  useBoothOverview,
  useBoothPricing,
  useCancelBoothRestart,
  useRestartBoothApp,
  useRestartBoothSystem,
} from "@/api/booths";
import type { ProductPricingInfo } from "@/api/booths/types";
import {
  ACCESS_TOKEN_KEY,
  PENDING_PASSWORD_KEY,
  REFRESH_TOKEN_KEY,
  USER_STORAGE_KEY,
  clearQueryCache,
  getStoredUser,
} from "@/api/client";
import { useBoothCredits } from "@/api/credits";
import { useBoothSubscription, useCreateBoothCheckout } from "@/api/payments";
import { queryKeys } from "@/api/utils/query-keys";
import {
  ConnectionDetailsModal,
  DeleteBoothModal,
} from "@/components/booths";
import {
  SubscriptionDetailsModal,
  SubscriptionStatusCard,
  PricingPlansSelector,
} from "@/components/subscription";
import { AddCreditsModal } from "@/components/credits";
import { CustomHeader } from "@/components/custom-header";
import { EditProductModal } from "@/components/products";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SectionHeader } from "@/components/ui/section-header";
import {
  BorderRadius,
  BRAND_COLOR,
  Spacing,
  StatusColors,
  withAlpha,
} from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
// Global booth selection
import {
  ALL_BOOTHS_ID,
  STORAGE_KEY,
  useBoothStore,
} from "@/stores/booth-store";
import type { Product } from "@/types/photobooth";

/**
 * Map API product key to display info
 * Keys match API response: PhotoStrips, Photo4x6, SmartphonePrint
 */
const PRODUCT_INFO: Record<string, { name: string; description: string }> = {
	PhotoStrips: { name: "Photo Strips", description: "2x6 photo strip prints" },
	Photo4x6: { name: "4x6 Photo", description: "Standard 4x6 photo prints" },
	SmartphonePrint: {
		name: "Smartphone Print",
		description: "Print from phone gallery",
	},
};

/**
 * Convert API pricing to Product format
 * Uses API keys directly (PhotoStrips, Photo4x6, SmartphonePrint) as IDs
 */
function mapPricingToProducts(
	pricing: Record<string, ProductPricingInfo | undefined> | undefined,
): Product[] {
	if (!pricing) return [];

	return Object.entries(pricing)
		.filter(
			(entry): entry is [string, ProductPricingInfo] => entry[1] !== undefined,
		)
		.map(([key, info], index) => ({
			id: key, // Keep API key as-is: PhotoStrips, Photo4x6, SmartphonePrint
			name: PRODUCT_INFO[key]?.name ?? key,
			description: PRODUCT_INFO[key]?.description ?? "",
			basePrice: info.price ?? 0, // Default to 0 if null
			extraCopyPrice: info.extra_copy_price ?? 0, // Default to 0 if null
			enabled: true, // API doesn't have enabled flag, default to true
			popularityRank: index + 1,
		}));
}

/**
 * Settings Menu Item Component
 * All items use brand color for consistency
 */
interface SettingsItemProps {
	icon: string;
	title: string;
	subtitle?: string;
	value?: string;
	showArrow?: boolean;
	showSwitch?: boolean;
	switchValue?: boolean;
	onSwitchChange?: (value: boolean) => void;
	onPress?: () => void;
	/** Show item in red/destructive style */
	destructive?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
	icon,
	title,
	subtitle,
	value,
	showArrow = true,
	showSwitch = false,
	switchValue = false,
	onSwitchChange,
	onPress,
	destructive = false,
}) => {
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	// Use red color for destructive actions
	const accentColor = destructive ? StatusColors.error : BRAND_COLOR;

	const content = (
		<View
			style={[styles.settingsItem, { backgroundColor: cardBg, borderColor }]}
		>
			<View
				style={[
					styles.settingsIconContainer,
					{ backgroundColor: withAlpha(accentColor, 0.15) },
				]}
			>
				<IconSymbol name={icon as any} size={20} color={accentColor} />
			</View>
			<View style={styles.settingsContent}>
				<ThemedText type="defaultSemiBold" style={styles.settingsTitle}>
					{title}
				</ThemedText>
				{subtitle && (
					<ThemedText
						style={[styles.settingsSubtitle, { color: textSecondary }]}
					>
						{subtitle}
					</ThemedText>
				)}
			</View>
			{showSwitch ? (
				<Switch
					value={switchValue}
					onValueChange={onSwitchChange}
					trackColor={{ false: borderColor, true: BRAND_COLOR }}
					thumbColor="white"
				/>
			) : (
				<View style={styles.settingsRight}>
					{value && (
						<ThemedText
							style={[styles.settingsValue, { color: textSecondary }]}
						>
							{value}
						</ThemedText>
					)}
					{showArrow && (
						<IconSymbol name="chevron.right" size={16} color={textSecondary} />
					)}
				</View>
			)}
		</View>
	);

	if (onPress && !showSwitch) {
		return (
			<TouchableOpacity onPress={onPress} activeOpacity={0.7}>
				{content}
			</TouchableOpacity>
		);
	}

	return content;
};

/**
 * Settings Screen Component
 */
export default function SettingsScreen() {
	const backgroundColor = useThemeColor({}, "background");
	const cardBg = useThemeColor({}, "card");
	const borderColor = useThemeColor({}, "border");
	const textSecondary = useThemeColor({}, "textSecondary");

	// Fetch alerts for notification badge
	// @see GET /api/v1/analytics/alerts
	const { data: alertsData } = useAlerts();
	const unreadAlerts = React.useMemo(() => {
		if (!alertsData?.alerts) return 0;
		return alertsData.alerts.filter((a) => !a.isRead).length;
	}, [alertsData?.alerts]);

	// Navigation handlers
	const handleNotificationPress = () => {
		router.push("/(tabs)/alerts");
	};

	/**
	 * Clear all locally stored data (Dev only)
	 * Removes auth tokens, user data, and booth selection from SecureStore
	 */
	const handleClearAllData = async () => {
		Alert.alert(
			"Clear All Data",
			"This will log you out and clear all local data. Are you sure?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Clear",
					style: "destructive",
					onPress: async () => {
						try {
							// Clear React Query cache FIRST to stop all running queries
							// This prevents 401 errors from background queries after tokens are deleted
							clearQueryCache();

							// All SecureStore keys used in the app
							// Imported from their source modules to prevent drift
							const keys = [
								ACCESS_TOKEN_KEY,
								REFRESH_TOKEN_KEY,
								USER_STORAGE_KEY,
								PENDING_PASSWORD_KEY,
								STORAGE_KEY,
							];

							await Promise.all(
								keys.map((key) => SecureStore.deleteItemAsync(key)),
							);

							Alert.alert(
								"Data Cleared",
								"All local data has been cleared. The app will now restart.",
								[
									{
										text: "OK",
										onPress: () => router.replace("/auth/signin"),
									},
								],
							);
						} catch (error) {
							console.error("[Settings] Clear data error:", error);
							Alert.alert("Error", "Failed to clear data. Please try again.");
						}
					},
				},
			],
		);
	};

	// Signout mutation
	const signoutMutation = useSignout();

	/**
	 * Handle logout with confirmation
	 * Calls POST /api/v1/auth/logout, clears tokens, and redirects to signin
	 */
	const handleLogout = () => {
		Alert.alert("Logout", "Are you sure you want to logout?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Logout",
				style: "destructive",
				onPress: async () => {
					try {
						await signoutMutation.mutateAsync();
						router.replace("/auth/signin");
					} catch (error) {
						console.error("[Settings] Logout error:", error);
						// Still redirect even if API fails (tokens are cleared in service)
						router.replace("/auth/signin");
					}
				},
			},
		]);
	};

	// Global booth selection from Zustand store
	const { selectedBoothId } = useBoothStore();

	// Fetch booth overview to check if user has any booths
	const { data: boothOverview, refetch: refetchOverview } = useBoothOverview();
	const hasNoBooths = !boothOverview?.booths?.length;

	// Check if "All Booths" mode is active OR if user has no booths
	// In both cases, hide booth-specific settings
	const isAllBoothsMode = selectedBoothId === ALL_BOOTHS_ID || hasNoBooths;

	// Get the actual booth ID (null if "All Booths" mode or no booths)
	const effectiveBoothId = isAllBoothsMode ? null : selectedBoothId;

	// Fetch booth details from API
	const { data: boothDetail, refetch: refetchDetail } = useBoothDetail(effectiveBoothId);

	// Fetch credits from API
	const {
		data: creditsData,
		isLoading: isLoadingCredits,
		refetch: refetchCredits,
	} = useBoothCredits(effectiveBoothId);

	// Fetch pricing from API
	const { data: pricingData, refetch: refetchPricing } = useBoothPricing(effectiveBoothId);

	// Booth subscription check (per-booth subscription model)
	const { data: boothSubscription, refetch: refetchSubscription } = useBoothSubscription(effectiveBoothId);

	// Checkout mutation for subscribing to booth
	const createBoothCheckout = useCreateBoothCheckout();
	const queryClient = useQueryClient();

	// Pull-to-refresh state
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Pull-to-refresh handler
	const onRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await Promise.all([
				refetchOverview(),
				refetchDetail(),
				refetchCredits(),
				refetchPricing(),
				refetchSubscription(),
			]);
		} finally {
			setIsRefreshing(false);
		}
	}, [refetchOverview, refetchDetail, refetchCredits, refetchPricing, refetchSubscription]);

	// State for Add Credits modal
	const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);

	// State for Edit Product modal
	const [showEditProductModal, setShowEditProductModal] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

	// State for Connection Details modal
	const [showConnectionModal, setShowConnectionModal] = useState(false);

	// State for Delete Booth modal
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	// State for Subscription Details modal
	const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
	// Pricing plans modal for selecting a subscription plan
	const [showPricingModal, setShowPricingModal] = useState(false);

	// User profile from stored auth data
	const [userProfile, setUserProfile] = useState({
		name: "",
		email: "",
		initials: "",
	});

	// Load user profile from storage on mount
	useEffect(() => {
		const loadUserProfile = async () => {
			const user = await getStoredUser();
			if (user) {
				const fullName = `${user.first_name} ${user.last_name}`.trim();
				const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();
				setUserProfile({
					name: fullName || "User",
					email: user.email,
					initials: initials || "U",
				});
			}
		};
		loadUserProfile();
	}, []);

	// Convert API pricing to products (memoized to prevent re-renders)
	const products = React.useMemo(
		() => mapPricingToProducts(pricingData?.pricing),
		[pricingData?.pricing],
	);

	// Current booth info from API
	const boothName =
		boothDetail?.booth_name ?? creditsData?.booth_name ?? "Unknown Booth";
	const boothAddress = boothDetail?.booth_address ?? "No address";
	// Derive operation mode from payment controller info (e.g., "Coin + Card" -> "coin")
	const operationMode =
		boothDetail?.hardware?.payment_controller?.payment_methods
			?.toLowerCase()
			.includes("coin")
			? "Coin Op"
			: "Free Play";
	const creditsBalance = creditsData?.credit_balance ?? 0;

	// Handle successful credit addition
	const handleCreditsAdded = (credits: number) => {
		// Refetch credits to get updated balance from API
		refetchCredits();
		Alert.alert(
			"Credits Added",
			`Successfully added ${credits.toLocaleString()} credits to ${boothName}.`,
			[{ text: "OK" }],
		);
	};

	// Handle opening product edit modal
	const handleEditProduct = (product: Product) => {
		setSelectedProduct(product);
		setShowEditProductModal(true);
	};

	// Handle saving product changes - pricing API auto-invalidates the query
	// so products will refresh automatically
	const handleSaveProduct = () => {
		// Products will refresh via React Query invalidation
	};

	// Restart mutations
	const restartAppMutation = useRestartBoothApp();
	const restartSystemMutation = useRestartBoothSystem();
	const cancelRestartMutation = useCancelBoothRestart();

	// Handle restart booth app with confirmation
	const handleRestartApp = () => {
		if (!effectiveBoothId) return;

		Alert.alert(
			"Restart Booth App",
			"This will restart the booth software. The booth will be offline for about 30 seconds.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Restart",
					style: "destructive",
					onPress: () => {
						restartAppMutation.mutate(
							{ boothId: effectiveBoothId, delay_seconds: 5, force: false },
							{
								onSuccess: (data) => {
									Alert.alert("Restart Sent", data.message);
								},
								onError: (error) => {
									Alert.alert("Error", "Failed to send restart command.");
									console.error("[Settings] Restart app error:", error);
								},
							},
						);
					},
				},
			],
		);
	};

	// Handle restart system with confirmation
	const handleRestartSystem = () => {
		if (!effectiveBoothId) return;

		Alert.alert(
			"⚠️ Reboot System",
			"This will reboot the entire PC. The booth will be offline for several minutes. Are you sure?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Reboot",
					style: "destructive",
					onPress: () => {
						restartSystemMutation.mutate(
							{ boothId: effectiveBoothId, delay_seconds: 15, force: false },
							{
								onSuccess: (data) => {
									Alert.alert("Reboot Sent", data.message);
								},
								onError: (error) => {
									Alert.alert("Error", "Failed to send reboot command.");
									console.error("[Settings] Restart system error:", error);
								},
							},
						);
					},
				},
			],
		);
	};

	// Handle cancel restart
	const handleCancelRestart = () => {
		if (!effectiveBoothId) return;

		cancelRestartMutation.mutate(
			{ boothId: effectiveBoothId },
			{
				onSuccess: (data) => {
					Alert.alert("Cancelled", data.message);
				},
				onError: (error) => {
					Alert.alert("Error", "Failed to cancel restart.");
					console.error("[Settings] Cancel restart error:", error);
				},
			},
		);
	};

	// Access setSelectedBoothId from store for resetting after deletion
	const { setSelectedBoothId } = useBoothStore();

	/**
	 * Handle booth deletion success
	 * Resets booth selection and navigates to Booths tab
	 */
	const handleBoothDeleted = () => {
		setShowDeleteModal(false);
		// Reset booth selection to "All Booths" mode to prevent stale ID
		setSelectedBoothId(ALL_BOOTHS_ID);
		Alert.alert("Booth Deleted", `${boothName} has been permanently deleted.`, [
			{
				text: "OK",
				onPress: () => {
					// Navigate to booths tab to select a new booth
					router.replace("/(tabs)/booths");
				},
			},
		]);
	};

	// Format currency with null safety
	const formatCurrency = (amount: number | null | undefined): string => {
		if (amount == null) return "$0.00";
		return `$${amount.toFixed(2)}`;
	};

	// Handle subscribing to booth (for unsubscribed booths)
	const handleSubscribeToBooth = () => {
		if (!effectiveBoothId) return;

		const priceId = process.env.EXPO_PUBLIC_STRIPE_PRICE_MONTHLY;
		const websiteUrl = process.env.EXPO_PUBLIC_WEBSITE_URL;

		createBoothCheckout.mutate(
			{
				booth_id: effectiveBoothId,
				price_id: priceId,
				success_url: `${websiteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&booth_id=${effectiveBoothId}&type=subscription`,
				cancel_url: `${websiteUrl}/pricing`,
			},
			{
				onSuccess: async (data) => {
					if (data.checkout_url) {
						const browserResult = await WebBrowser.openAuthSessionAsync(
							data.checkout_url,
							`boothiq://payment-success?booth_id=${effectiveBoothId}`,
							{ preferEphemeralSession: true }
						);

						if (browserResult.type === "success" && browserResult.url?.includes("payment-success")) {
							queryClient.invalidateQueries({ queryKey: queryKeys.payments.access() });
							queryClient.invalidateQueries({ queryKey: queryKeys.payments.subscription() });
							queryClient.invalidateQueries({ queryKey: queryKeys.booths.detail(effectiveBoothId) });
							queryClient.invalidateQueries({ queryKey: queryKeys.payments.boothSubscription(effectiveBoothId) });

							// Select the subscribed booth as active
							setSelectedBoothId(effectiveBoothId);

							Alert.alert(
								"Payment Successful",
								"Your subscription has been activated!",
								[{ text: "OK" }],
							);
						}
					}
				},
				onError: (error) => {
					Alert.alert(
						"Error",
						error.message || "Failed to start checkout. Please try again.",
					);
				},
			},
		);
	};

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor }]}
			edges={["top"]}
		>
			<CustomHeader
				title="Settings"
				onNotificationPress={handleNotificationPress}
				notificationCount={unreadAlerts}
			/>

			<ScrollView
				style={styles.content}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={onRefresh}
						tintColor={BRAND_COLOR}
						colors={[BRAND_COLOR]}
					/>
				}
			>
				{/* User Profile Section */}
				<View style={styles.section}>
					<View
						style={[
							styles.profileCard,
							{ backgroundColor: cardBg, borderColor },
						]}
					>
						<View style={styles.profileHeader}>
							{/* Avatar */}
							<View
								style={[
									styles.profileAvatar,
									{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
								]}
							>
								<ThemedText style={[styles.profileAvatarText, { color: BRAND_COLOR }]}>
									{userProfile.initials}
								</ThemedText>
							</View>
							{/* User Info */}
							<View style={styles.profileInfo}>
								<ThemedText type="defaultSemiBold" style={styles.profileName}>
									{userProfile.name}
								</ThemedText>
								<ThemedText style={[styles.profileEmail, { color: textSecondary }]}>
									{userProfile.email}
								</ThemedText>
							</View>
						</View>
					</View>
				</View>

				{/* All Booths Mode / No Booths Notice */}
				{isAllBoothsMode && (
					<View
						style={[
							styles.allBoothsNotice,
							{
								backgroundColor: withAlpha(BRAND_COLOR, 0.1),
								borderColor: BRAND_COLOR,
							},
						]}
					>
						<IconSymbol name="info.circle" size={20} color={BRAND_COLOR} />
						<View style={styles.allBoothsNoticeContent}>
							<ThemedText type="defaultSemiBold">
								{hasNoBooths ? "No Booths Yet" : "All Booths Mode"}
							</ThemedText>
							<ThemedText
								style={[styles.allBoothsNoticeText, { color: textSecondary }]}
							>
								{hasNoBooths
									? "Create your first booth from the Booths tab to access booth-specific settings like credits, pricing, and hardware."
									: "Select a specific booth from the Booths tab to access booth-specific settings like credits, pricing, and hardware."}
							</ThemedText>
						</View>
					</View>
				)}

				{/* Subscription & Billing Section */}
				{!isAllBoothsMode && (
					<View style={styles.section}>
						<SectionHeader title="Subscription & Billing" subtitle="Manage booth subscription" />
						<SubscriptionStatusCard
							boothId={effectiveBoothId}
							onViewDetails={() => setShowSubscriptionModal(true)}
							onSelectPlan={() => {
								if (effectiveBoothId) {
									setShowPricingModal(true);
								}
							}}
						/>
					</View>
				)}

				{/* Current Booth Info - Hidden in All Booths mode */}
				{!isAllBoothsMode && (
					<View style={styles.section}>
						<SectionHeader title="Current Booth" subtitle={boothName} />

						<SettingsItem
							icon="photo.stack"
							title={boothName}
							subtitle={boothAddress}
							value={operationMode}
							onPress={() => console.log("Edit booth info")}
						/>
					</View>
				)}

				{/* Credits Management - Hidden in All Booths mode */}
				{!isAllBoothsMode && (
					<View style={styles.section}>
						<SectionHeader title="Credits" subtitle="Manage booth credits" />

						<View
							style={[
								styles.creditsCard,
								{ backgroundColor: cardBg, borderColor },
							]}
						>
							<View style={styles.creditsHeader}>
								<ThemedText
									style={[styles.creditsLabel, { color: textSecondary }]}
								>
									{boothName} Balance
								</ThemedText>
								{isLoadingCredits ? (
									<ThemedText
										type="title"
										style={[styles.creditsValue, { color: textSecondary }]}
									>
										Loading...
									</ThemedText>
								) : (
									<ThemedText
										type="title"
										style={[styles.creditsValue, { color: BRAND_COLOR }]}
									>
										{creditsBalance.toLocaleString()}
									</ThemedText>
								)}
								<ThemedText
									style={[styles.creditsUnit, { color: textSecondary }]}
								>
									credits
								</ThemedText>
							</View>
							<View style={styles.creditsActions}>
								<TouchableOpacity
									style={[
										styles.creditButton,
										{ backgroundColor: BRAND_COLOR },
									]}
									onPress={() => setShowAddCreditsModal(true)}
								>
									<IconSymbol name="plus" size={18} color="white" />
									<ThemedText style={styles.creditButtonText}>
										Add Credits
									</ThemedText>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.creditButton,
										{ backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
									]}
									onPress={() => router.push("/credits/history")}
								>
									<IconSymbol name="clock" size={18} color={BRAND_COLOR} />
									<ThemedText
										style={[styles.creditButtonText, { color: BRAND_COLOR }]}
									>
										History
									</ThemedText>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				)}

				{/* Products & Pricing - Hidden in All Booths mode */}
				{!isAllBoothsMode && (
					<View style={styles.section}>
						<SectionHeader
							title="Products & Pricing"
							subtitle="Configure available products"
						/>

						{products.map((product) => (
							<SettingsItem
								key={product.id}
								icon="photo"
								title={product.name}
								subtitle={product.enabled ? product.description : "Disabled"}
								value={formatCurrency(product.basePrice)}
								onPress={() => handleEditProduct(product)}
							/>
						))}
					</View>
				)}

				{/* Booth Management - Hidden in All Booths mode */}
				{!isAllBoothsMode && (
					<View style={styles.section}>
						<SectionHeader
							title="Booth Management"
							subtitle="Connection and system controls"
						/>

					<SettingsItem
						icon="link"
						title="Connection Details"
						subtitle="View or generate registration code"
						onPress={() => setShowConnectionModal(true)}
					/>

					<SettingsItem
						icon="qrcode.viewfinder"
						title="Activate Booth License"
						subtitle={
							boothSubscription?.is_active
								? "Scan QR code to activate"
								: "Requires active subscription"
						}
						onPress={() => {
							if (boothSubscription?.is_active) {
								router.push({
									pathname: "/licensing/scan",
									params: {
										boothId: effectiveBoothId,
										boothName: boothDetail?.booth_name ?? "Booth",
									},
								});
							} else {
								Alert.alert(
									"Subscription Required",
									"This booth needs an active subscription to activate licenses. Subscribe now?",
									[
										{ text: "Cancel", style: "cancel" },
										{ text: "Subscribe", onPress: handleSubscribeToBooth },
									]
								);
							}
						}}
					/>

						<SettingsItem
							icon="arrow.clockwise"
							title="Restart Booth App"
							subtitle={
								restartAppMutation.isPending
									? "Sending..."
									: "Restart the booth software"
							}
							onPress={handleRestartApp}
						/>

						<SettingsItem
							icon="power"
							title="Reboot System"
							subtitle={
								restartSystemMutation.isPending
									? "Sending..."
									: "Reboot the entire PC"
							}
							onPress={handleRestartSystem}
						/>

						<SettingsItem
							icon="xmark.circle"
							title="Cancel Restart"
							subtitle={
								cancelRestartMutation.isPending
									? "Sending..."
									: "Cancel pending restart"
							}
							onPress={handleCancelRestart}
						/>

						<SettingsItem
							icon="trash"
							title="Delete Booth"
							subtitle="Permanently remove this booth"
							onPress={() => setShowDeleteModal(true)}
							destructive
						/>
					</View>
				)}

				{/* Help & Support */}
				<View style={styles.section}>
					<SectionHeader title="Help & Support" subtitle="Get assistance" />

					<SettingsItem
						icon="ticket"
						title="Support Tickets"
						subtitle="View or create support requests"
						onPress={() => router.push("/support")}
					/>

					<SettingsItem
						icon="questionmark.circle"
						title="Help Center"
						subtitle="Browse FAQs and guides"
						onPress={() => {
							// TODO: Open help center
							console.log("Open help center");
						}}
					/>
				</View>

				{/* App Info */}
				<View style={styles.section}>
					<SectionHeader title="About" />

					<SettingsItem
						icon="info.circle"
						title="App Version"
						value={Constants.expoConfig?.version ?? "1.0.0"}
						showArrow={false}
					/>

					<SettingsItem
						icon="doc.text"
						title="Terms of Service"
						onPress={() => router.push("/legal/terms")}
					/>

					<SettingsItem
						icon="lock.shield"
						title="Privacy Policy"
						onPress={() => router.push("/legal/privacy")}
					/>

					<SettingsItem
						icon="rectangle.portrait.and.arrow.right"
						title="Logout"
						subtitle={
							signoutMutation.isPending
								? "Logging out..."
								: "Sign out of your account"
						}
						onPress={handleLogout}
						destructive
					/>
				</View>

				{/* Developer Tools (Dev Only) */}
				{__DEV__ && (
					<View style={styles.section}>
						<SectionHeader title="Developer Tools" />
						<SettingsItem
							icon="trash"
							title="Clear All Data"
							subtitle="Remove all stored data and logout"
							onPress={handleClearAllData}
							destructive
						/>
					</View>
				)}

				{/* Bottom spacing */}
				<View style={{ height: Spacing.xxl }} />
			</ScrollView>

			{/* Add Credits Modal */}
			<AddCreditsModal
				visible={showAddCreditsModal}
				boothId={effectiveBoothId}
				onClose={() => setShowAddCreditsModal(false)}
				onSuccess={handleCreditsAdded}
			/>

			{/* Edit Product Modal */}
			<EditProductModal
				visible={showEditProductModal}
				boothId={effectiveBoothId}
				product={selectedProduct}
				onClose={() => {
					setShowEditProductModal(false);
					setSelectedProduct(null);
				}}
				onSave={handleSaveProduct}
			/>

			{/* Connection Details Modal */}
			<ConnectionDetailsModal
				visible={showConnectionModal}
				boothId={effectiveBoothId}
				boothName={boothName}
				onClose={() => setShowConnectionModal(false)}
			/>

			{/* Delete Booth Modal */}
			<DeleteBoothModal
				visible={showDeleteModal}
				boothId={effectiveBoothId}
				boothName={boothName}
				onClose={() => setShowDeleteModal(false)}
				onDeleted={handleBoothDeleted}
			/>

			{/* Subscription Details Modal */}
			<SubscriptionDetailsModal
				visible={showSubscriptionModal}
				onClose={() => setShowSubscriptionModal(false)}
				boothId={effectiveBoothId}
			/>

			{/* Pricing Plans Modal - only render when boothId is valid */}
			{effectiveBoothId && (
				<Modal
					visible={showPricingModal}
					animationType="slide"
					presentationStyle="pageSheet"
					onRequestClose={() => setShowPricingModal(false)}
				>
					<SafeAreaView style={[styles.pricingModal, { backgroundColor: cardBg }]}>
						<PricingPlansSelector
							boothId={effectiveBoothId}
							onCheckoutComplete={() => setShowPricingModal(false)}
							onCancel={() => setShowPricingModal(false)}
						/>
					</SafeAreaView>
				</Modal>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	pricingModal: {
		flex: 1,
		padding: Spacing.lg,
	},
	content: {
		flex: 1,
		paddingHorizontal: Spacing.lg,
	},
	section: {
		marginTop: Spacing.lg,
	},
	settingsItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	settingsIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.sm,
	},
	settingsContent: {
		flex: 1,
	},
	settingsTitle: {
		fontSize: 14,
	},
	settingsSubtitle: {
		fontSize: 12,
		marginTop: 2,
	},
	settingsRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs,
	},
	settingsValue: {
		fontSize: 13,
	},
	creditsCard: {
		padding: Spacing.lg,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	creditsHeader: {
		alignItems: "center",
		marginBottom: Spacing.lg,
	},
	creditsLabel: {
		fontSize: 12,
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: Spacing.xs,
	},
	creditsValue: {
		fontSize: 48,
		fontWeight: "bold",
		lineHeight: 56,
	},
	creditsUnit: {
		fontSize: 14,
	},
	creditsActions: {
		flexDirection: "row",
		gap: Spacing.sm,
	},
	creditButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 12,
		borderRadius: BorderRadius.md,
		gap: Spacing.xs,
	},
	creditButtonText: {
		color: "white",
		fontSize: 14,
		fontWeight: "600",
	},
	// All Booths Mode Notice
	allBoothsNotice: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginTop: Spacing.lg,
		gap: Spacing.sm,
	},
	allBoothsNoticeContent: {
		flex: 1,
	},
	allBoothsNoticeText: {
		fontSize: 13,
		marginTop: 4,
		lineHeight: 18,
	},
	// Profile Section
	profileCard: {
		padding: Spacing.lg,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	profileHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: Spacing.md,
	},
	profileAvatar: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.md,
	},
	profileAvatarText: {
		fontSize: 24,
		fontWeight: "bold",
	},
	profileInfo: {
		flex: 1,
	},
	profileName: {
		fontSize: 18,
		marginBottom: 2,
	},
	profileEmail: {
		fontSize: 14,
	},
});
