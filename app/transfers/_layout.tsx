/**
 * Transfers Stack Layout
 *
 * Navigation stack for incoming booth-transfer offers (buyer side).
 *
 * @see https://docs.expo.dev/router/advanced/stack/ - Expo Router Stack docs
 */

import { Stack } from "expo-router";

export default function TransfersLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" />
			<Stack.Screen name="[transferId]" />
		</Stack>
	);
}
