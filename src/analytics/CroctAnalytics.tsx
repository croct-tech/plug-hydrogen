import {useEffect} from 'react';
import {AnalyticsEvent, useAnalytics} from '@shopify/hydrogen';
import {useCroct} from '@croct/plug-react/hooks';
import {mapCart, mapProduct} from './mappers';

type CroctAnalyticsProps = {
    tracking: 'auto' | 'always',
};

/**
 * Forwards Shopify analytics events to Croct.
 */
export function CroctAnalytics({tracking}: CroctAnalyticsProps): null {
    const {subscribe, register, canTrack, customerPrivacy} = useAnalytics();
    const croct = useCroct();
    const aligned = tracking === 'auto';

    useEffect(
        () => {
            if (!aligned) {
                return;
            }

            const sync = (): void => {
                // `canTrack()` returns false until the Customer Privacy API is ready, then reflects
                // the visitor's analytics consent.
                if (canTrack()) {
                    croct.tracker.enable();
                } else {
                    croct.tracker.disable();
                }
            };

            sync();

            document.addEventListener('visitorConsentCollected', sync);

            return () => document.removeEventListener('visitorConsentCollected', sync);
        },
        [aligned, canTrack, customerPrivacy, croct],
    );

    useEffect(
        () => {
            const allowed = (): boolean => !aligned || canTrack();
            const {ready} = register('Croct');

            subscribe(AnalyticsEvent.PRODUCT_VIEWED, payload => {
                const [product] = payload.products;

                if (allowed() && product !== undefined) {
                    void croct.track('productViewed', {product: mapProduct(product, payload.shop?.currency)});
                }
            });

            subscribe(AnalyticsEvent.CART_VIEWED, payload => {
                if (allowed() && payload.cart !== null) {
                    void croct.track('cartViewed', {cart: mapCart(payload.cart)});
                }
            });

            subscribe(AnalyticsEvent.CART_UPDATED, payload => {
                if (allowed() && payload.cart !== null) {
                    void croct.track('cartModified', {cart: mapCart(payload.cart)});
                }
            });

            subscribe(AnalyticsEvent.COLLECTION_VIEWED, payload => {
                if (allowed()) {
                    void croct.track('interestShown', {interests: [payload.collection.handle]});
                }
            });

            subscribe(AnalyticsEvent.SEARCH_VIEWED, payload => {
                if (allowed()) {
                    void croct.track('interestShown', {interests: [payload.searchTerm]});
                }
            });

            ready();
        },
        [aligned, subscribe, register, canTrack, croct],
    );

    return null;
}
