import {fetchContent as loadFromApi} from '@croct/plug-react/api';
import {ApiKey} from '@croct/sdk/apiKey';
import type {Env} from '../config/env';
import {type CroctContext, type RequestContext} from '../config/context';
import {fetchContent} from './fetchContent';

jest.mock(
    '@croct/plug-react/api',
    () => ({
        fetchContent: jest.fn(),
        evaluate: jest.fn(),
    }),
);

describe('fetchContent', () => {
    const APP_ID = '00000000-0000-0000-0000-000000000000';
    const API_KEY = '00000000-0000-0000-0000-000000000000:ES256;MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg3'
        + 'TbbvRM7DNwxY3XGWDmlSRPSfZ9b+ch9TO3jQ68Zyj+hRANCAASmJj/EiEhUaLAWnbXMTb/85WADkuFgoELGZ5ByV7YPlbb2wY6oLjzGk'
        + 'pF6z8iDrvJ4kV6EhaJ4n0HwSQckVLNE';

    const loadContent = jest.mocked(loadFromApi);
    const original = process.env.NODE_ENV;

    const baseRequest: RequestContext = {
        clientId: 'cid',
        userToken: 'tok',
        uri: 'https://example.com/',
        clientAgent: null,
        referrer: null,
        clientIp: null,
        preferredLocale: null,
        previewToken: null,
    };

    function createScope(env: Env, request: RequestContext = baseRequest): CroctContext {
        return {
            env: env,
            croct: request,
        };
    }

    beforeEach(() => {
        loadContent.mockResolvedValue({
            content: {
                headline: 'Hi',
                _component: null,
            },
        });
        process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
        process.env.NODE_ENV = original;
    });

    it('should forward the full request context to the SDK', async () => {
        process.env.NODE_ENV = 'production';

        const scope = createScope(
            {
                PUBLIC_CROCT_APP_ID: APP_ID,
                CROCT_API_KEY: API_KEY,
                PUBLIC_CROCT_BASE_ENDPOINT_URL: 'https://api',
                PUBLIC_CROCT_DEBUG: 'true',
            },
            {
                clientId: 'cid',
                userToken: 'tok',
                uri: 'https://example.com/page',
                clientAgent: 'UA',
                referrer: 'https://ref',
                clientIp: '1.2.3.4',
                preferredLocale: 'en-US',
                previewToken: 'preview-jwt',
            },
        );

        const result = await fetchContent('home-banner', {scope: scope});

        expect(result).toEqual({
            content: {
                headline: 'Hi',
                _component: null,
            },
        });
        expect(loadContent).toHaveBeenCalledWith('home-banner', expect.objectContaining({
            apiKey: expect.any(ApiKey),
            clientId: 'cid',
            userToken: 'tok',
            clientIp: '1.2.3.4',
            clientAgent: 'UA',
            previewToken: 'preview-jwt',
            preferredLocale: 'en-US',
            baseEndpointUrl: 'https://api',
            timeout: 2000,
            extra: {cache: 'no-store'},
            context: {
                page: {
                    url: 'https://example.com/page',
                    referrer: 'https://ref',
                },
            },
        }));
    });

    it('should merge the provided evaluation context with the derived page', async () => {
        const scope = createScope({
            PUBLIC_CROCT_APP_ID: APP_ID,
            CROCT_API_KEY: API_KEY,
        });

        await fetchContent('home-banner', {
            scope: scope,
            context: {
                attributes: {plan: 'pro'},
                page: {
                    url: 'https://ignored',
                    title: 'Home',
                },
            },
        });

        expect(loadContent.mock.calls[0][1]).toHaveProperty('context', {
            attributes: {plan: 'pro'},
            page: {
                url: 'https://example.com/',
                title: 'Home',
            },
        });
    });

    it('should fall back to defaults for a bare request context', async () => {
        const scope = createScope({
            PUBLIC_CROCT_APP_ID: APP_ID,
            CROCT_API_KEY: API_KEY,
        });
        const logger = {
            log: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        await fetchContent('home-banner', {
            scope: scope,
            logger: logger,
        });

        const options = loadContent.mock.calls[0][1]!;

        expect(options).toHaveProperty('clientIp', '127.0.0.1');
        expect(options.logger).toBe(logger);
        expect(options).not.toHaveProperty('clientAgent');
        expect(options).not.toHaveProperty('previewToken');
        expect(options).not.toHaveProperty('preferredLocale');
        expect(options).not.toHaveProperty('baseEndpointUrl');
        expect(options).not.toHaveProperty('timeout');
        expect(options).toHaveProperty('context', {page: {url: 'https://example.com/'}});
    });

    it('should exclude an exiting preview token and use the filtered logger', async () => {
        const scope = createScope(
            {
                PUBLIC_CROCT_APP_ID: APP_ID,
                CROCT_API_KEY: API_KEY,
            },
            {
                ...baseRequest,
                previewToken: 'exit',
            },
        );

        await fetchContent('home-banner', {scope: scope});

        const options = loadContent.mock.calls[0][1]!;

        expect(options).not.toHaveProperty('previewToken');
        expect(options.logger).toBeDefined();
    });
});
