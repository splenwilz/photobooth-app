/**
 * PhotoBoothX Theme Configuration
 * Dark "Command Center" theme with cohesive brand identity
 * 
 * Design Philosophy:
 * - ONE brand color (Cyan) for all interactive/branded elements
 * - Status colors ONLY for status indicators (success/warning/error)
 * - Opacity variations for visual hierarchy, not different hues
 * 
 * @see https://docs.expo.dev/guides/color-schemes/
 */

import { Platform } from 'react-native';

/**
 * Brand Color - Deep Teal
 * A darker, more sophisticated accent color for the "command center" aesthetic.
 * Used throughout the app for:
 * - Tab icons (selected)
 * - Buttons and CTAs
 * - Links and interactive elements
 * - Charts and data visualization
 * - Active/selected states
 */
export const BRAND_COLOR = '#0891B2';

/**
 * Status Colors - ONLY for hardware/system status
 * Following traffic light convention:
 * - Success (Green): Healthy, online, completed
 * - Warning (Amber): Attention needed, low supplies
 * - Error (Red): Critical, offline, failed
 */
export const StatusColors = {
  success: '#00E676',      // Green - healthy/online/completed
  warning: '#FFB300',      // Amber - warning/attention needed
  error: '#FF5252',        // Red - critical/offline/failed
  info: '#2196F3',         // Blue - informational alerts
  neutral: '#9E9E9E',      // Gray - unknown/neutral state (fallback)
} as const;

/**
 * Chart Colors - Brand color with opacity variations
 * Creates visual distinction without introducing new hues
 */
export const ChartColors = {
  primary: BRAND_COLOR,              // 100% - Main data
  secondary: '#0E7490',              // Slightly darker teal
  tertiary: '#155E75',               // Even darker for depth
  // For multi-series charts, use opacity:
  // withAlpha(BRAND_COLOR, 0.8), withAlpha(BRAND_COLOR, 0.6), etc.
} as const;

/**
 * Card/Surface Colors for layered UI
 * Creates depth in the dark theme
 */
export const SurfaceColors = {
  light: {
    card: '#FFFFFF',
    cardElevated: '#F8FAFC',
    border: '#E2E8F0',
  },
  dark: {
    card: '#161B22',           // Slightly lighter than background
    cardElevated: '#1C2128',   // For elevated cards
    border: '#30363D',         // Subtle borders
  },
} as const;

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#687076',
    background: '#F8FAFC',
    tint: BRAND_COLOR,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: BRAND_COLOR,
    card: SurfaceColors.light.card,
    cardElevated: SurfaceColors.light.cardElevated,
    border: SurfaceColors.light.border,
  },
  dark: {
    text: '#E6EDF3',
    textSecondary: '#8B949E',
    background: '#0D1117',     // Deep navy - GitHub dark style
    tint: BRAND_COLOR,
    icon: '#8B949E',
    tabIconDefault: '#8B949E',
    tabIconSelected: BRAND_COLOR,
    card: SurfaceColors.dark.card,
    cardElevated: SurfaceColors.dark.cardElevated,
    border: SurfaceColors.dark.border,
  },
};

/**
 * Helper function to add alpha channel to hex colors
 * Use this for creating opacity variations of the brand color
 * 
 * @param hex - The hex color string (e.g., '#00D9FF')
 * @param alpha - Alpha value between 0 and 1
 * @returns Hex color with alpha channel appended
 * 
 * @example
 * withAlpha(BRAND_COLOR, 0.2) // Returns '#00D9FF33' (20% opacity)
 * withAlpha(BRAND_COLOR, 0.5) // Returns '#00D9FF80' (50% opacity)
 */
export const withAlpha = (hex: string, alpha: number): string => {
  // Validate hex format
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexRegex.test(hex)) {
    console.warn(`Invalid hex color: ${hex}, returning original value`);
    return hex;
  }

  // Convert short-form hex (#fff) to long-form (#ffffff)
  const normalizedHex = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;

  // Convert alpha (0-1) to hex (00-ff)
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');

  return `${normalizedHex}${alphaHex}`;
};

/**
 * Platform-specific font families
 */
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/**
 * Spacing scale following 4px base unit
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * Border radius scale
 */
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;
