import {
  Image,
  View,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { BrandName } from '@/components/brand-name';
import type { ThemedTextProps } from '@/components/themed-text';
import { BRAND_COLOR, withAlpha } from '@/constants/theme';

export type BrandHeaderProps = {
  /** Style for the outer wrapper (e.g. column vs. row layout). */
  wrapperStyle?: StyleProp<ViewStyle>;
  /** Style for the tinted rounded container holding the mark. */
  markContainerStyle?: StyleProp<ViewStyle>;
  /** Size/style for the mark image itself. */
  markStyle?: StyleProp<ImageStyle>;
  /** ThemedText type for the wordmark. */
  nameType?: ThemedTextProps['type'];
  /** Style for the wordmark text. */
  nameStyle?: StyleProp<TextStyle>;
};

/**
 * The shared BoothIQ brand lockup: the booth mark in a brand-tinted
 * container next to the wordmark. Centralizes the asset, the tint, and the
 * accessibility treatment so both screens stay in sync as branding evolves.
 *
 * The mark is decorative and hidden from screen readers; the wordmark
 * (BrandName) is the only accessible label.
 */
export function BrandHeader({
  wrapperStyle,
  markContainerStyle,
  markStyle,
  nameType = 'title',
  nameStyle,
}: BrandHeaderProps) {
  return (
    <View style={wrapperStyle}>
      <View
        style={[
          { backgroundColor: withAlpha(BRAND_COLOR, 0.15) },
          markContainerStyle,
        ]}
      >
        <Image
          source={require('@/assets/images/brand-mark.png')}
          style={markStyle}
          resizeMode="contain"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
      <BrandName type={nameType} style={nameStyle} />
    </View>
  );
}
