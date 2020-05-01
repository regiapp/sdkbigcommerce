import { some } from 'lodash';

import { Address } from '../../../address';
import { isBillingAddressLike } from '../../../billing';
import { CheckoutStore, InternalCheckoutSelectors } from '../../../checkout';
import { InvalidArgumentError, MissingDataError, MissingDataErrorType, NotInitializedError, NotInitializedErrorType, RequestError } from '../../../common/error/errors';
import { OrderActionCreator, OrderRequestBody } from '../../../order';
import { OrderFinalizationNotRequiredError } from '../../../order/errors';
import { PaymentArgumentInvalidError, PaymentMethodFailedError } from '../../errors';
import isVaultedInstrument from '../../is-vaulted-instrument';
import { HostedInstrument } from '../../payment';
import PaymentActionCreator from '../../payment-action-creator';
import PaymentMethodActionCreator from '../../payment-method-action-creator';
import { PaymentInitializeOptions, PaymentRequestOptions } from '../../payment-request-options';
import PaymentStrategy from '../payment-strategy';

import { StripeV3PaymentInitializeOptions } from '.';
import { BillingDetails, Shipping, StripeCardElement, StripeV3Client } from './stripev3';
import StripeV3ScriptLoader from './stripev3-script-loader';

export default class StripeV3PaymentStrategy implements PaymentStrategy {
    private _initializeOptions?: PaymentInitializeOptions;
    private _stripeV3Client?: StripeV3Client;
    private _cardElement?: StripeCardElement;

    constructor(
        private _store: CheckoutStore,
        private _paymentMethodActionCreator: PaymentMethodActionCreator,
        private _paymentActionCreator: PaymentActionCreator,
        private _orderActionCreator: OrderActionCreator,
        private _stripeScriptLoader: StripeV3ScriptLoader
    ) {}

    async initialize(options: PaymentInitializeOptions): Promise<InternalCheckoutSelectors> {
        this._initializeOptions = options;
        await this._loadStripeJs();
        this._mountElement(this._getStripeInitializeOptions());

        return Promise.resolve(this._store.getState());
    }

    async execute(orderRequest: OrderRequestBody, options?: PaymentRequestOptions): Promise<InternalCheckoutSelectors> {
        const { payment, ...order } = orderRequest;

        if (!payment || !payment.paymentData) {
            throw new PaymentArgumentInvalidError(['payment.paymentData']);
        }

        const { paymentData, methodId } = payment;

        await this._store.dispatch(this._orderActionCreator.submitOrder(order, options));

        if (isVaultedInstrument(paymentData)) {
            try {
                return await this._store.dispatch(this._paymentActionCreator.submitPayment(payment));
            } catch (paymentError) {
                if (!(paymentError instanceof RequestError) || !some(paymentError.body.errors, { code: 'three_d_secure_required' })) {
                    return Promise.reject(paymentError);
                }

                const clientSecret = paymentError.body.three_ds_result.token;

                return this._confirmPayment(clientSecret, methodId, true);
            }
        }

        const state = await this._store.dispatch(this._paymentMethodActionCreator.loadPaymentMethod(methodId));
        const paymentMethod = state.paymentMethods.getPaymentMethod(methodId);

        if (!paymentMethod) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        const clientSecret = paymentMethod.clientToken;
        const { shouldSaveInstrument = false } = paymentData as HostedInstrument;

        return this._confirmPayment(clientSecret, methodId, false, shouldSaveInstrument);
    }

    finalize(): Promise<InternalCheckoutSelectors> {
        return Promise.reject(new OrderFinalizationNotRequiredError());
    }

    deinitialize(): Promise<InternalCheckoutSelectors> {
        this._unmountElement();

        return Promise.resolve(this._store.getState());
    }

    private _getInitializeOptions() {
        if (!this._initializeOptions) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        return this._initializeOptions;
    }

    private async _loadStripeJs() {
        if (this._stripeV3Client) { return; }

        const paymentMethod = this._store.getState().paymentMethods.getPaymentMethod(this._getInitializeOptions().methodId);

        if (!paymentMethod) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        const { initializationData: { stripePublishableKey, stripeConnectedAccount } } = paymentMethod;

        this._stripeV3Client = await this._stripeScriptLoader.load(stripePublishableKey, stripeConnectedAccount);
    }

    private _getStripeInitializeOptions() {
        const { stripev3 } = this._getInitializeOptions();

        if (!stripev3) {
            throw new InvalidArgumentError('Unable to initialize payment because "options.stripev3" argument is not provided.');
        }

        return stripev3;
    }

    private _getStripeJs() {
        if (!this._stripeV3Client) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        return this._stripeV3Client;
    }

    private _mountElement({ style, containerId }: StripeV3PaymentInitializeOptions) {
        if (!this._cardElement) {
            const elements = this._getStripeJs().elements();
            this._cardElement = elements.create('card', { style });
        }

        this._cardElement.mount('#' + containerId);
    }

    private _getCardElement() {
        if (!this._cardElement) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        return this._cardElement;
    }

    private _unmountElement() {
        if (this._cardElement) {
            this._cardElement.unmount();
        }
    }

    private _mapStripeAdreess(address: Address | undefined, padding: boolean = false) {
        const customer = this._store.getState().customer.getCustomer();

        let result = {};

        if (address) {
            const {
                city,
                countryCode: country,
                address1: line1,
                address2: line2,
                postalCode,
                stateOrProvinceCode: state,
            } = address;

            result = { address: { city, country, line1, line2, postal_code: postalCode, state } };

            if (isBillingAddressLike(address)) {
                const { email, phone } = address || { ...customer, phone: '' };
                result = { ...result, email, phone };
            }
        } else if (padding) {
            result = { address: { line1: '' } };
        }

        const { firstName, lastName } = address || customer || { firstName: 'Guest', lastName: '' };

        return {
            ...result,
            name: `${firstName} ${lastName}`.trim(),
        };
    }

    private _mapStripeBillingDetails() {
        const billingAddress = this._store.getState().billingAddress.getBillingAddress();

        return this._mapStripeAdreess(billingAddress) as BillingDetails;
    }

    private _mapStripeShippingInfo() {
        const shippingAddress = this._store.getState().shippingAddress.getShippingAddress();

        return this._mapStripeAdreess(shippingAddress, true) as Shipping;
    }

    private _mapStripeCardPaymentOptions(shouldSaveInstrument: boolean) {
        let result = {};

        result = { shipping: this._mapStripeShippingInfo() };

        if (shouldSaveInstrument) {
            result = { ...result, setup_future_usage: 'off_session' };
        }

        return result;
    }

    private async _confirmPayment(
        clientSecret: string | undefined,
        methodId: string,
        isVaultedInstrument: boolean,
        shouldSaveInstrument: boolean = false
    ) {
        if (!clientSecret) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        let data;
        let paymentData = {};

        if (!isVaultedInstrument) {
            data = {
                payment_method: {
                    card: this._getCardElement(),
                    billing_details: this._mapStripeBillingDetails(),
                },
                ...this._mapStripeCardPaymentOptions(shouldSaveInstrument),
            };

            paymentData = { shouldSaveInstrument };
        }

        const { error, paymentIntent } = await this._getStripeJs().confirmCardPayment(clientSecret, data);

        if (error || !paymentIntent) {
            throw new PaymentMethodFailedError(error && error.message);
        }

        const paymentPayload = {
            methodId,
            paymentData: {
                nonce: paymentIntent.id,
                ...paymentData,
            },
        };

        return this._store.dispatch(this._paymentActionCreator.submitPayment(paymentPayload));
    }
}
