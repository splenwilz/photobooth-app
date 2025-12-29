import { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

import { saveTokens, saveUser } from '@/api/client';
import { useOAuth, useOAuthCallback } from '@/api/auth/oauth/queries';
import type { OAuthProvider } from '@/api/auth/oauth/types';
import type { AuthResponse } from '@/api/auth/types';
import { OAUTH_CONFIG } from '@/constants/config';

type UseSocialOAuthOptions = {
    /**
     * Optional redirect URI override. Defaults to the configured scheme/path.
     */
    redirectUri?: string;
    /**
     * Called whenever a user-facing error should be displayed.
     */
    onError?: (message: string) => void;
    /**
     * Custom success handler. Defaults to storing tokens + navigating to /(tabs).
     */
    onSuccess?: (response: AuthResponse) => Promise<void> | void;
};

const createStateParam = () =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * Shared OAuth handler for signup/signin flows.
 * Encapsulates authorization URL generation, browser session handling, state validation,
 * code exchange, and token persistence.
 */
export function useSocialOAuth(options: UseSocialOAuthOptions = {}) {
    const finalRedirectUri =
        options.redirectUri ?? `${OAUTH_CONFIG.REDIRECT_SCHEME}://${OAUTH_CONFIG.REDIRECT_PATH}`;
    const handleError = useCallback(
        (message: string) => {
            if (options.onError) {
                options.onError(message);
            } else {
                console.error('[Social OAuth]', message);
            }
        },
        [options],
    );

    const [isFlowActive, setIsFlowActive] = useState(false);
    const { mutateAsync: initiateOAuth, isPending: isInitiating } = useOAuth();
    const { mutateAsync: exchangeCode, isPending: isExchanging } = useOAuthCallback();

    const finalizeSuccess = useCallback(
        async (response: AuthResponse) => {
            await saveTokens(response.access_token, response.refresh_token);
            await saveUser(response.user);
            if (options.onSuccess) {
                await options.onSuccess(response);
            } else {
                router.replace('/(tabs)');
            }
        },
        [options],
    );

    const startSocialAuth = useCallback(
        async (provider: OAuthProvider) => {
            if (isFlowActive) {
                return;
            }

            setIsFlowActive(true);
            const stateParam = createStateParam();

            try {
                const oauthResponse = await initiateOAuth({
                    provider,
                    redirect_uri: finalRedirectUri,
                    state: stateParam,
                });

                if (!oauthResponse.authorization_url) {
                    handleError('Unable to start social authentication. Please try again.');
                    return;
                }

                const browserResult = await WebBrowser.openAuthSessionAsync(
                    oauthResponse.authorization_url,
                    finalRedirectUri,
                    {
                        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                        enableDefaultShareMenuItem: false,
                        showInRecents: true,
                    },
                );

                if (browserResult.type !== 'success') {
                    const cancellationMessage =
                        browserResult.type === 'cancel'
                            ? 'Social authentication was cancelled.'
                            : browserResult.type === 'dismiss'
                                ? 'Social authentication window was closed before completing.'
                                : browserResult.type === 'locked'
                                    ? 'Another authentication session is already in progress. Please wait and retry.'
                                    : 'Unable to complete social authentication. Please try again.';

                    handleError(cancellationMessage);
                    return;
                }

                if (!browserResult.url) {
                    handleError('Provider did not return a redirect URL. Please try again.');
                    return;
                }

                let callbackUrl: URL;
                try {
                    callbackUrl = new URL(browserResult.url);
                } catch {
                    handleError('Received an invalid redirect URL. Please try again.');
                    return;
                }

                const code = callbackUrl.searchParams.get('code');
                const error = callbackUrl.searchParams.get('error') ?? callbackUrl.searchParams.get('error_description');
                const returnedState = callbackUrl.searchParams.get('state');

                if (error) {
                    handleError(error);
                    return;
                }

                if (!code) {
                    handleError('Authentication code missing from provider response. Please try again.');
                    return;
                }

                if (stateParam && returnedState && stateParam !== returnedState) {
                    handleError('Security validation failed. Please try again.');
                    return;
                }

                if (stateParam && !returnedState) {
                    handleError('Provider response missing validation state. Please try again.');
                    return;
                }

                const authResponse = await exchangeCode({
                    code,
                    state: returnedState ?? stateParam,
                });

                if (!authResponse.access_token || !authResponse.refresh_token) {
                    handleError('Missing authentication tokens. Please sign in again.');
                    return;
                }

                await finalizeSuccess(authResponse);
            } catch (error) {
                handleError(
                    error instanceof Error ? error.message : 'Unable to complete social authentication. Please try again.',
                );
            } finally {
                setIsFlowActive(false);
            }
        },
        [exchangeCode, finalRedirectUri, finalizeSuccess, handleError, initiateOAuth, isFlowActive],
    );

    return {
        startSocialAuth,
        isSocialAuthPending: isInitiating || isExchanging || isFlowActive,
    };
}

