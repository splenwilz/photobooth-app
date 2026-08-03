/**
 * Booths Stack Layout
 * 
 * Handles navigation for booth management screens.
 * @see https://docs.expo.dev/router/layouts/
 */

import { Stack } from 'expo-router';

export default function BoothsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="create" />
      <Stack.Screen name="[boothId]/critical-events" />
      <Stack.Screen name="[boothId]/cash-box" />
      <Stack.Screen name="[boothId]/invoices" />
    </Stack>
  );
}

