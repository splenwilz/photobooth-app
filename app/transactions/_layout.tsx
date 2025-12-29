/**
 * Transactions Stack Layout
 *
 * Stack navigation for transaction-related screens.
 */
import { Stack } from "expo-router";

export default function TransactionsLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" options={{ title: "All Transactions" }} />
		</Stack>
	);
}



