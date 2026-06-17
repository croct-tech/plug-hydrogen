import type {MiddlewareFunction} from 'react-router';
import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
import type {RequestContext} from './config/context';
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
        const hydrogen = context as unknown as HydrogenRouterContextProvider;
        const requestContext = await resolveRequestContext(request, hydrogen, options);

        // Carry the request context on the load context, mirroring the Remix era's `croct` property.
        (context as unknown as {croct: RequestContext}).croct = requestContext;

        return next();
    };
}
