import {type ResolverContext, writeCroctCookies} from './request';
import {createCroctContext} from './remix';

describe('createCroctContext', () => {
    const APP_ID = '00000000-0000-0000-0000-000000000000';

    function createResolverContext(): ResolverContext {
        return {
            env: {PUBLIC_CROCT_APP_ID: APP_ID},
            customerAccount: {
                isLoggedIn: () => Promise.resolve(false),
                query: () => Promise.resolve({data: {customer: null}}),
            },
            storefront: {
                i18n: {
                    language: 'EN',
                    country: 'US',
                },
            },
        };
    }

    it('should build the request context and write the cookies on the response', async () => {
        const request = new Request('https://example.com/');
        const croct = await createCroctContext(request, createResolverContext());

        expect(croct.preferredLocale).toBe('en-US');

        const loadContext = {
            ...createResolverContext(),
            croct: croct,
        };
        const response = new Response('ok');

        writeCroctCookies(response, loadContext);

        const setCookies = response.headers.getSetCookie();

        expect(setCookies.some(entry => entry.startsWith('ct.client_id='))).toBe(true);
        expect(setCookies.some(entry => entry.startsWith('ct.user_token='))).toBe(true);
    });

    it('should apply custom resolvers passed as options', async () => {
        const request = new Request('https://example.com/');
        const croct = await createCroctContext(request, createResolverContext(), {localeResolver: () => 'fr-FR'});

        expect(croct.preferredLocale).toBe('fr-FR');
    });

    it('should skip writing cookies when the request context is missing', () => {
        const response = new Response('ok');

        // Requests that bypass the middleware (e.g. React Router's `/__manifest`) have no context.
        writeCroctCookies(response, {env: {}});

        expect(response.headers.getSetCookie()).toHaveLength(0);
    });
});
