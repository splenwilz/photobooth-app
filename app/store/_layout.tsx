/**
 * Store Stack Layout
 *
 * Navigation stack for template store sub-screens:
 * - Template detail
 * - Cart
 * - Purchased templates
 */

import { Stack } from "expo-router";

export default function StoreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="cart" />
      <Stack.Screen name="purchased" />
    </Stack>
  );
}
