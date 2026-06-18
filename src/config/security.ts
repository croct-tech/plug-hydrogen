import {ApiKey} from '@croct/sdk/apiKey';
import {Token} from '@croct/sdk/token';
import type {Env} from './env';
import {getAppId} from './appId';

/**
 * @internal
 */
export function getApiKey(env: Env): ApiKey {
    const apiKey = env.CROCT_API_KEY;

    if (apiKey === undefined) {
        throw new Error(
            'Croct\'s API key is missing. '
            + 'Did you forget to set the `CROCT_API_KEY` environment variable? '
            + 'For help, see: https://croct.help/sdk/hydrogen/missing-environment-variable',
        );
    }

    try {
        return ApiKey.parse(apiKey);
    } catch {
        throw new Error('Croct\'s API key is invalid. Please check the `CROCT_API_KEY` environment variable.');
    }
}

/**
 * @internal
 */
export function getAuthenticationKey(env: Env): ApiKey {
    const apiKey = getApiKey(env);

    if (!apiKey.hasPrivateKey()) {
        throw new Error(
            'Croct\'s API key does not have a private key. '
            + 'Please generate an API key with authenticate permissions and update '
            + 'the `CROCT_API_KEY` environment variable.',
        );
    }

    return apiKey;
}

/**
 * @internal
 */
export function isUserTokenAuthenticationEnabled(env: Env): boolean {
    return env.CROCT_API_KEY !== undefined
        && env.CROCT_DISABLE_USER_TOKEN_AUTHENTICATION !== 'true';
}

/**
 * @internal
 */
export function getTokenDuration(env: Env): number {
    const duration = env.CROCT_TOKEN_DURATION;

    if (duration === undefined) {
        return 24 * 60 * 60;
    }

    const parsedDuration = Number.parseInt(duration, 10);

    if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
        throw new Error(
            'The token duration must be a positive integer. '
            + 'Please check the `CROCT_TOKEN_DURATION` environment variable.',
        );
    }

    return parsedDuration;
}

/**
 * @internal
 */
export function issueToken(env: Env, userId: string | null = null, tokenId?: string): Promise<Token> {
    const token = Token.issue(getAppId(env), userId)
        .withDuration(getTokenDuration(env));

    if (isUserTokenAuthenticationEnabled(env)) {
        return token.withTokenId(tokenId ?? crypto.randomUUID())
            .signedWith(getAuthenticationKey(env));
    }

    return Promise.resolve(token);
}
