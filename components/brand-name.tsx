import { Text } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/theme';

export type BrandNameProps = Omit<ThemedTextProps, 'children'> & {
  /** Color applied to the "IQ" portion of the wordmark. */
  iqColor?: string;
};

/**
 * The "BoothIQ" wordmark, with the "IQ" tinted in the brand teal.
 *
 * Rendered as live text (rather than baked into an image) so the brand
 * treatment stays consistent — and themeable — everywhere the name appears.
 * The nested Text inherits the parent's font size/weight from `type`.
 */
export function BrandName({
  type = 'title',
  iqColor = BRAND_COLOR,
  ...rest
}: BrandNameProps) {
  return (
    <ThemedText type={type} {...rest}>
      Booth<Text style={{ color: iqColor }}>IQ</Text>
    </ThemedText>
  );
}
