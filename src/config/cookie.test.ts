import {getClientIdCookieOptions, getPreviewCookieOptions, getUserTokenCookieOptions} from './cookie';

describe('cookie', () => {
    const original = process.env.NODE_ENV;

    beforeEach(() => {
        process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
        process.env.NODE_ENV = original;
    });

    describe('getClientIdCookieOptions', () => {
        it('should return the default options', () => {
            expect(getClientIdCookieOptions({})).toEqual({
                name: 'ct.client_id',
                maxAge: 365 * 24 * 60 * 60,
                path: '/',
            });
        });

        it('should apply custom name, duration and domain', () => {
            expect(getClientIdCookieOptions({
                PUBLIC_CROCT_CLIENT_ID_COOKIE_NAME: 'cid',
                PUBLIC_CROCT_CLIENT_ID_COOKIE_DURATION: '10',
                PUBLIC_CROCT_CLIENT_ID_COOKIE_DOMAIN: 'example.com',
            })).toEqual({
                name: 'cid',
                maxAge: 10,
                path: '/',
                domain: 'example.com',
            });
        });

        it('should add secure and sameSite in production', () => {
            process.env.NODE_ENV = 'production';

            expect(getClientIdCookieOptions({})).toMatchObject({
                secure: true,
                sameSite: 'none',
            });
        });

        it('should throw an error when the duration is invalid', () => {
            expect(() => getClientIdCookieOptions({PUBLIC_CROCT_CLIENT_ID_COOKIE_DURATION: 'invalid'}))
                .toThrow('Croct\'s cookie duration must be a positive integer');
            expect(() => getClientIdCookieOptions({PUBLIC_CROCT_CLIENT_ID_COOKIE_DURATION: '0'}))
                .toThrow('Croct\'s cookie duration must be a positive integer');
        });
    });

    describe('getUserTokenCookieOptions', () => {
        it('should return the default options', () => {
            expect(getUserTokenCookieOptions({})).toEqual({
                name: 'ct.user_token',
                maxAge: 7 * 24 * 60 * 60,
                path: '/',
            });
        });

        it('should apply custom name, duration and domain', () => {
            expect(getUserTokenCookieOptions({
                PUBLIC_CROCT_USER_TOKEN_COOKIE_NAME: 'ut',
                PUBLIC_CROCT_USER_TOKEN_COOKIE_DURATION: '20',
                PUBLIC_CROCT_USER_TOKEN_COOKIE_DOMAIN: 'example.com',
            })).toEqual({
                name: 'ut',
                maxAge: 20,
                path: '/',
                domain: 'example.com',
            });
        });

        it('should throw an error when the duration is invalid', () => {
            expect(() => getUserTokenCookieOptions({PUBLIC_CROCT_USER_TOKEN_COOKIE_DURATION: 'invalid'}))
                .toThrow('Croct\'s cookie duration must be a positive integer');
        });
    });

    describe('getPreviewCookieOptions', () => {
        it('should return the default options', () => {
            expect(getPreviewCookieOptions({})).toEqual({
                name: 'ct.preview_token',
                path: '/',
            });
        });

        it('should apply custom name and domain', () => {
            expect(getPreviewCookieOptions({
                PUBLIC_CROCT_PREVIEW_TOKEN_COOKIE_NAME: 'pt',
                PUBLIC_CROCT_PREVIEW_TOKEN_COOKIE_DOMAIN: 'example.com',
            })).toEqual({
                name: 'pt',
                path: '/',
                domain: 'example.com',
            });
        });
    });
});
