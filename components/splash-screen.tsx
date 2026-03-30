import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

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
      <LinearGradient
        colors={["#069494", "#176161"]}
        locations={[0.0385, 1]}
        style={styles.gradient}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/splash-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
