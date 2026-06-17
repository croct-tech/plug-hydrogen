import {getClientConfig} from './client';

describe('getClientConfig', () => {
    const appId = '00000000-0000-0000-0000-000000000000';
    const original = process.env.NODE_ENV;

    beforeEach(() => {
        process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
        process.env.NODE_ENV = original;
    });

    it('should resolve the full configuration', () => {
        expect(getClientConfig({
            PUBLIC_CROCT_APP_ID: appId,
            PUBLIC_CROCT_DEBUG: 'true',
            PUBLIC_CROCT_TEST: 'true',
            PUBLIC_CROCT_DEFAULT_PREFERRED_LOCALE: 'en',
            PUBLIC_CROCT_BASE_ENDPOINT_URL: 'https://example.com',
        })).toEqual({
            appId: appId,
            debug: true,
            test: true,
            defaultPreferredLocale: 'en',
            baseEndpointUrl: 'https://example.com',
            cookie: {
                clientId: {name: 'ct.client_id', maxAge: 365 * 24 * 60 * 60, path: '/'},
                userToken: {name: 'ct.user_token', maxAge: 7 * 24 * 60 * 60, path: '/'},
                previewToken: {name: 'ct.preview_token', path: '/'},
            },
        });
    });

    it('should omit optional fields when unset', () => {
        const config = getClientConfig({PUBLIC_CROCT_APP_ID: appId});

        expect(config.debug).toBe(false);
        expect(config.test).toBe(false);
        expect(config).not.toHaveProperty('defaultPreferredLocale');
        expect(config).not.toHaveProperty('baseEndpointUrl');
        expect(config).not.toHaveProperty('defaultFetchTimeout');
    });

    it('should include the default fetch timeout in production', () => {
        process.env.NODE_ENV = 'production';

        expect(getClientConfig({PUBLIC_CROCT_APP_ID: appId}).defaultFetchTimeout).toBe(2000);
    });
});
