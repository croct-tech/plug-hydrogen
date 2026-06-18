import type {EvaluationOptions as BaseOptions} from '@croct/plug-react/api';
import {evaluate as executeQuery} from '@croct/plug-react/api';
import type {JsonValue} from '@croct/json';
import {ConsoleLogger} from '@croct/sdk/logging/consoleLogger';
import {FilteredLogger} from '@croct/sdk/logging/filteredLogger';
import {getEnvEntry, getEnvFlag} from '../config/env';
import {getApiKey} from '../config/security';
import {getDefaultFetchTimeout} from '../config/timeout';
import {type CroctContext, getEnv, getRequestContext} from '../config/context';

export type EvaluationOptions<T extends JsonValue = JsonValue> =
    Omit<BaseOptions<T>, 'apiKey' | 'appId'> & {
        scope: CroctContext,
    };

export async function evaluate<T extends JsonValue>(query: string, options: EvaluationOptions<T>): Promise<T> {
    const {scope, context, logger, ...rest} = options;
    const env = getEnv(scope);
    const request = getRequestContext(scope, true);
    const timeout = getDefaultFetchTimeout(env);

    return executeQuery<T>(query, {
        apiKey: getApiKey(env),
        clientId: request.clientId,
        userToken: request.userToken,
        clientIp: request.clientIp ?? '127.0.0.1',
        ...(request.clientAgent !== null && {clientAgent: request.clientAgent}),
        ...(request.previewToken !== null && request.previewToken !== 'exit' && {previewToken: request.previewToken}),
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
