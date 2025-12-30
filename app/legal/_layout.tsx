/**
 * Legal Screens Layout
 *
 * Layout for Terms of Service and Privacy Policy screens.
 * These screens are accessible from Settings.
 *
 * @see https://docs.expo.dev/router/introduction/ - Expo Router docs
 */

import { Stack } from "expo-router";

export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

