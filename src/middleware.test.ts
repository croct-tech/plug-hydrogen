import {ApiKey} from '@croct/sdk/apiKey';
import {Token} from '@croct/sdk/token';
import {RouterContextProvider} from 'react-router';
import {createCroctMiddleware, type CroctOptions} from './middleware';
import {writeCroctCookies} from './request';
import {getRequestContext, type RequestContext} from './config/context';

describe('createCroctMiddleware', () => {
    const APP_ID = '00000000-0000-0000-0000-000000000000';
    const OTHER_APP_ID = '11111111-1111-1111-1111-111111111111';
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

    let apiKey: ApiKey;

    type RunOptions = {
        cookies?: Record<string, string>,
        url?: string,
        headers?: Record<string, string>,
        env?: Record<string, string | undefined>,
        isLoggedIn?: boolean,
        customerId?: string | null,
        i18n?: {
            language: string,
            country: string,
        },
        options?: CroctOptions,
    };

    async function generateApiKey(identifier: string): Promise<ApiKey> {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'ECDSA',
                namedCurve: 'P-256',
            },
            true,
            ['sign', 'verify'],
        );
        const privateKey = Buffer.from(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey))
            .toString('base64');

        return ApiKey.of(identifier, `ES256;${privateKey}`);
    }

    function previewToken(exp: number): string {
        return `header.${Buffer.from(JSON.stringify({exp: exp})).toString('base64url')}.signature`;
    }

    function cookieValue(setCookies: string[], name: string): string | undefined {
        const cookie = setCookies.find(entry => entry.startsWith(`${name}=`));

        return cookie?.slice(`${name}=`.length).split(';')[0];
    }

    async function run(config: RunOptions = {}): Promise<{
        request: RequestContext,
        setCookies: string[],
        next: jest.Mock,
        query: jest.Mock,
    }> {
        const {
            cookies = {},
            url = 'https://example.com/',
            headers = {},
            env = {PUBLIC_CROCT_APP_ID: APP_ID},
            isLoggedIn = false,
            customerId = null,
            i18n = {
                language: 'EN',
                country: 'US',
            },
            options,
        } = config;

        const cookieHeader = Object.entries(cookies)
            .map(([key, value]) => `${key}=${value}`)
            .join('; ');
        const request = new Request(url, {
            headers: {
                ...(cookieHeader !== '' ? {cookie: cookieHeader} : {}),
                ...headers,
            },
        });

        const query = jest.fn(() => Promise.resolve({data: {customer: customerId !== null ? {id: customerId} : null}}));
        const context = new RouterContextProvider();

        Object.assign(context, {
            env: env,
            customerAccount: {
                isLoggedIn: jest.fn(() => Promise.resolve(isLoggedIn)),
                query: query,
            },
            storefront: {i18n: i18n},
        });

        const next = jest.fn(() => Promise.resolve(new Response('ok')));

        await createCroctMiddleware(options)(
            {
                request: request,
                context: context,
                params: {},
            } as never,
            next,
        );

        // Simulate server.ts writing the cookies after the session is committed.
        const response = new Response('ok');

        writeCroctCookies(response, context);

        return {
            request: getRequestContext(context, true),
            setCookies: response.headers.getSetCookie(),
            next: next,
            query: query,
        };
    }

    beforeAll(async () => {
        apiKey = await generateApiKey('00000000-0000-0000-0000-000000000001');
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should mint a fresh identity for a new visitor', async () => {
        const {request, setCookies, next} = await run({headers: {'x-forwarded-for': '1.2.3.4, 5.6.7.8'}});

        expect(next).toHaveBeenCalledTimes(1);
        expect(request.clientId).toMatch(UUID_PATTERN);
        expect(request.clientIp).toBe('1.2.3.4');
        expect(request.preferredLocale).toBe('en-US');
        expect(Token.parse(request.userToken).isAnonymous()).toBe(true);
        expect(cookieValue(setCookies, 'ct.client_id')).toBe(request.clientId);
        expect(cookieValue(setCookies, 'ct.user_token')).toBe(request.userToken);
    });

    it('should reuse a valid client id and anonymous token without querying the customer', async () => {
        const token = Token.issue(APP_ID)
            .withDuration(3600)
            .toString();
        const clientId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

        const {request, query} = await run({
            cookies: {
                'ct.client_id': clientId,
                'ct.user_token': token,
            },
        });

        expect(request.clientId).toBe(clientId);
        expect(request.userToken).toBe(token);
        expect(query).not.toHaveBeenCalled();
    });

    it('should issue a token with the customer id for a logged-in visitor', async () => {
        const {request, query} = await run({
            isLoggedIn: true,
            customerId: 'gid://shopify/Customer/123',
            cookies: {
                'ct.user_token': Token.issue(APP_ID)
                    .withDuration(3600)
                    .toString(),
            },
        });

        expect(query).toHaveBeenCalledTimes(1);
        expect(Token.parse(request.userToken).getSubject()).toBe('gid://shopify/Customer/123');
    });

    it('should return null identity when the customer query has no customer', async () => {
        const {request} = await run({
            isLoggedIn: true,
            customerId: null,
        });

        expect(Token.parse(request.userToken).isAnonymous()).toBe(true);
    });

    it('should mint a new client id when the cookie is malformed', async () => {
        const {request} = await run({cookies: {'ct.client_id': 'not-a-valid-id'}});

        expect(request.clientId).toMatch(UUID_PATTERN);
    });

    it('should resolve the client ip from x-real-ip as a fallback', async () => {
        const {request} = await run({headers: {'x-real-ip': '9.9.9.9'}});

        expect(request.clientIp).toBe('9.9.9.9');
    });

    it('should resolve a null client ip when no ip headers are present', async () => {
        const {request} = await run();

        expect(request.clientIp).toBeNull();
    });

    it('should capture the user agent and referrer', async () => {
        const {request} = await run({
            headers: {
                'user-agent': 'UA',
                referer: 'https://ref',
            },
        });

        expect(request.clientAgent).toBe('UA');
        expect(request.referrer).toBe('https://ref');
    });

    it('should accept a preview token from the query string and strip it from the uri', async () => {
        const token = previewToken(Math.floor(Date.now() / 1000) + 3600);
        const {
            request,
            setCookies,
        } = await run({url: `https://example.com/page?croct-preview=${token}&keep=1`});

        expect(request.previewToken).toBe(token);
        expect(request.uri).toBe('https://example.com/page?keep=1');
        expect(cookieValue(setCookies, 'ct.preview_token')).toBe(token);
    });

    it('should read the preview token from the cookie', async () => {
        const token = previewToken(Math.floor(Date.now() / 1000) + 3600);
        const {request} = await run({cookies: {'ct.preview_token': token}});

        expect(request.previewToken).toBe(token);
    });

    it('should clear the preview cookie when the token is invalid', async () => {
        const {request, setCookies} = await run({url: 'https://example.com/?croct-preview=bogus'});

        expect(request.previewToken).toBe('exit');
        expect(setCookies.find(entry => entry.startsWith('ct.preview_token='))).toContain('Max-Age=0');
    });

    it('should treat a literal exit preview cookie as a clear request', async () => {
        const {request, setCookies} = await run({cookies: {'ct.preview_token': 'exit'}});

        expect(request.previewToken).toBe('exit');
        expect(setCookies.find(entry => entry.startsWith('ct.preview_token='))).toContain('Max-Age=0');
    });

    it('should treat an expired preview token as invalid', async () => {
        const token = previewToken(Math.floor(Date.now() / 1000) - 10);
        const {request} = await run({cookies: {'ct.preview_token': token}});

        expect(request.previewToken).toBe('exit');
    });

    it('should use custom user id and locale resolvers', async () => {
        const {request} = await run({
            options: {
                userIdResolver: () => 'custom-user',
                localeResolver: () => 'fr-FR',
            },
        });

        expect(request.preferredLocale).toBe('fr-FR');
        expect(Token.parse(request.userToken).getSubject()).toBe('custom-user');
    });

    it('should re-issue an expired token', async () => {
        jest.useFakeTimers({now: Date.now()});

        const token = Token.issue(APP_ID)
            .withDuration(60)
            .toString();

        jest.setSystemTime(Date.now() + 120 * 1000);

        const {request} = await run({cookies: {'ct.user_token': token}});

        expect(request.userToken).not.toBe(token);
    });

    it('should re-issue a token issued for a different application', async () => {
        const token = Token.issue(OTHER_APP_ID)
            .withDuration(3600)
            .toString();
        const {request} = await run({cookies: {'ct.user_token': token}});

        expect(request.userToken).not.toBe(token);
        expect(Token.parse(request.userToken).getApplicationId()).toBe(APP_ID);
    });

    it('should re-issue an unsigned token when authentication is enabled', async () => {
        const token = Token.issue(APP_ID)
            .withDuration(3600)
            .toString();
        const {request} = await run({
            env: {
                PUBLIC_CROCT_APP_ID: APP_ID,
                CROCT_API_KEY: apiKey.export(),
            },
            cookies: {'ct.user_token': token},
        });

        expect(request.userToken).not.toBe(token);
        expect(Token.parse(request.userToken).isSigned()).toBe(true);
    });

    it('should re-sign a token signed with a different key, preserving the subject', async () => {
        const foreignKey = await generateApiKey('00000000-0000-0000-0000-000000000002');

        const token = await Token.issue(APP_ID, 'user-id')
            .withDuration(3600)
            .withTokenId('11111111-2222-3333-4444-555555555555')
            .signedWith(foreignKey);

        const {request} = await run({
            env: {
                PUBLIC_CROCT_APP_ID: APP_ID,
                CROCT_API_KEY: apiKey.export(),
            },
            cookies: {'ct.user_token': token.toString()},
            isLoggedIn: true,
            customerId: 'user-id',
        });

        const reissued = Token.parse(request.userToken);

        expect(reissued.getSubject()).toBe('user-id');
        expect(reissued.getTokenId()).toBe('11111111-2222-3333-4444-555555555555');
    });

    it('should re-sign an anonymous token signed with a different key', async () => {
        const foreignKey = await generateApiKey('00000000-0000-0000-0000-000000000003');

        // Anonymous token, signed with a foreign key, without a token id.
        const token = await Token.issue(APP_ID)
            .withDuration(3600)
            .signedWith(foreignKey);

        const {request} = await run({
            env: {
                PUBLIC_CROCT_APP_ID: APP_ID,
                CROCT_API_KEY: apiKey.export(),
            },
            cookies: {'ct.user_token': token.toString()},
        });

        const reissued = Token.parse(request.userToken);

        expect(reissued.isAnonymous()).toBe(true);
        expect(reissued.isSigned()).toBe(true);
    });

    it('should ignore a malformed token cookie', async () => {
        const {request} = await run({cookies: {'ct.user_token': 'not-a-token'}});

        expect(Token.parse(request.userToken).isAnonymous()).toBe(true);
    });
});
