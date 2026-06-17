import type {Env} from './env';

const PATTERN = /^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/;

/**
 * @internal
 */
export function getAppId(env: Env): string {
    const appId = env.PUBLIC_CROCT_APP_ID ?? '';

    if (appId === '') {
        throw new Error(
            'Croct\'s Application ID is missing. '
            + 'Did you forget to set the `PUBLIC_CROCT_APP_ID` environment variable? '
            + 'For help, see: https://croct.help/sdk/hydrogen/missing-environment-variable',
        );
    }

    if (!PATTERN.test(appId)) {
        throw new Error(
            'Croct\'s Application ID is invalid. '
            + 'Please check the `PUBLIC_CROCT_APP_ID` environment variable.',
        );
    }

    return appId;
}
