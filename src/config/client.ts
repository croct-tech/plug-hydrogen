import type {Env} from './env';
import {getEnvEntry, getEnvFlag} from './env';
import {getAppId} from './appId';
import type {CookieOptions} from './cookie';
import {getClientIdCookieOptions, getPreviewCookieOptions, getUserTokenCookieOptions} from './cookie';
import {getDefaultFetchTimeout} from './timeout';

/**
 * The serializable configuration the Vite plugin bakes into the browser bundle for the provider.
 *
 * @internal
 */
export type ClientConfig = {
    appId: string,
    debug: boolean,
    test: boolean,
    defaultPreferredLocale?: string,
    defaultFetchTimeout?: number,
    baseEndpointUrl?: string,
    cookie: {
        clientId: CookieOptions,
        userToken: CookieOptions,
        previewToken: CookieOptions,
    },
};

/**
 * @internal
 */
export function getClientConfig(env: Env): ClientConfig {
    const timeout = getDefaultFetchTimeout(env);

    return {
        appId: getAppId(env),
        debug: getEnvFlag(env.PUBLIC_CROCT_DEBUG),
        test: getEnvFlag(env.PUBLIC_CROCT_TEST),
        ...getEnvEntry('defaultPreferredLocale', env.PUBLIC_CROCT_DEFAULT_PREFERRED_LOCALE),
        ...(timeout !== undefined && {defaultFetchTimeout: timeout}),
        ...getEnvEntry('baseEndpointUrl', env.PUBLIC_CROCT_BASE_ENDPOINT_URL),
        cookie: {
            clientId: getClientIdCookieOptions(env),
            userToken: getUserTokenCookieOptions(env),
            previewToken: getPreviewCookieOptions(env),
        },
    };
}
