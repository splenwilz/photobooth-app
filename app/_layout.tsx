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
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { queryClient } from "@/api/query-client";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePaymentDeepLinks } from "@/hooks/use-payment-deep-links";
import { useBoothStore } from "@/stores/booth-store";
import { useCartStore } from "@/stores/cart-store";

export const unstable_settings = {
	anchor: "(tabs)",
};

/**
 * Inner layout component that uses hooks requiring QueryClient
 * Must be rendered inside QueryClientProvider
 */
function RootLayoutNav() {
  const colorScheme = useColorScheme();

  // Handle deep links for payment callbacks (Stripe checkout success/cancel)
  usePaymentDeepLinks();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Main tab navigation */}
        <Stack.Screen name="(tabs)" />

        {/* Booth management */}
        <Stack.Screen name="booths" />

        {/* Template store sub-screens (detail, cart, purchased) */}
        <Stack.Screen name="store" />

        {/* Transaction history */}
        <Stack.Screen name="transactions" />

        {/* Auth screens */}
        <Stack.Screen name="auth" />

        {/* Licensing screens (QR scanner, activation) */}
        <Stack.Screen name="licensing" />

        {/* Support tickets */}
        <Stack.Screen name="support" />

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
  const hydrateCart = useCartStore((state) => state.hydrate);

  // Hydrate stores from SecureStore on app start
  useEffect(() => {
    hydrateBooth();
    hydrateCart();
  }, [hydrateBooth, hydrateCart]);

  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}
