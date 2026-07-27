
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

/**
 * External purchases (US storefront only — App Store Guideline 3.1.1(a)).
 *
 * Purchase buttons that open Stripe web checkout may only be shown to users
 * on the United States App Store storefront; all other storefronts must stay
 * browse-only with no links or calls to action. The storefront check lives in
 * hooks/use-external-purchases.ts — this flag is the business kill switch on
 * top of it (e.g. if Apple's 0%-commission status changes). EXPO_PUBLIC_*
 * values are inlined when the JS bundle is built, so the flag can be flipped
 * with an `eas update` — no store release required.
 */
export const EXTERNAL_PURCHASES = {
    /** Base URL for checkout success/cancel redirect pages on the website. */
    WEBSITE_URL: process.env.EXPO_PUBLIC_WEBSITE_URL || 'https://boothiq.com',
} as const;

/** Read at call time so tests can vary the env var per case. */
export function isExternalPurchasesFlagEnabled(): boolean {
    return process.env.EXPO_PUBLIC_EXTERNAL_PURCHASES_ENABLED === 'true';
}

// OAuth Configuration
// Redirect scheme must match the "scheme" in app.json for deep linking to work
// @see https://docs.expo.dev/guides/deep-linking/
export const OAUTH_CONFIG = {
    // Redirect URI scheme for mobile app (matches app.json scheme, without ://)
    REDIRECT_SCHEME: process.env.EXPO_PUBLIC_OAUTH_REDIRECT_SCHEME || 'boothiq',
    REDIRECT_PATH: process.env.EXPO_PUBLIC_OAUTH_REDIRECT_PATH || 'auth/callback',

    // Response type for OAuth flow
    RESPONSE_TYPE: 'code',
} as const;