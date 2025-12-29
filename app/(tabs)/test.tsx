import { ThemedText } from "@/components/themed-text";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
export default function TestScreen() {
	return (
		<SafeAreaView>
			<ThemedText>
				<Link href="/(tabs)/booths">Booths</Link>
				<Link href="/(tabs)/analytics">Analytics</Link>
				<Link href="/(tabs)/alerts">Alerts</Link>
				<Link href="/(tabs)/settings">Settings</Link>
				<Link href="/(tabs)/test">Test</Link>
				<Link href="/auth/signin">Sign In</Link>
				<Link href="/auth/signup">Sign Up</Link>
				<Link href="/onboarding">Onboarding</Link>
				<Link href="/onboarding/setup-booth">Setup Booth</Link>
			</ThemedText>
		</SafeAreaView>
	);
}
