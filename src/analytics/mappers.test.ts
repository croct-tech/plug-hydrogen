import type {CartReturn} from '@shopify/hydrogen';
import {mapCart, mapProduct, type ProductEntry} from './mappers';

describe('analytics mappers', () => {
    describe('mapProduct', () => {
        it('should map a fully-populated product', () => {
            const product = {
                id: 'gid://shopify/Product/1',
                title: 'Running Shoe',
                price: '99.90',
                vendor: 'Acme',
                variantId: 'gid://shopify/ProductVariant/1',
                variantTitle: 'Red',
                quantity: 1,
                sku: 'SKU-1',
                productType: 'Footwear',
            } as ProductEntry;

            expect(mapProduct(product, 'USD')).toEqual({
                productId: 'gid://shopify/Product/1',
                name: 'Running Shoe',
                displayPrice: 99.9,
                brand: 'Acme',
                variant: 'Red',
                sku: 'SKU-1',
                category: 'Footwear',
                currency: 'USD',
            });
        });

        it('should omit optional fields that are empty, null or absent', () => {
            const product = {
                id: 'p2',
                title: 'Bag',
                price: '10',
                vendor: '',
                variantId: 'v2',
                variantTitle: '',
                quantity: 1,
                sku: null,
                productType: undefined,
            } as unknown as ProductEntry;

            expect(mapProduct(product)).toEqual({
                productId: 'p2',
                name: 'Bag',
                displayPrice: 10,
            });
        });
    });

    describe('mapCart', () => {
        it('should map a cart with its lines', () => {
            const cart = {
                cost: {
                    totalAmount: {
                        amount: '120.00',
                        currencyCode: 'USD',
                    },
                    subtotalAmount: {amount: '100.00'},
                },
                lines: {
                    nodes: [
                        {
                            quantity: 2,
                            cost: {totalAmount: {amount: '80.00'}},
                            merchandise: {
                                id: 'v1',
                                title: 'Red',
                                sku: 'SKU-1',
                                price: {
                                    amount: '40.00',
                                    currencyCode: 'USD',
                                },
                                product: {
                                    id: 'p1',
                                    title: 'Shoe',
                                    vendor: 'Acme',
                                    productType: 'Footwear',
                                },
                            },
                        },
                        {
                            quantity: 1,
                            cost: {totalAmount: {amount: '40.00'}},
                            merchandise: {
                                id: 'v2',
                                title: 'Blue',
                                sku: null,
                                price: {
                                    amount: '40.00',
                                    currencyCode: 'USD',
                                },
                                product: {
                                    id: 'p2',
                                    title: 'Bag',
                                    vendor: '',
                                    productType: '',
                                },
                            },
                        },
                    ],
                },
            } as unknown as CartReturn;

            expect(mapCart(cart)).toEqual({
                currency: 'USD',
                total: 120,
                subtotal: 100,
                items: [
                    {
                        index: 0,
                        quantity: 2,
                        total: 80,
                        product: {
                            productId: 'p1',
                            name: 'Shoe',
                            displayPrice: 40,
                            currency: 'USD',
                            variant: 'Red',
                            sku: 'SKU-1',
                            brand: 'Acme',
                            category: 'Footwear',
                        },
                    },
                    {
                        index: 1,
                        quantity: 1,
                        total: 40,
                        product: {
                            productId: 'p2',
                            name: 'Bag',
                            displayPrice: 40,
                            currency: 'USD',
                            variant: 'Blue',
                        },
                    },
                ],
            });
        });
    });
});
