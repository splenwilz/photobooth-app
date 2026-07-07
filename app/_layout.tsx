/**
 * Root Layout
 *
 * Main app layout with navigation stack and providers.
 * Sets up React Query, theming, and root-level navigation.
 *
 * Auth protection is handled by the API client:
 * - When API returns 401, client attempts token refresh
 * - If refresh fails, client redirects to /auth/signin
 * - See: api/client.ts handleSessionExpired()
 *
 * @see https://docs.expo.dev/router/advanced/root-layout/ - Expo Router Root Layout docs
 * @see https://tanstack.com/query/latest/docs/react/overview - React Query docs
 */

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import "react-native-reanimated";

import { queryClient } from "@/api/query-client";
import { SplashScreen } from "@/components/splash-screen";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDeepLinks } from "@/hooks/use-deep-links";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useBoothStore } from "@/stores/booth-store";

// Keep the native splash visible while we load
ExpoSplashScreen.preventAutoHideAsync();

export const unstable_settings = {
	anchor: "(tabs)",
};

/**
 * Inner layout component that uses hooks requiring QueryClient
 * Must be rendered inside QueryClientProvider
 */
function RootLayoutNav() {
  const colorScheme = useColorScheme();

  // Handle deep links for payment callbacks and email notification redirects
  useDeepLinks();

  // Push notifications: foreground handler, Android channel, and tap routing.
  // Device registration is handled in the tabs layout (authed-only).
  usePushNotifications();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Main tab navigation */}
        <Stack.Screen name="(tabs)" />

        {/* Booth management */}
        <Stack.Screen name="booths" />

        {/* Template store sub-screens (detail, purchased) */}
        <Stack.Screen name="store" />

        {/* Transaction history */}
        <Stack.Screen name="transactions" />

        {/* Auth screens */}
        <Stack.Screen name="auth" />

        {/* Licensing screens (QR scanner, activation) */}
        <Stack.Screen name="licensing" />

        {/* Support tickets */}
        <Stack.Screen name="support" />

        {/* Notification preferences */}
        <Stack.Screen name="notifications" />

        {/* Onboarding */}
        <Stack.Screen name="onboarding" />

        {/* Modal */}
        <Stack.Screen
          name="modal"
          options={{
            presentation: "modal",
            title: "Modal",
            headerShown: true,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const hydrateBooth = useBoothStore((state) => state.hydrate);
  const [dataReady, setDataReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // Embed the Geist family (assets/fonts). Each weight is its own family;
  // ThemedText maps fontWeight -> family via fontFamilyForWeight().
  const [fontsLoaded, fontError] = useFonts({
    "Geist-Regular": require("@/assets/fonts/Geist-Regular.ttf"),
    "Geist-Medium": require("@/assets/fonts/Geist-Medium.ttf"),
    "Geist-SemiBold": require("@/assets/fonts/Geist-SemiBold.ttf"),
  });

  // Log a font failure but don't block startup on it — otherwise the splash
  // would hang forever. On failure we fall back to the system font.
  useEffect(() => {
    if (fontError) {
      console.error("[RootLayout] font load failed:", fontError);
    }
  }, [fontError]);

  // App is ready once stores are hydrated AND fonts have resolved (loaded OR
  // failed), so text never flashes before Geist swaps in — but a font error
  // can never strand the splash.
  const appReady = dataReady && (fontsLoaded || !!fontError);

  // Hydrate stores from SecureStore on app start
  useEffect(() => {
    async function prepare() {
      try {
        await hydrateBooth();
      } catch (error) {
        // Don't block app startup on a hydration failure — fall back to
        // empty store state and surface the error for diagnostics.
        console.error("[RootLayout] booth hydration failed:", error);
      } finally {
        setDataReady(true);
      }
    }
    prepare();
  }, [hydrateBooth]);

  // Hide the native splash once our custom splash is rendered
  useEffect(() => {
    if (appReady) {
      ExpoSplashScreen.hideAsync();
    }
  }, [appReady]);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {appReady && <RootLayoutNav />}
      {!splashDone && <SplashScreen ready={appReady} onFinish={handleSplashFinish} />}
    </QueryClientProvider>
  );
}
