import {parse, serialize} from 'cookie';
import {Token} from '@croct/sdk/token';
import {base64UrlDecode} from '@croct/sdk/base64Url';
import type {Env} from './config/env';
import type {CookieOptions} from './config/cookie';
import {getClientIdCookieOptions, getPreviewCookieOptions, getUserTokenCookieOptions} from './config/cookie';
import {getAppId} from './config/appId';
import {getAuthenticationKey, issueToken, isUserTokenAuthenticationEnabled} from './config/security';
import {type CroctContext, type RequestContext, getEnv, getRequestContext} from './config/context';

const CLIENT_ID_PATTERN = /^(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[a-f0-9]{32})$/;
const PREVIEW_QUERY_PARAMETER = 'croct-preview';

/**
 * The Shopify context the resolvers read from, available on both Hydrogen eras.
 */
export type ResolverContext = {
    env: unknown,
    customerAccount: {
        isLoggedIn: () => Promise<boolean>,
        query: (query: string) => Promise<{data?: unknown}>,
    },
    storefront: {i18n: {language: string, country: string}},
};

/**
 * Resolves the logged-in user's identifier from the Hydrogen context.
 */
export type UserIdResolver = (context: ResolverContext) => Promise<string | null> | string | null;

/**
 * Resolves the visitor's preferred locale from the Hydrogen context.
 */
export type LocaleResolver = (context: ResolverContext) => Promise<string | null> | string | null;

export type CroctOptions = {
    userIdResolver?: UserIdResolver,
    localeResolver?: LocaleResolver,
};

/**
 * Assembles the visitor context for a request, minting or reusing the client id and user token, and
 * resolving identity and locale from Shopify.
 *
 * @internal
 */
export async function resolveRequestContext(
    request: Request,
    context: ResolverContext,
    options: CroctOptions,
): Promise<RequestContext> {
    const {userIdResolver = resolveCustomerId, localeResolver = resolveStorefrontLocale} = options;
    const env = context.env as Env;
    const url = new URL(request.url);

    const [userId, locale] = await Promise.all([
        userIdResolver(context),
        localeResolver(context),
    ]);

    const token = await resolveUserToken(request, getUserTokenCookieOptions(env).name, env, userId);

    return {
        clientId: getClientId(request, getClientIdCookieOptions(env).name),
        userToken: token.toString(),
        uri: getCurrentUrl(url),
        clientAgent: request.headers.get('user-agent'),
        referrer: request.headers.get('referer'),
        clientIp: getClientIp(request),
        preferredLocale: locale,
        previewToken: getPreviewToken(url, request, getPreviewCookieOptions(env).name),
    };
}

/**
 * Writes Croct's visitor cookies on the response.
 *
 * Call it in `server.ts` after Hydrogen commits the session, so the session's `Set-Cookie` header
 * does not overwrite Croct's cookies:
 *
 * ```ts
 * const response = await handleRequest(request);
 *
 * if (hydrogenContext.session.isPending) {
 *     response.headers.set('Set-Cookie', await hydrogenContext.session.commit());
 * }
 *
 * writeCroctCookies(response, hydrogenContext);
 * ```
 *
 * The cookies are not `httpOnly`, so the browser SDK can reuse them.
 */
export function writeCroctCookies(response: Response, scope: CroctContext): void {
    const request = getRequestContext(scope);

    if (request === null) {
        // Some requests bypass the middleware (e.g. React Router's `/__manifest` route discovery),
        // so there is no visitor context to persist — nothing to do.
        return;
    }

    const env = getEnv(scope);

    setCookie(response, request.userToken, getUserTokenCookieOptions(env));
    setCookie(response, request.clientId, getClientIdCookieOptions(env));

    const previewCookie = getPreviewCookieOptions(env);

    if (request.previewToken === 'exit') {
        unsetCookie(response, previewCookie);
    } else if (request.previewToken !== null) {
        setCookie(response, request.previewToken, previewCookie);
    }
}

