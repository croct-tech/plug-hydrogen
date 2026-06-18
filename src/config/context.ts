// Namespace import on purpose: React Router 6 (Remix-v2) does not export `createContext`, so a named
// import can fail to resolve at module load. A namespace import requires no specific export to exist,
// and `createContext` is only ever read lazily below, on the React Router 7 path.
import * as reactRouter from 'react-router';
import type {RouterContext, RouterContextProvider} from 'react-router';
import type {Env} from './env';

/**
 * The per-request visitor context assembled by the integration and shared with loaders and actions.
 */
export type RequestContext = {
    clientId: string,
    userToken: string,
    uri: string,
    clientAgent: string | null,
    referrer: string | null,
    clientIp: string | null,
    preferredLocale: string | null,
    previewToken: string | null,
};

/**
 * The Hydrogen load context every loader, action, and `server.ts` fetch handler receives.
 */
export type CroctContext = {
    env: unknown,
    croct?: RequestContext,
};

let cachedRequestContextKey: RouterContext<RequestContext | null> | null = null;

/**
 * Key the middleware uses to store the request context in React Router's context map.
 *
 * Resolved lazily because `createContext` only exists in React Router 7: a Remix-v2 app (React
 * Router 6) that merely imports this module must never evaluate it — only the middleware does.
 *
 * @internal
 */
export function requestContextKey(): RouterContext<RequestContext | null> {
    cachedRequestContextKey ??= reactRouter.createContext<RequestContext | null>(null);

    return cachedRequestContextKey;
}

/**
 * @internal
 */
export function getEnv(context: CroctContext): Env {
    return context.env as Env;
}

/**
 * Reads the request context stored by the middleware (React Router) or merged under `croct` (Remix),
 * returning `null` when missing, unless `required` is set — then it throws a helpful error.
 *
 * @internal
 */
export function getRequestContext(context: CroctContext, required?: false): RequestContext | null;

export function getRequestContext(context: CroctContext, required: true): RequestContext;

export function getRequestContext(context: CroctContext, required = false): RequestContext | null {
    const request = (isRouterContext(context) ? context.get(requestContextKey()) : context.croct) ?? null;

    if (request === null && required) {
        throw new Error(
            'Croct\'s request context is missing. Did you configure Croct\'s middleware '
            + '(React Router) or `createCroctContext` (Remix)? '
            + 'For help, see: https://croct.help/sdk/hydrogen/missing-middleware',
        );
    }

    return request;
}

function isRouterContext(context: CroctContext): context is RouterContextProvider {
    return 'get' in context && typeof context.get === 'function';
}
