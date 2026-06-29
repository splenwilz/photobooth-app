import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";
import { BRAND_COLOR } from "@/constants/theme";

interface SplashScreenProps {
  onFinish: () => void;
  ready: boolean;
}

const FADE_DURATION = 400;
const HOLD_DURATION = 1500;

export function SplashScreen({ onFinish, ready }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!ready) return;

    const timeout = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, HOLD_DURATION);

    return () => clearTimeout(timeout);
  }, [ready, fadeAnim, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.background}>
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/splash-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BRAND_COLOR,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 200,
  },
});
