import { PaypalButtonStyleOptions } from '../../../payment/strategies/paypal-commerce';

export interface PaypalCommerceButtonInitializeOptions {
    /**
     * A set of styling options for the checkout button.
     */
    style?: PaypalButtonStyleOptions;

    /**
     * Container id for messaging banner container
     */
    messagingContainer?: string;
    /**
     * Callback that redirects to order-confirmation page after payment authorize
     */
    onPaymentAuthorize(): void;
}
