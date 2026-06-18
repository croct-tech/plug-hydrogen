import type {RequestContext} from './config/context';
import {type CroctOptions, type ResolverContext, resolveRequestContext} from './request';

export type {UserIdResolver, LocaleResolver, ResolverContext, CroctOptions} from './request';

/**
 * Creates the Croct request context for Remix-v2-era Hydrogen, which has no route middleware.
 */
export function createCroctContext(
    request: Request,
    scope: ResolverContext,
    options: CroctOptions = {},
): Promise<RequestContext> {
    return resolveRequestContext(request, scope, options);
}
