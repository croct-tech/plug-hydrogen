import type {RequestContext} from './config/context';
import {type CroctOptions, type ResolverContext, resolveRequestContext} from './request';

export type {UserIdResolver, LocaleResolver, ResolverContext, CroctOptions} from './request';

/**
 * Creates the Croct request context for Remix-v2-era Hydrogen, which has no route middleware.
 *
 * Call it in `server.ts`, merge the returned context into the load context under `croct`, and call
 * `writeCroctCookies` after Hydrogen commits the session:
 *
 * ```ts
 * const croct = await createCroctContext(request, hydrogenContext);
 * const loadContext = {...hydrogenContext, croct};
 *
 * const handleRequest = createRequestHandler({
 *     build,
 *     mode: process.env.NODE_ENV,
 *     getLoadContext: () => loadContext,
 * });
 *
 * const response = await handleRequest(request);
 *
 * if (hydrogenContext.session.isPending) {
 *     response.headers.set('Set-Cookie', await hydrogenContext.session.commit());
 * }
 *
 * writeCroctCookies(response, loadContext);
 * ```
 */
export function createCroctContext(
    request: Request,
    scope: ResolverContext,
    options: CroctOptions = {},
): Promise<RequestContext> {
    return resolveRequestContext(request, scope, options);
}
