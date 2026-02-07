/**
 * Notifications Stack Layout
 *
 * Navigation layout for notification preference screens.
 * Uses stack navigation with hidden header (custom headers in screens).
 *
 * @see https://docs.expo.dev/router/layouts/ - Expo Router layouts
 */

import { Stack } from "expo-router";

export default function NotificationsLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen name="preferences" />
			<Stack.Screen name="history" />
		</Stack>
	);
}
