import { CartSource } from '@bigcommerce/checkout-sdk/payment-integration-api';

interface LineItem {
    productId: number;
    quantity: number;
    variantId?: number;
    optionSelections?: {
        optionId: number;
        optionValue: number | string;
    };
}

/**
 * An object that contains the information required for creating 'Buy now' cart.
 */
export default interface BuyNowCartRequestBody {
    source: CartSource.BuyNow;
    lineItems: LineItem[];
}
