/**
 * Credits Stack Layout
 *
 * Navigation layout for credits-related screens.
 * Uses stack navigation with hidden header (custom headers in screens).
 *
 * @see https://docs.expo.dev/router/layouts/ - Expo Router layouts
 */

import { Stack } from "expo-router";

export default function CreditsLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		/>
	);
}

