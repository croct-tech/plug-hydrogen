import type {CroctProviderProps as ReactCroctProviderProps} from '@croct/plug-react/CroctProvider';
import {CroctProvider as ReactCroctProvider} from '@croct/plug-react/CroctProvider';
import type {FunctionComponent} from 'react';
import {Script} from '@shopify/hydrogen';
import config from 'virtual:croct/config';
import {CroctAnalytics} from './analytics/CroctAnalytics';
import type {TrackingMode} from './config/tracking';
import {getShopifyPixelCookieDomain, SHOPIFY_PIXEL_PLUGIN_URL} from './config/shopifyPixel';

type OmittedProps = 'appId' | 'disableCidMirroring' | 'cidAssignerEndpointUrl' | 'track';

export type CroctProviderProps = Omit<ReactCroctProviderProps, OmittedProps>
    & Partial<Pick<ReactCroctProviderProps, 'appId'>>
    & {
        track?: TrackingMode,
    };

/**
 * Provides the Croct SDK to the storefront and forwards Shopify analytics events to Croct.
 *
 * Place it inside Shopify's `<Analytics.Provider>` so the bundled analytics bridge can subscribe to
 * storefront events. The application id and the remaining settings are baked into the bundle by the
 * `croct()` Vite plugin.
 *
 * The `track` prop controls automatic tracking and defaults to the `PUBLIC_CROCT_TRACK` environment
 * variable (or `"auto"` when unset):
 *
 * - `"auto"` (default): tracking follows the Shopify Customer Privacy consent. It starts disabled and
 *   the bundled `<CroctAnalytics>` enables it once consent allows (re-firing the initial `pageOpened`)
 *   and disables it when consent is withdrawn.
 * - `"always"`: track unconditionally, regardless of consent.
 * - `"never"`: disable automatic tracking entirely; the SDK stays available for manual tracking.
 *
 * Setting the `PUBLIC_CROCT_SHOPIFY_PIXEL` environment variable to `true` also loads the plugin that
 * shares the visitor with the Croct Shopify pixel, so checkout events are attributed to the same user.
 */
export const CroctProvider: FunctionComponent<CroctProviderProps> = props => {
    const {appId = config.appId, children, track = config.track ?? 'auto', plugins, ...rest} = props;
    const {
        debug,
        test,
        baseEndpointUrl,
        defaultPreferredLocale,
        defaultFetchTimeout,
        cookie,
        shopifyPixel,
    } = config;
    const pixelCookieDomain = shopifyPixel !== undefined
        ? getShopifyPixelCookieDomain(shopifyPixel, globalThis.location?.hostname)
        : undefined;

    return (
        <ReactCroctProvider
            appId={appId}
            disableCidMirroring
            track={track === 'always'}
            plugins={{
                ...(shopifyPixel !== undefined && {
                    'shopify-pixel': pixelCookieDomain !== undefined ? {cookie: {domain: pixelCookieDomain}} : {},
                }),
                ...plugins,
                autoTracking: {
                    disableProductViewed: true,
                    ...plugins?.autoTracking,
                },
            }}
            {...(debug && {debug: true})}
            {...(test && {test: true})}
            {...(baseEndpointUrl !== undefined && {baseEndpointUrl: baseEndpointUrl})}
            {...(defaultPreferredLocale !== undefined && {defaultPreferredLocale: defaultPreferredLocale})}
            {...(defaultFetchTimeout !== undefined && {defaultFetchTimeout: defaultFetchTimeout})}
            cookie={cookie}
            {...rest}
        >
            {shopifyPixel !== undefined && <Script src={SHOPIFY_PIXEL_PLUGIN_URL} async />}
            {track !== 'never' && <CroctAnalytics tracking={track} />}
            {children}
        </ReactCroctProvider>
    );
};
