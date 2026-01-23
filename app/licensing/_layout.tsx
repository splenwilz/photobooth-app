/**
 * Licensing Stack Layout
 *
 * Handles navigation for booth activation and licensing screens.
 * @see https://docs.expo.dev/router/layouts/
 */

import { Stack } from "expo-router";

export default function LicensingLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen name="scan" />
		</Stack>
	);
}
