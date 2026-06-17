/**
 * @jest-environment jsdom
 */
import {render} from '@testing-library/react';
import {useAnalytics} from '@shopify/hydrogen';
import {useCroct} from '@croct/plug-react/hooks';
import {CroctAnalytics} from './CroctAnalytics';

jest.mock(
    '@shopify/hydrogen',
    () => ({
        AnalyticsEvent: {
            PRODUCT_VIEWED: 'product_viewed',
            CART_VIEWED: 'cart_viewed',
            CART_UPDATED: 'cart_updated',
            COLLECTION_VIEWED: 'collection_viewed',
            SEARCH_VIEWED: 'search_viewed',
        },
        useAnalytics: jest.fn(),
    }),
);

jest.mock('@croct/plug-react/hooks', () => ({useCroct: jest.fn()}));

describe('CroctAnalytics', () => {
    type Subscriptions = Map<string, (payload: unknown) => void>;

    type Tracker = {enable: jest.Mock, disable: jest.Mock};

    function setup(allowed = true, tracking: 'auto' | 'always' = 'auto'): {
        subscriptions: Subscriptions,
        ready: jest.Mock,
        track: jest.Mock,
        tracker: Tracker,
        canTrack: jest.Mock,
    } {
        const subscriptions: Subscriptions = new Map();
        const ready = jest.fn();
        const track = jest.fn();
        const tracker: Tracker = {enable: jest.fn(), disable: jest.fn()};
        const canTrack = jest.fn(() => allowed);

        (useAnalytics as jest.Mock).mockReturnValue({
            subscribe: (event: string, callback: (payload: unknown) => void) => subscriptions.set(event, callback),
            register: () => ({ready: ready}),
            canTrack: canTrack,
            customerPrivacy: {},
        });
        (useCroct as jest.Mock).mockReturnValue({track: track, tracker: tracker});

        render(<CroctAnalytics tracking={tracking} />);

        return {subscriptions: subscriptions, ready: ready, track: track, tracker: tracker, canTrack: canTrack};
    }

    const cart = {
        cost: {totalAmount: {amount: '10', currencyCode: 'USD'}, subtotalAmount: {amount: '10'}},
        lines: {nodes: []},
    };

    it('should register with the analytics provider and mark itself ready', () => {
        const {ready, subscriptions} = setup();

        expect(ready).toHaveBeenCalledTimes(1);
        expect([...subscriptions.keys()]).toEqual([
            'product_viewed',
            'cart_viewed',
            'cart_updated',
            'collection_viewed',
            'search_viewed',
        ]);
    });

    it('should track a product view', () => {
        const {subscriptions, track} = setup();

        subscriptions.get('product_viewed')!({
            products: [{id: 'p1', title: 'Shoe', price: '10', vendor: '', variantTitle: '', quantity: 1}],
            shop: {currency: 'USD'},
        });

        expect(track).toHaveBeenCalledWith('productViewed', {
            product: expect.objectContaining({productId: 'p1', currency: 'USD'}),
        });
    });

    it('should skip a product view without a product', () => {
        const {subscriptions, track} = setup();

        subscriptions.get('product_viewed')!({products: [], shop: null});

        expect(track).not.toHaveBeenCalled();
    });

    it('should track cart views and updates', () => {
        const {subscriptions, track} = setup();

        subscriptions.get('cart_viewed')!({cart: cart});
        subscriptions.get('cart_updated')!({cart: cart});

        expect(track).toHaveBeenCalledWith('cartViewed', {cart: expect.objectContaining({currency: 'USD'})});
        expect(track).toHaveBeenCalledWith('cartModified', {cart: expect.objectContaining({currency: 'USD'})});
    });

    it('should skip cart events when the cart is null', () => {
        const {subscriptions, track} = setup();

        subscriptions.get('cart_viewed')!({cart: null});
        subscriptions.get('cart_updated')!({cart: null});

        expect(track).not.toHaveBeenCalled();
    });

    it('should track collection and search views as interests', () => {
        const {subscriptions, track} = setup();

        subscriptions.get('collection_viewed')!({collection: {id: 'c1', handle: 'shoes'}});
        subscriptions.get('search_viewed')!({searchTerm: 'boots'});

        expect(track).toHaveBeenCalledWith('interestShown', {interests: ['shoes']});
        expect(track).toHaveBeenCalledWith('interestShown', {interests: ['boots']});
    });

    it('should not track anything without consent', () => {
        const {subscriptions, track} = setup(false);

        subscriptions.get('product_viewed')!({
            products: [{id: 'p1', title: 'Shoe', price: '10', vendor: '', variantTitle: '', quantity: 1}],
            shop: null,
        });
        subscriptions.get('cart_viewed')!({cart: cart});
        subscriptions.get('cart_updated')!({cart: cart});
        subscriptions.get('collection_viewed')!({collection: {id: 'c1', handle: 'shoes'}});
        subscriptions.get('search_viewed')!({searchTerm: 'boots'});

        expect(track).not.toHaveBeenCalled();
    });

    it('should enable the tracker when consent allows it', () => {
        const {tracker} = setup(true);

        expect(tracker.enable).toHaveBeenCalled();
        expect(tracker.disable).not.toHaveBeenCalled();
    });

    it('should disable the tracker without consent', () => {
        const {tracker} = setup(false);

        expect(tracker.disable).toHaveBeenCalled();
        expect(tracker.enable).not.toHaveBeenCalled();
    });

    it('should enable the tracker once consent is collected', () => {
        const {tracker, canTrack} = setup(false);

        expect(tracker.disable).toHaveBeenCalled();

        canTrack.mockReturnValue(true);
        document.dispatchEvent(new Event('visitorConsentCollected'));

        expect(tracker.enable).toHaveBeenCalled();
    });

    it('should forward events without the Shopify consent in the always mode', () => {
        const {subscriptions, track} = setup(false, 'always');

        subscriptions.get('product_viewed')!({
            products: [{id: 'p1', title: 'Shoe', price: '10', vendor: '', variantTitle: '', quantity: 1}],
            shop: {currency: 'USD'},
        });

        expect(track).toHaveBeenCalledWith('productViewed', {
            product: expect.objectContaining({productId: 'p1'}),
        });
    });

    it('should not manage the tracker in the always mode', () => {
        const {tracker} = setup(true, 'always');

        expect(tracker.enable).not.toHaveBeenCalled();
        expect(tracker.disable).not.toHaveBeenCalled();
    });
});