async function resolveCustomerId(context: ResolverContext): Promise<string | null> {
    const {customerAccount} = context;

    if (!await customerAccount.isLoggedIn()) {
        return null;
    }

    const {data} = await customerAccount.query('#graphql\n query CroctCustomerId { customer { id } }');
    const customer = (data as {customer?: {id?: string}} | null | undefined)?.customer;

    return customer?.id ?? null;
}

function resolveStorefrontLocale(context: ResolverContext): string {
    const {i18n} = context.storefront;

    return `${i18n.language.toLowerCase()}-${i18n.country.toUpperCase()}`;
}

async function resolveUserToken(
    request: Request,
    cookieName: string,
    env: Env,
    userId: string | null,
): Promise<Token> {
    const value = readCookie(request, cookieName);
    let token: Token | null = null;

    if (value !== undefined) {
        try {
            token = Token.parse(value);
        } catch {
            // Ignore invalid tokens and issue a fresh one below.
        }
    }

    if (
        token === null
        || (isUserTokenAuthenticationEnabled(env) && !token.isSigned())
        || !token.isValidNow()
        || (userId === null ? !token.isAnonymous() : !token.isSubject(userId))
    ) {
        return issueToken(env, userId);
    }

    const tokenAppId = token.getApplicationId();

    if (tokenAppId !== null && tokenAppId !== getAppId(env)) {
        // Foreign-app cookie pollution: issue a fresh token.
        return issueToken(env, userId);
    }

    if (token.isSigned() && !await token.matchesKeyId(getAuthenticationKey(env))) {
        // Same app, signed with a different key: re-sign with the local key, preserving the subject
        // and token id so the session stays continuous.
        return issueToken(env, userId ?? token.getSubject(), token.getTokenId() ?? undefined);
    }

    return token;
}

function getClientId(request: Request, cookieName: string): string {
    const value = readCookie(request, cookieName);

    if (value === undefined || !CLIENT_ID_PATTERN.test(value)) {
        return crypto.randomUUID();
    }

    return value;
}

function getClientIp(request: Request): string | null {
    const forwarded = request.headers.get('x-forwarded-for');

    if (forwarded !== null && forwarded !== '') {
        return forwarded.split(',')[0].trim();
    }

    return request.headers.get('x-real-ip');
}

function getPreviewToken(url: URL, request: Request, cookieName: string): string | null {
    const value = url.searchParams.get(PREVIEW_QUERY_PARAMETER) ?? readCookie(request, cookieName) ?? null;

    if (value === null) {
        return null;
    }

    return isPreviewTokenValid(value) ? value : 'exit';
}

function isPreviewTokenValid(token: string): boolean {
    if (token === 'exit') {
        return false;
    }

    const now = Math.floor(Date.now() / 1000);

    try {
        const payload: unknown = JSON.parse(base64UrlDecode(token.split('.')[1]).toString());

        return typeof payload === 'object'
            && payload !== null
            && 'exp' in payload
            && Number.isInteger(payload.exp)
            && (payload.exp as number) > now;
    } catch {
        return false;
    }
}

function getCurrentUrl(url: URL): string {
    const sanitized = new URL(url);

    sanitized.searchParams.delete(PREVIEW_QUERY_PARAMETER);

    return sanitized.toString();
}

function readCookie(request: Request, name: string): string | undefined {
    const header = request.headers.get('cookie');

    if (header === null) {
        return undefined;
    }

    return parse(header)[name];
}

function setCookie(response: Response, value: string, options: CookieOptions): void {
    const {name, ...rest} = options;

    response.headers.append('Set-Cookie', serialize(name, value, rest));
}

function unsetCookie(response: Response, options: CookieOptions): void {
    const {name, ...rest} = options;

    response.headers.append('Set-Cookie', serialize(name, '', {...rest, maxAge: 0}));
}
