/**
 * Tab Navigation Layout
 * 
 * Main navigation structure for the PhotoBoothX app.
 * Provides bottom tab navigation with 5 main sections:
 * 
 * 1. Dashboard - Live overview and hardware status
 * 2. Booths - Multi-booth management
 * 3. Analytics - Sales and revenue analytics
 * 4. Alerts - Notification center
 * 5. Settings - Configuration and preferences
 * 
 * @see https://docs.expo.dev/router/advanced/tabs/ - Expo Router Tabs docs
 */

import { useMemo } from 'react';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, StatusColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAlerts } from '@/api/alerts/queries';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  // Fetch alerts to show unread count badge
  // @see GET /api/v1/analytics/alerts
  const { data: alertsData } = useAlerts();
  
  // Calculate unread alerts count
  const unreadCount = useMemo(() => {
    if (!alertsData?.alerts) return 0;
    return alertsData.alerts.filter(alert => !alert.isRead).length;
  }, [alertsData?.alerts]);

  return (
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

      {/* Alerts Tab - Notification center with unread badge */}
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="bell" color={color} />
          ),
          // Show badge with unread count (undefined hides the badge)
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: StatusColors.error,
            fontSize: 10,
            minWidth: 18,
            height: 18,
          },
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
  );
}
