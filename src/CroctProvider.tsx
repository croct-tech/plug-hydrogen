import type {CroctProviderProps as ReactCroctProviderProps} from '@croct/plug-react/CroctProvider';
import {CroctProvider as ReactCroctProvider} from '@croct/plug-react/CroctProvider';
import type {FunctionComponent} from 'react';
import config from 'virtual:croct/config';
import {CroctAnalytics} from './analytics/CroctAnalytics';

type OmittedProps = 'appId' | 'disableCidMirroring' | 'cidAssignerEndpointUrl';

export type CroctProviderProps = Omit<ReactCroctProviderProps, OmittedProps>
    & Partial<Pick<ReactCroctProviderProps, 'appId'>>
    & {
        /**
         * How Croct's tracking is governed.
         *
         * - `auto` (default): aligned with the Shopify Customer Privacy consent — tracking is
         *   enabled only while `canTrack()` allows it.
         * - `always`: Croct manages tracking itself (enabled by default; control it with `track` or
         *   `croct.tracker`), ignoring the Shopify consent.
         */
        tracking?: 'auto' | 'always',
    };

/**
 * Provides the Croct SDK to the storefront and forwards Shopify analytics events to Croct.
 *
 * Place it inside Shopify's `<Analytics.Provider>` so the bundled analytics bridge can subscribe to
 * storefront events. The application id and the remaining settings are baked into the bundle by the
 * `croct()` Vite plugin.
 *
 * By default tracking follows the Shopify Customer Privacy consent: it starts disabled and the
 * bundled `<CroctAnalytics>` enables it once consent allows (re-firing the initial `pageOpened`) and
 * disables it when consent is withdrawn. Set `tracking="always"` to opt out of that alignment.
 */
export const CroctProvider: FunctionComponent<CroctProviderProps> = props => {
    const {appId = config.appId, children, tracking = 'auto', track, ...rest} = props;
    const {debug, test, baseEndpointUrl, defaultPreferredLocale, defaultFetchTimeout, cookie} = config;

    return (
        <ReactCroctProvider
            appId={appId}
            disableCidMirroring
            {...(tracking === 'auto' && {track: false})}
            {...(tracking !== 'auto' && track !== undefined && {track: track})}
            {...(debug && {debug: true})}
            {...(test && {test: true})}
            {...(baseEndpointUrl !== undefined && {baseEndpointUrl: baseEndpointUrl})}
            {...(defaultPreferredLocale !== undefined && {defaultPreferredLocale: defaultPreferredLocale})}
            {...(defaultFetchTimeout !== undefined && {defaultFetchTimeout: defaultFetchTimeout})}
            cookie={cookie}
            {...rest}
        >
            <CroctAnalytics tracking={tracking} />
            {children}
        </ReactCroctProvider>
    );
};
