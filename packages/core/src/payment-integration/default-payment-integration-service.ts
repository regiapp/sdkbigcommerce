import {
    HostedForm,
    HostedFormOptions,
    PaymentIntegrationService,
    PaymentIntegrationSelectors,
    BillingAddressRequestBody,
    OrderRequestBody,
    Payment,
    ShippingAddressRequestBody,
    RequestOptions,
} from "@bigcommerce/checkout-sdk/payment-integration-api";
import { BillingAddressActionCreator } from "../billing";
import { CheckoutStore, CheckoutActionCreator } from "../checkout";
import { DataStoreProjection } from "../common/data-store";
import { HostedFormFactory } from "../hosted-form";
import { OrderActionCreator } from "../order";
import PaymentActionCreator from "../payment/payment-action-creator";
import PaymentMethodActionCreator from "../payment/payment-method-action-creator";
import { ConsignmentActionCreator } from "../shipping";
import { Cart } from "../cart";

import PaymentIntegrationStoreProjectionFactory from "./payment-integration-store-projection-factory";
import { BuyNowCartRequestBody } from "../cart";
import { RequestSender, Response } from "@bigcommerce/request-sender";
import { ContentType, SDK_VERSION_HEADERS } from "../common/http-request";

export default class DefaultPaymentIntegrationService
    implements PaymentIntegrationService
{
    private _storeProjection: DataStoreProjection<PaymentIntegrationSelectors>;

    constructor(
        private _store: CheckoutStore,
        private _storeProjectionFactory: PaymentIntegrationStoreProjectionFactory,
        private _checkoutActionCreator: CheckoutActionCreator,
        private _hostedFormFactory: HostedFormFactory,
        private _orderActionCreator: OrderActionCreator,
        private _billingAddressActionCreator: BillingAddressActionCreator,
        private _consignmentActionCreator: ConsignmentActionCreator,
        private _paymentMethodActionCreator: PaymentMethodActionCreator,
        private _paymentActionCreator: PaymentActionCreator,
        private _requestSender: RequestSender
    ) {
        this._storeProjection = this._storeProjectionFactory.create(
            this._store
        );
    }

    createHostedForm(host: string, options: HostedFormOptions): HostedForm {
        return this._hostedFormFactory.create(host,options);
    }

    /* eslint-disable  @typescript-eslint/no-explicit-any */
    subscribe(
        subscriber: (state: PaymentIntegrationSelectors) => void,
        ...filters: Array<(state: PaymentIntegrationSelectors) => unknown>
    ): () => void {
        return this._storeProjection.subscribe(subscriber, ...filters);
    }

    getState(): PaymentIntegrationSelectors {
        return this._storeProjection.getState();
    }

    async loadCheckout(): Promise<PaymentIntegrationSelectors> {
        await this._store.dispatch(
            this._checkoutActionCreator.loadCurrentCheckout()
        );

        return this._storeProjection.getState();
    }

    async loadDefinedCheckout(cartID:string): Promise<PaymentIntegrationSelectors> {
        await this._store.dispatch(
            this._checkoutActionCreator.loadCheckout(cartID)
        );

        return this._storeProjection.getState();
    }

    async loadDefaultCheckout(): Promise<PaymentIntegrationSelectors> {
        await this._store.dispatch(
            this._checkoutActionCreator.loadDefaultCheckout()
        );

        return this._storeProjection.getState();
    }

    async loadPaymentMethod(
        methodId: string
    ): Promise<PaymentIntegrationSelectors> {
        await this._store.dispatch(
            this._paymentMethodActionCreator.loadPaymentMethod(methodId)
        );

        return this._storeProjection.getState();
    }

    async submitOrder(
        payload?: OrderRequestBody
    ): Promise<PaymentIntegrationSelectors> {
        await this._store.dispatch(
            this._orderActionCreator.submitOrder(payload)
        );

        return this._storeProjection.getState();
    }

    async submitPayment(
        payment: Payment
    ): Promise<PaymentIntegrationSelectors> {
        await this._store.dispatch(
            this._paymentActionCreator.submitPayment(payment)
        );

        return this._storeProjection.getState();
    }

    async finalizeOrder(): Promise<PaymentIntegrationSelectors> {
        const {
            order: { getOrderOrThrow },
        } = this._store.getState();

        await this._store.dispatch(
            this._orderActionCreator.finalizeOrder(getOrderOrThrow().orderId)
        );

        return this._storeProjection.getState();
    }

    async updateBillingAddress(
        payload: BillingAddressRequestBody
    ): Promise<PaymentIntegrationSelectors> {
        await this._store.dispatch(
            this._billingAddressActionCreator.updateAddress(payload)
        );

        return this._storeProjection.getState();
    }

    async updateShippingAddress(
        payload: ShippingAddressRequestBody
    ): Promise<PaymentIntegrationSelectors> {
        await this._store.dispatch(
            this._consignmentActionCreator.updateAddress(payload)
        );

        return this._storeProjection.getState();
    }

    async selectShippingOption(
        id: string,
        options?: RequestOptions
    ): Promise<PaymentIntegrationSelectors> {
        await this._store.dispatch(
            this._consignmentActionCreator.selectShippingOption(id, options)
        );

        return this._storeProjection.getState();
    }

    createBuyNowCart(body: BuyNowCartRequestBody, { timeout }: RequestOptions = {}): Promise<Response<Cart>> {
        const url = '/api/storefront/carts';
        const headers = {
            Accept: ContentType.JsonV1,
            ...SDK_VERSION_HEADERS,
        };

        return this._requestSender.post(url, { body, headers, timeout });
    }
}
