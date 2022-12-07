import { BillingAddressRequestBody } from './billing';
import { HostedForm, HostedFormOptions } from './hosted-form';
import { OrderRequestBody } from './order';
import { InitializeOffsitePaymentConfig, Payment } from './payment';
import PaymentIntegrationSelectors from './payment-integration-selectors';
import { ShippingAddressRequestBody } from './shipping';
import { RequestOptions } from './util-types';
import { BuyNowCartRequestBody } from '@bigcommerce/checkout-sdk/payment-integration-api';
import { Response } from '@bigcommerce/request-sender';
import { Cart } from '../src/cart';

export default interface PaymentIntegrationService {
    createHostedForm(host: string, options: HostedFormOptions): HostedForm;
    createBuyNowCart(body: BuyNowCartRequestBody): Promise<Response<Cart>>;

    subscribe(
        subscriber: (state: PaymentIntegrationSelectors) => void,
        ...filters: Array<(state: PaymentIntegrationSelectors) => unknown>
    ): () => void;

    getState(): PaymentIntegrationSelectors;

    initializeOffsitePayment(
        initializeOffsitePaymentConfig: InitializeOffsitePaymentConfig,
    ): Promise<PaymentIntegrationSelectors>;

    loadCheckout(): Promise<PaymentIntegrationSelectors>;

    loadDefaultCheckout(): Promise<PaymentIntegrationSelectors>;

    loadDefinedCheckout(cartID: string): Promise<PaymentIntegrationSelectors>;

    loadPaymentMethod(methodId: string): Promise<PaymentIntegrationSelectors>;

    submitOrder(
        payload?: OrderRequestBody,
        options?: RequestOptions,
    ): Promise<PaymentIntegrationSelectors>;

    submitPayment(payment: Payment): Promise<PaymentIntegrationSelectors>;

    finalizeOrder(options?: RequestOptions): Promise<PaymentIntegrationSelectors>;

    selectShippingOption(
        id: string,
        options?: RequestOptions,
    ): Promise<PaymentIntegrationSelectors>;

    updateBillingAddress(payload: BillingAddressRequestBody): Promise<PaymentIntegrationSelectors>;

    updateShippingAddress(
        payload: ShippingAddressRequestBody,
    ): Promise<PaymentIntegrationSelectors>;
}
