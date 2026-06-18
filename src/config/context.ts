import {createContext} from 'react-router';
import type {RouterContextProvider} from 'react-router';
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
 * The Hydrogen load context — the `context` argument every loader, action, and the `server.ts`
 * fetch handler receive, on either the React Router 7 or the Remix-v2 era.
 *
 * It is intentionally structural so the React Router loader context (`RouterContextProvider`), the
 * Remix `AppLoadContext`, and Hydrogen's own context all satisfy it without a cast. The integration
 * reads the Oxygen `env` from it and the per-request visitor context stored under `croct` — set by
 * the middleware (React Router) or merged into the load context (Remix).
 */
export type CroctContext = {
    env: unknown,
    croct?: RequestContext,
};

/**
 * React Router 7 forbids mutating the load context, so the middleware stores the request context in
 * its type-safe context map under this key (an immutable token, like `React.createContext`). The
 * Remix-v2 era has no such map and instead carries the value as a plain `croct` property.
 *
 * @internal
 */
export const requestContextKey = createContext<RequestContext | null>(null);

function isRouterContext(context: CroctContext): context is RouterContextProvider {
    return 'get' in context && typeof context.get === 'function';
}

/**
 * @internal
 */
export function getEnv(context: CroctContext): Env {
    return context.env as Env;
}

/**
 * @internal
 */
export function getRequestContext(context: CroctContext, required?: false): RequestContext | null;

/**
 * @internal
 */
export function getRequestContext(context: CroctContext, required: true): RequestContext;

/**
 * @internal
 */
export function getRequestContext(context: CroctContext, required = false): RequestContext | null {
    const request = (isRouterContext(context) ? context.get(requestContextKey) : context.croct) ?? null;

    if (request === null && required) {
        throw new Error(
            'Croct\'s request context is missing. Did you configure Croct\'s middleware '
            + '(React Router) or `createCroctContext` (Remix)? '
            + 'For help, see: https://croct.help/sdk/hydrogen/missing-middleware',
        );
    }

    return request;
}
