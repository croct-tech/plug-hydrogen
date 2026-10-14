import type {Env} from './env';
import {getEnvEntry, getEnvFlag} from './env';

/**
 * The URL of the plugin that shares the visitor with the Shopify pixel.
 *
 * @internal
 */
export const SHOPIFY_PIXEL_PLUGIN_URL = 'https://cdn.croct.io/plug-integration/shopify-pixel.js';

/**
 * @internal
 */
export type ShopifyPixelConfig = {
    cookieDomain?: string,
    checkoutDomain?: string,
};

/**
 * @internal
 */
export function getShopifyPixelConfig(env: Env): ShopifyPixelConfig | undefined {
    if (!getEnvFlag(env.PUBLIC_CROCT_SHOPIFY_PIXEL)) {
        return undefined;
    }

    return {
        ...getEnvEntry('cookieDomain', env.PUBLIC_CROCT_SHOPIFY_PIXEL_COOKIE_DOMAIN),
        ...getEnvEntry('checkoutDomain', env.PUBLIC_CHECKOUT_DOMAIN),
    };
}

/**
 * Resolves the domain of the cookie through which the plugin shares the visitor with the pixel.
 *
 * Shopify serves the checkout of headless storefronts on a separate domain, so the cookie must be set on
 * the parent domain the storefront and checkout have in common, such as `example.com` for a storefront on
 * `www.example.com` and a checkout on `checkout.example.com`.
 *
 * @internal
 */
export function getShopifyPixelCookieDomain(config: ShopifyPixelConfig, hostname?: string): string | undefined {
    if (config.cookieDomain !== undefined) {
        return config.cookieDomain;
    }

    if (hostname === undefined || config.checkoutDomain === undefined) {
        return undefined;
    }

    const host = hostname.toLowerCase()
        .split('.')
        .reverse();
    const checkout = config.checkoutDomain
        .toLowerCase()
        .split('.')
        .reverse();
    let length = 0;

    while (length < host.length && host[length] === checkout[length]) {
        length++;
    }

    // Domains sharing only the top-level domain, like `example.com` and `other.com`, are unrelated
    if (length < 2) {
        return undefined;
    }

    return host.slice(0, length)
        .reverse()
        .join('.');
}
