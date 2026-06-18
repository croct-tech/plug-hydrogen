import type {MiddlewareFunction} from 'react-router';
import {requestContextKey} from './config/context';
import {type CroctOptions, resolveRequestContext} from './request';

export type {UserIdResolver, LocaleResolver, ResolverContext, CroctOptions} from './request';

/**
 * Creates the Croct middleware for React-Router-7-era Hydrogen.
 *
 * Add it to the root route's `middleware` export to expose the visitor context to loaders and
 * actions through the `context` they receive. Pair it with `writeCroctCookies` in `server.ts` to
 * persist the visitor cookies on the response.
 */
export function createCroctMiddleware(options: CroctOptions = {}): MiddlewareFunction {
    return async ({request, context}, next) => {
        // The load context is read-only, so store the request context in React Router's context map.
        context.set(requestContextKey, await resolveRequestContext(request, context, options));

        return next();
    };
}
