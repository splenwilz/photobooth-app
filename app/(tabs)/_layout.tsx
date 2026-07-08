/**
 * Tab Navigation Layout
 * 
 * Main navigation structure for the BoothIQ app.
 * Provides bottom tab navigation with 5 main sections:
 *
 * 1. Dashboard - Live overview and hardware status
 * 2. Booths - Multi-booth management
 * 3. Store - Template marketplace
 * 4. Analytics - Sales and revenue analytics
 * 5. Settings - Configuration and preferences
 *
 * Alerts is reached from the header notification bell (with unread badge)
 * rather than the tab bar, keeping the bar to 5 primary destinations.
 *
 * @see https://docs.expo.dev/router/advanced/tabs/ - Expo Router Tabs docs
 */

import { Tabs } from 'expo-router';

import { PushPrimingModal } from '@/components/push-priming-modal';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, GeistFonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePushPriming } from '@/hooks/use-push-priming';
import { useRegisterPushDevice } from '@/hooks/use-register-push-device';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // Register this device for push once we're in the authed area (fires after
  // in-session login, not just cold start).
  useRegisterPushDevice();

  // One-time push priming prompt, shown once the operator has a booth.
  const { visible: primingVisible, dismiss: dismissPriming } = usePushPriming();

  return (
    <>
    <Tabs
      screenOptions={{
        // Use theme colors for tab bar
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          borderTopColor: Colors[colorScheme ?? 'light'].border,
          borderTopWidth: 1,
        },
        // Match the app's Geist type in the tab labels
        tabBarLabelStyle: {
          fontFamily: GeistFonts.medium,
        },
        // Hide default header (we use CustomHeader)
        headerShown: false,
        // Enable haptic feedback on tab press
        tabBarButton: HapticTab,
      }}
    >
      {/* Dashboard Tab - Home screen with live overview */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
        }}
      />

      {/* Booths Tab - Multi-booth management */}
      <Tabs.Screen
        name="booths"
        options={{
          title: 'Booths',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="photo.stack" color={color} />
          ),
        }}
      />

      {/* Store Tab - Template marketplace */}
      <Tabs.Screen
        name="store"
        options={{
          title: 'Store',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="bag.fill" color={color} />
          ),
        }}
      />

      {/* Analytics Tab - Sales and revenue analytics */}
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="chart.bar" color={color} />
          ),
        }}
      />

      {/* Alerts - hidden from the tab bar; reached via the header notification
          bell. href: null keeps the route mounted and navigable at /(tabs)/alerts. */}
      <Tabs.Screen
        name="alerts"
        options={{
          href: null,
        }}
      />

      {/* Settings Tab - Configuration and preferences */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="gear" color={color} />
          ),
        }}
      />
    </Tabs>
    <PushPrimingModal visible={primingVisible} onClose={dismissPriming} />
    </>
  );
}
