import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { BRAND_COLOR, fontFamilyForWeight, scaleFont } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  const typeStyle =
    type === 'title'
      ? styles.title
      : type === 'defaultSemiBold'
        ? styles.defaultSemiBold
        : type === 'subtitle'
          ? styles.subtitle
          : type === 'link'
            ? styles.link
            : styles.default;

  // Resolve the effective weight (type default + caller override) and pick the
  // matching Geist family. The family carries the weight, so normalize
  // fontWeight to avoid faux-bold on Android.
  const flattened = (StyleSheet.flatten([typeStyle, style]) ?? {}) as TextStyle;
  const fontFamily = fontFamilyForWeight(flattened.fontWeight);

  return (
    <Text
      style={[{ color }, typeStyle, style, { fontFamily, fontWeight: 'normal' }]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: scaleFont(16),
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: scaleFont(16),
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: scaleFont(32),
    fontWeight: 'bold',
    lineHeight: scaleFont(32),
  },
  subtitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: scaleFont(16),
    color: BRAND_COLOR,
  },
});
