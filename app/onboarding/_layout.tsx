/**
 * Onboarding Layout
 * 
 * Stack navigation for onboarding screens.
 * No header shown for clean fullscreen experience.
 * 
 * @see https://docs.expo.dev/router/advanced/stack/ - Expo Router Stack docs
 */

import { Stack } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function OnboardingLayout() {
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="setup-booth" />
    </Stack>
  );
}

