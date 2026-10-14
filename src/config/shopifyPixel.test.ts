import {getShopifyPixelConfig, getShopifyPixelCookieDomain} from './shopifyPixel';

describe('getShopifyPixelConfig', () => {
    it('should resolve the configuration when the flag is enabled', () => {
        const config = getShopifyPixelConfig({
            PUBLIC_CROCT_SHOPIFY_PIXEL: 'true',
            PUBLIC_CROCT_SHOPIFY_PIXEL_COOKIE_DOMAIN: 'example.com',
            PUBLIC_CHECKOUT_DOMAIN: 'checkout.example.com',
        });

        expect(config).toEqual({
            cookieDomain: 'example.com',
            checkoutDomain: 'checkout.example.com',
        });
    });

    it('should omit the domains when unset', () => {
        expect(getShopifyPixelConfig({PUBLIC_CROCT_SHOPIFY_PIXEL: 'true'})).toEqual({});
    });

    it.each([
        [undefined],
        [''],
        ['false'],
    ])('should return undefined when the flag is %p', flag => {
        expect(getShopifyPixelConfig({PUBLIC_CROCT_SHOPIFY_PIXEL: flag})).toBeUndefined();
    });
});

describe('getShopifyPixelCookieDomain', () => {
    it('should prefer the configured cookie domain', () => {
        const domain = getShopifyPixelCookieDomain(
            {
                cookieDomain: 'shop.example.com',
                checkoutDomain: 'checkout.example.com',
            },
            'www.example.com',
        );

        expect(domain).toBe('shop.example.com');
    });

    it.each([
        ['www.example.com', 'checkout.example.com', 'example.com'],
        ['example.com', 'checkout.example.com', 'example.com'],
        ['WWW.Example.com', 'checkout.example.COM', 'example.com'],
        ['shop.example.co.uk', 'checkout.shop.example.co.uk', 'shop.example.co.uk'],
    ])('should share the cookie between %s and %s on %s', (hostname, checkoutDomain, expected) => {
        expect(getShopifyPixelCookieDomain({checkoutDomain: checkoutDomain}, hostname)).toBe(expected);
    });

    it.each([
        ['example.com', 'example.myshopify.com'],
        ['localhost', 'example.myshopify.com'],
    ])('should not share the cookie between unrelated domains %s and %s', (hostname, checkoutDomain) => {
        expect(getShopifyPixelCookieDomain({checkoutDomain: checkoutDomain}, hostname)).toBeUndefined();
    });

    it('should not share the cookie without a checkout domain', () => {
        expect(getShopifyPixelCookieDomain({}, 'www.example.com')).toBeUndefined();
    });

    it('should not share the cookie without a hostname', () => {
        expect(getShopifyPixelCookieDomain({checkoutDomain: 'checkout.example.com'})).toBeUndefined();
    });
});
