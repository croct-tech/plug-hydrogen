/**
 * @jest-environment jsdom
 */
import type {ReactNode} from 'react';
import {render} from '@testing-library/react';

describe('CroctProvider', () => {
    const cookie = {
        clientId: {
            name: 'ct.client_id',
            path: '/',
        },
        userToken: {
            name: 'ct.user_token',
            path: '/',
        },
        previewToken: {
            name: 'ct.preview_token',
            path: '/',
        },
    };

    function renderWith(config: unknown, props: Record<string, unknown> = {}): {
        provider: Record<string, unknown>,
        analytics: Record<string, unknown> | null,
    } {
        let provider: Record<string, unknown> = {};
        let analytics: Record<string, unknown> | null = null;

        jest.isolateModules(() => {
            jest.doMock(
                'virtual:croct/config',
                () => ({
                    __esModule: true,
                    default: config,
                }),
                {virtual: true},
            );
            jest.doMock(
                './analytics/CroctAnalytics',
                () => ({
                    __esModule: true,
                    CroctAnalytics: (received: Record<string, unknown>) => {
                        analytics = received;

                        return null;
                    },
                }),
            );
            jest.doMock(
                '@croct/plug-react/CroctProvider',
                () => ({
                    __esModule: true,
                    CroctProvider: (received: {children?: ReactNode}) => {
                        provider = received;

                        return received.children;
                    },
                }),
            );

            // eslint-disable-next-line @typescript-eslint/no-require-imports -- Per-config module isolation.
            const {CroctProvider} = require('./CroctProvider');

            render(<CroctProvider {...props}><span>child</span></CroctProvider>);
        });

        return {
            provider: provider,
            analytics: analytics,
        };
    }

    it('should forward the full configuration to the React provider', () => {
        const {provider} = renderWith({
            appId: 'config-app-id',
            debug: true,
            test: true,
            defaultPreferredLocale: 'en',
            defaultFetchTimeout: 5000,
            baseEndpointUrl: 'https://api.example.com',
            cookie: cookie,
        });

        expect(provider).toMatchObject({
            appId: 'config-app-id',
            disableCidMirroring: true,
            debug: true,
            test: true,
            defaultPreferredLocale: 'en',
            defaultFetchTimeout: 5000,
            baseEndpointUrl: 'https://api.example.com',
            cookie: cookie,
        });
    });

    it('should omit optional fields when they are unset', () => {
        const {provider} = renderWith({
            appId: 'config-app-id',
            debug: false,
            test: false,
            cookie: cookie,
        });

        expect(provider.appId).toBe('config-app-id');
        expect(provider.disableCidMirroring).toBe(true);
        expect(provider).not.toHaveProperty('debug');
        expect(provider).not.toHaveProperty('test');
        expect(provider).not.toHaveProperty('baseEndpointUrl');
        expect(provider).not.toHaveProperty('defaultPreferredLocale');
        expect(provider).not.toHaveProperty('defaultFetchTimeout');
    });

    it('should allow overriding the application id', () => {
        const {provider} = renderWith(
            {
                appId: 'config-app-id',
                debug: false,
                test: false,
                cookie: cookie,
            },
            {appId: 'override-app-id'},
        );

        expect(provider.appId).toBe('override-app-id');
    });

    it('should align tracking with consent in the default (auto) mode', () => {
        const {provider, analytics} = renderWith({
            appId: 'app',
            cookie: cookie,
        });

        expect(provider.track).toBe(false);
        expect(analytics).toEqual({tracking: 'auto'});
    });

    it('should track unconditionally in the always mode', () => {
        const {provider, analytics} = renderWith(
            {
                appId: 'app',
                cookie: cookie,
            },
            {track: 'always'},
        );

        expect(provider.track).toBe(true);
        expect(analytics).toEqual({tracking: 'always'});
    });

    it('should not render the analytics bridge in the never mode', () => {
        const {provider, analytics} = renderWith(
            {
                appId: 'app',
                cookie: cookie,
            },
            {track: 'never'},
        );

        expect(provider.track).toBe(false);
        expect(analytics).toBeNull();
    });

    it('should default the tracking mode to the baked configuration', () => {
        const {provider, analytics} = renderWith({
            appId: 'app',
            track: 'always',
            cookie: cookie,
        });

        expect(provider.track).toBe(true);
        expect(analytics).toEqual({tracking: 'always'});
    });

    it('should let the track prop override the baked tracking mode', () => {
        const {provider} = renderWith(
            {
                appId: 'app',
                track: 'always',
                cookie: cookie,
            },
            {track: 'auto'},
        );

        expect(provider.track).toBe(false);
    });

    it('should disable the plugin product-viewed auto-tracking to avoid duplicates', () => {
        const {provider} = renderWith({
            appId: 'app',
            cookie: cookie,
        });

        expect(provider.plugins).toEqual({autoTracking: {disableProductViewed: true}});
    });

    it('should merge user-provided plugins and auto-tracking options', () => {
        const {provider} = renderWith(
            {
                appId: 'app',
                cookie: cookie,
            },
            {
                plugins: {
                    customPlugin: {enabled: true},
                    autoTracking: {disableLinkOpened: true},
                },
            },
        );

        expect(provider.plugins).toEqual({
            customPlugin: {enabled: true},
            autoTracking: {
                disableProductViewed: true,
                disableLinkOpened: true,
            },
        });
    });
});
