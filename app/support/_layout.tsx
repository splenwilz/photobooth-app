/**
 * Support Stack Layout
 *
 * Navigation stack for support ticket screens.
 *
 * @see https://docs.expo.dev/router/advanced/stack/ - Expo Router Stack docs
 */

import { Stack } from "expo-router";

export default function SupportLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" />
			<Stack.Screen name="create" />
			<Stack.Screen name="[id]" />
		</Stack>
	);
}
