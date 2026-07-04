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

  // If the caller supplied their own fontFamily (e.g. a monospace license/
  // registration code), respect it and leave their weight alone. Otherwise map
  // the effective weight to the matching Geist family and normalize fontWeight
  // (the family carries the weight, so this avoids faux-bold on Android).
  const flattened = (StyleSheet.flatten([typeStyle, style]) ?? {}) as TextStyle;
  const fontOverride = flattened.fontFamily
    ? null
    : { fontFamily: fontFamilyForWeight(flattened.fontWeight), fontWeight: 'normal' as const };

  return (
    <Text
      style={[{ color }, typeStyle, style, fontOverride]}
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
