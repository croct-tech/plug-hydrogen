import type {Cart, CartItem, ProductDetails} from '@croct/sdk/trackingEvents';
import type {CartReturn, ProductViewPayload} from '@shopify/hydrogen';

/**
 * A product entry as delivered by Hydrogen's analytics events.
 */
export type ProductEntry = ProductViewPayload['products'][number];

/**
 * A cart line as delivered by Hydrogen's cart.
 */
export type CartLine = CartReturn['lines']['nodes'][number];

/**
 * The cart shape sent to Croct; the tracker fills in `lastUpdateTime`.
 */
export type PartialCart = Omit<Cart, 'lastUpdateTime'>;

function optional<K extends string>(key: K, value: string | null | undefined): Partial<Record<K, string>> {
    if (value === undefined || value === null || value === '') {
        return {};
    }

    return {[key]: value} as Record<K, string>;
}

/**
 * Maps a Hydrogen product analytics entry to a Croct product.
 */
export function mapProduct(product: ProductEntry, currency?: string): ProductDetails {
    return {
        productId: product.id,
        name: product.title,
        displayPrice: Number.parseFloat(product.price),
        ...optional('brand', product.vendor),
        ...optional('variant', product.variantTitle),
        ...optional('sku', product.sku),
        ...optional('category', product.productType),
        ...optional('currency', currency),
    };
}

function mapLine(line: CartLine, index: number): CartItem {
    const {merchandise} = line;

    return {
        index: index,
        quantity: line.quantity,
        total: Number.parseFloat(line.cost.totalAmount.amount),
        product: {
            productId: merchandise.product.id,
            name: merchandise.product.title,
            displayPrice: Number.parseFloat(merchandise.price.amount),
            currency: merchandise.price.currencyCode,
            variant: merchandise.title,
            ...optional('sku', merchandise.sku),
            ...optional('brand', merchandise.product.vendor),
            ...optional('category', merchandise.product.productType),
        },
    };
}

/**
 * Maps a Hydrogen cart to a Croct cart.
 */
export function mapCart(cart: CartReturn): PartialCart {
    return {
        currency: cart.cost.totalAmount.currencyCode,
        total: Number.parseFloat(cart.cost.totalAmount.amount),
        subtotal: Number.parseFloat(cart.cost.subtotalAmount.amount),
        items: cart.lines
            .nodes
            .map(mapLine),
    };
}
