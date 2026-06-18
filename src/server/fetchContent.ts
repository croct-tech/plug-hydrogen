import type {DynamicContentOptions, FetchResponse} from '@croct/plug-react/api';
import {fetchContent as loadContent} from '@croct/plug-react/api';
import type {SlotContent, VersionedSlotId} from '@croct/plug/slot';
import type {JsonObject} from '@croct/json';
import type {FetchResponseOptions} from '@croct/sdk/contentFetcher';
import {ConsoleLogger} from '@croct/sdk/logging/consoleLogger';
import {FilteredLogger} from '@croct/sdk/logging/filteredLogger';
import {getEnvEntry, getEnvFlag} from '../config/env';
import {getApiKey} from '../config/security';
import {getDefaultFetchTimeout} from '../config/timeout';
import {type CroctContext, getEnv, getRequestContext} from '../config/context';

export type FetchOptions<T extends JsonObject = JsonObject> =
    Omit<DynamicContentOptions<T>, 'apiKey' | 'appId'> & {
        scope: CroctContext,
    };

export type {FetchResponse} from '@croct/plug-react/api';

export async function fetchContent<
    I extends VersionedSlotId,
    C extends JsonObject,
    O extends FetchResponseOptions = FetchResponseOptions,
>(
    slotId: I,
    options: Pick<O, keyof FetchResponseOptions> & FetchOptions<SlotContent<I, C>>,
): Promise<FetchResponse<I, C, never, O>> {
    const {scope, context, logger, ...rest} = options;
    const env = getEnv(scope);
    const request = getRequestContext(scope, true);
    const timeout = getDefaultFetchTimeout(env);

    return loadContent<I, C, O>(slotId, {
        apiKey: getApiKey(env),
        clientId: request.clientId,
        userToken: request.userToken,
        clientIp: request.clientIp ?? '127.0.0.1',
        ...(request.clientAgent !== null && {clientAgent: request.clientAgent}),
        ...(request.previewToken !== null && request.previewToken !== 'exit' && {previewToken: request.previewToken}),
        ...(request.preferredLocale !== null && {preferredLocale: request.preferredLocale}),
        ...getEnvEntry('baseEndpointUrl', env.PUBLIC_CROCT_BASE_ENDPOINT_URL),
        ...(timeout !== undefined && {timeout: timeout}),
        extra: {
            cache: 'no-store',
        },
        logger: logger ?? (
            getEnvFlag(env.PUBLIC_CROCT_DEBUG)
                ? new ConsoleLogger()
                : FilteredLogger.include(new ConsoleLogger(), ['warn', 'error'])
        ),
        ...rest,
        context: {
            ...context,
            page: {
                ...context?.page,
                url: request.uri,
                ...(request.referrer !== null && {referrer: request.referrer}),
            },
        },
    });
}
