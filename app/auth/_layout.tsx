/**
 * Auth Layout
 * 
 * Stack navigation for authentication screens.
 * Provides consistent navigation and transitions for auth flows.
 * 
 * @see https://docs.expo.dev/router/advanced/stack/ - Expo Router Stack docs
 */

import { Stack } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function AuthLayout() {
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="signin" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
