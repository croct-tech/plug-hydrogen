/**
 * @jest-environment jsdom
 */
import {render} from '@testing-library/react';

describe('CroctProvider', () => {
    const cookie = {
        clientId: {name: 'ct.client_id', path: '/'},
        userToken: {name: 'ct.user_token', path: '/'},
        previewToken: {name: 'ct.preview_token', path: '/'},
    };

    function renderWith(config: unknown, props: Record<string, unknown> = {}): Record<string, unknown> {
        let captured: Record<string, unknown> = {};

        jest.isolateModules(() => {
            jest.doMock('virtual:croct/config', () => ({__esModule: true, default: config}), {virtual: true});
            jest.doMock('./analytics/CroctAnalytics', () => ({__esModule: true, CroctAnalytics: () => null}));
            jest.doMock(
                '@croct/plug-react/CroctProvider',
                () => ({
                    __esModule: true,
                    CroctProvider: (received: Record<string, unknown>) => {
                        captured = received;

                        return null;
                    },
                }),
            );

            // eslint-disable-next-line @typescript-eslint/no-require-imports -- Per-config module isolation.
            const {CroctProvider} = require('./CroctProvider');

            render(<CroctProvider {...props}><span>child</span></CroctProvider>);
        });

        return captured;
    }

    it('should forward the full configuration to the React provider', () => {
        const props = renderWith({
            appId: 'config-app-id',
            debug: true,
            test: true,
            defaultPreferredLocale: 'en',
            defaultFetchTimeout: 5000,
            baseEndpointUrl: 'https://api.example.com',
            cookie: cookie,
        });

        expect(props).toMatchObject({
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
        const props = renderWith({appId: 'config-app-id', debug: false, test: false, cookie: cookie});

        expect(props.appId).toBe('config-app-id');
        expect(props.disableCidMirroring).toBe(true);
        expect(props).not.toHaveProperty('debug');
        expect(props).not.toHaveProperty('test');
        expect(props).not.toHaveProperty('baseEndpointUrl');
        expect(props).not.toHaveProperty('defaultPreferredLocale');
        expect(props).not.toHaveProperty('defaultFetchTimeout');
    });

    it('should allow overriding the application id', () => {
        const props = renderWith(
            {appId: 'config-app-id', debug: false, test: false, cookie: cookie},
            {appId: 'override-app-id'},
        );

        expect(props.appId).toBe('override-app-id');
    });

    it('should disable tracking in the default (auto) tracking mode', () => {
        const props = renderWith({appId: 'app', cookie: cookie});

        expect(props.track).toBe(false);
    });

    it('should respect the track prop in the always tracking mode', () => {
        const props = renderWith({appId: 'app', cookie: cookie}, {tracking: 'always', track: true});

        expect(props.track).toBe(true);
    });

    it('should omit the track prop in the always tracking mode when it is unset', () => {
        const props = renderWith({appId: 'app', cookie: cookie}, {tracking: 'always'});

        // The SDK rejects an explicit `track: undefined`, so it must be omitted to fall back to its default.
        expect(props).not.toHaveProperty('track');
    });
});
