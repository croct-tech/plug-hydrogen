import {ApiKey} from '@croct/sdk/apiKey';
import {
    getApiKey,
    getAuthenticationKey,
    getTokenDuration,
    isUserTokenAuthenticationEnabled,
    issueToken,
} from './security';

describe('security', () => {
    const appId = '00000000-0000-0000-0000-000000000000';
    const identifier = '00000000-0000-0000-0000-000000000000';
    const privateKey = 'ES256;MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg3TbbvRM7DNwxY3XGWDmlSRPSfZ9b+ch9TO3jQ6'
        + '8Zyj+hRANCAASmJj/EiEhUaLAWnbXMTb/85WADkuFgoELGZ5ByV7YPlbb2wY6oLjzGkpF6z8iDrvJ4kV6EhaJ4n0HwSQckVLNE';
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

    async function generateApiKey(): Promise<{apiKey: ApiKey, keyPair: CryptoKeyPair}> {
        const keyPair = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
        const localPrivateKey = Buffer
            .from(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey))
            .toString('base64');

        return {
            apiKey: ApiKey.of('00000000-0000-0000-0000-000000000001', `ES256;${localPrivateKey}`),
            keyPair: keyPair,
        };
    }

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('getApiKey', () => {
        it('should return the API key', () => {
            const key = `${identifier}:${privateKey}`;

            expect(getApiKey({CROCT_API_KEY: key}).export()).toBe(key);
        });

        it('should throw an error when the API key is missing', () => {
            expect(() => getApiKey({})).toThrow('Croct\'s API key is missing.');
        });

        it('should throw an error when the API key is invalid', () => {
            expect(() => getApiKey({CROCT_API_KEY: 'invalid'})).toThrow('Croct\'s API key is invalid.');
        });
    });

    describe('getAuthenticationKey', () => {
        it('should return the authentication key', () => {
            const key = `${identifier}:${privateKey}`;

            expect(getAuthenticationKey({CROCT_API_KEY: key}).export()).toBe(key);
        });

        it('should throw an error when the API key has no private key', () => {
            expect(() => getAuthenticationKey({CROCT_API_KEY: identifier}))
                .toThrow('Croct\'s API key does not have a private key.');
        });
    });

    describe('isUserTokenAuthenticationEnabled', () => {
        const key = `${identifier}:${privateKey}`;

        it('should return false when no API key is set', () => {
            expect(isUserTokenAuthenticationEnabled({})).toBe(false);
        });

        it('should return true when an API key is set', () => {
            expect(isUserTokenAuthenticationEnabled({CROCT_API_KEY: key})).toBe(true);
        });

        it('should return false when explicitly disabled', () => {
            expect(isUserTokenAuthenticationEnabled({
                CROCT_API_KEY: key,
                CROCT_DISABLE_USER_TOKEN_AUTHENTICATION: 'true',
            })).toBe(false);
        });
    });

    describe('getTokenDuration', () => {
        it('should return the default duration when unset', () => {
            expect(getTokenDuration({})).toBe(24 * 60 * 60);
        });

        it('should return the configured duration', () => {
            expect(getTokenDuration({CROCT_TOKEN_DURATION: '3600'})).toBe(3600);
        });

        it('should throw an error when the duration is invalid', () => {
            expect(() => getTokenDuration({CROCT_TOKEN_DURATION: 'invalid'}))
                .toThrow('The token duration must be a positive integer.');
            expect(() => getTokenDuration({CROCT_TOKEN_DURATION: '-1'}))
                .toThrow('The token duration must be a positive integer.');
        });
    });

    describe('issueToken', () => {
        it('should issue a signed token for an identified user', async () => {
            jest.useFakeTimers({now: Date.now()});

            const {apiKey, keyPair} = await generateApiKey();
            const token = await issueToken(
                {
                    PUBLIC_CROCT_APP_ID: appId,
                    CROCT_API_KEY: apiKey.export(),
                    CROCT_TOKEN_DURATION: '3600',
                },
                'user-id',
            );

            expect(token.isSigned()).toBe(true);
            expect(token.getSubject()).toBe('user-id');
            expect(token.getApplicationId()).toBe(appId);
            expect(token.getExpirationTime()).toBe(Math.floor(Date.now() / 1000) + 3600);
            expect(token.getTokenId()).toMatch(UUID_PATTERN);

            const [header, payload, signature] = token.toString().split('.');
            const verification = crypto.subtle.verify(
                {name: 'ECDSA', hash: {name: 'SHA-256'}},
                keyPair.publicKey,
                Buffer.from(signature, 'base64url'),
                Buffer.from(`${header}.${payload}`),
            );

            await expect(verification).resolves.toBe(true);
        });

        it('should issue a signed anonymous token', async () => {
            const {apiKey} = await generateApiKey();
            const token = await issueToken({PUBLIC_CROCT_APP_ID: appId, CROCT_API_KEY: apiKey.export()}, null);

            expect(token.isAnonymous()).toBe(true);
            expect(token.isSigned()).toBe(true);
        });

        it('should preserve the given token ID', async () => {
            const {apiKey} = await generateApiKey();
            const token = await issueToken(
                {PUBLIC_CROCT_APP_ID: appId, CROCT_API_KEY: apiKey.export()},
                'user-id',
                '11111111-2222-3333-4444-555555555555',
            );

            expect(token.getTokenId()).toBe('11111111-2222-3333-4444-555555555555');
        });

        it('should issue an unsigned token when authentication is disabled', async () => {
            const token = await issueToken(
                {
                    PUBLIC_CROCT_APP_ID: appId,
                    CROCT_API_KEY: `${identifier}:${privateKey}`,
                    CROCT_DISABLE_USER_TOKEN_AUTHENTICATION: 'true',
                },
                'user-id',
                '11111111-2222-3333-4444-555555555555',
            );

            expect(token.isSigned()).toBe(false);
            expect(token.getTokenId()).toBeNull();
        });

        it('should issue an unsigned token when no API key is set', async () => {
            const token = await issueToken({PUBLIC_CROCT_APP_ID: appId}, 'user-id');

            expect(token.isSigned()).toBe(false);
            expect(token.getSubject()).toBe('user-id');
        });

        it('should default to an anonymous user', async () => {
            const token = await issueToken({PUBLIC_CROCT_APP_ID: appId});

            expect(token.isAnonymous()).toBe(true);
        });
    });
});
