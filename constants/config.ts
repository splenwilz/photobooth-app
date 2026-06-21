
/**
 * Environment Configuration
 * Centralized configuration for API endpoints and external services
 * 
 * Based on Expo environment variable best practices:
 * https://docs.expo.dev/guides/environment-variables/
 */

/**
 * Public website URLs — single source of truth for legal documents.
 *
 * The canonical, always-current Privacy Policy and Terms live on boothiq.com.
 * The app links out to them rather than shipping a divergent in-app copy
 * (Apple Guidelines 2.3 / 5.1.1(i)). The privacy URL is also the one to enter
 * in App Store Connect.
 */
export const WEB_URLS = {
    PRIVACY_POLICY: 'https://boothiq.com/privacy',
    TERMS_OF_SERVICE: 'https://boothiq.com/terms',
    SUPPORT: 'https://boothiq.com/support',
    // Hosted documentation / FAQ hub — destination for the Settings "Help Center" row.
    HELP_CENTER: 'https://boothiq.com/docs',
} as const;

// OAuth Configuration
// Redirect scheme must match the "scheme" in app.json for deep linking to work
// @see https://docs.expo.dev/guides/deep-linking/
export const OAUTH_CONFIG = {
    // Redirect URI scheme for mobile app (matches app.json scheme, without ://)
    REDIRECT_SCHEME: process.env.EXPO_PUBLIC_OAUTH_REDIRECT_SCHEME || 'photoboothapp',
    REDIRECT_PATH: process.env.EXPO_PUBLIC_OAUTH_REDIRECT_PATH || 'auth/callback',

    // Response type for OAuth flow
    RESPONSE_TYPE: 'code',
} as const;