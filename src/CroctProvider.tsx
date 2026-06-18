import type {CroctProviderProps as ReactCroctProviderProps} from '@croct/plug-react/CroctProvider';
import {CroctProvider as ReactCroctProvider} from '@croct/plug-react/CroctProvider';
import type {FunctionComponent} from 'react';
import config from 'virtual:croct/config';
import {CroctAnalytics} from './analytics/CroctAnalytics';
import type {TrackingMode} from './config/tracking';

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
 * The bundled `<CroctAnalytics>` is the source of truth for product views (mapped from Shopify's
 * analytics events), so the SDK's auto-tracking plugin is told to skip `productViewed` to avoid
 * duplicate events.
 */
export const CroctProvider: FunctionComponent<CroctProviderProps> = props => {
    const {appId = config.appId, children, track = config.track ?? 'auto', plugins, ...rest} = props;
    const {debug, test, baseEndpointUrl, defaultPreferredLocale, defaultFetchTimeout, cookie} = config;

    return (
        <ReactCroctProvider
            appId={appId}
            disableCidMirroring
            track={track === 'always'}
            plugins={{
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
            {track !== 'never' && <CroctAnalytics tracking={track} />}
            {children}
        </ReactCroctProvider>
    );
};
