import { isNil, omitBy } from 'lodash';

import { NotImplementedError, NotInitializedError, NotInitializedErrorType } from '../../../common/error/errors';
import { PaymentMethodClientUnavailableError } from '../../errors';
import PaymentStrategyType from '../../payment-strategy-type';

import { ButtonsOptions,
    FieldsOptions,
    ParamsForProvider, PayerDetails,
    PaypalButtonStyleOptions,
    PaypalCommerceButtons,
    PaypalCommerceFields,
    PaypalCommerceHostedFields,
    PaypalCommerceHostedFieldsApprove,
    PaypalCommerceHostedFieldsRenderOptions,
    PaypalCommerceHostedFieldsState,
    PaypalCommerceHostedFieldsSubmitOptions,
    PaypalCommerceMessages,
    PaypalCommerceRequestSender,
    PaypalCommerceScriptLoader,
    PaypalCommerceScriptParams,
    PaypalCommerceSDK,
    PaypalCommerceSDKFunding,
    PaypalFieldsStyleOptions,
    StyleButtonColor,
    StyleButtonLabel,
    StyleButtonLayout,
    StyleButtonShape } from './index';

export interface OptionalParamsRenderButtons {
    paramsForProvider?: ParamsForProvider;
    fundingKey?: keyof PaypalCommerceSDKFunding;
    onRenderButton?(): void;
}

export interface ParamsRenderHostedFields {
    fields: PaypalCommerceHostedFieldsRenderOptions['fields'];
    styles?: PaypalCommerceHostedFieldsRenderOptions['styles'];
}

interface EventsHostedFields {
    blur?(event: PaypalCommerceHostedFieldsState): void;
    focus?(event: PaypalCommerceHostedFieldsState): void;
    cardTypeChange?(event: PaypalCommerceHostedFieldsState): void;
    validityChange?(event: PaypalCommerceHostedFieldsState): void;
    inputSubmitRequest?(event: PaypalCommerceHostedFieldsState): void;
}

export interface RenderApmFieldsParams {
    apmFieldsContainer: string;
    fundingKey: keyof PaypalCommerceSDKFunding;
    apmFieldsStyles?: PaypalFieldsStyleOptions;
    fullName?: string;
    email?: string;
}

export default class PaypalCommercePaymentProcessor {
    private _paypal?: PaypalCommerceSDK;
    private _paypalButtons?: PaypalCommerceButtons;
    private _paypalFields?: PaypalCommerceFields;
    private _paypalMessages?: PaypalCommerceMessages;
    private _hostedFields?: PaypalCommerceHostedFields;
    private _fundingSource?: string;
    private _orderId?: string;
    private _gatewayId?: string;

    constructor(
        private _paypalScriptLoader: PaypalCommerceScriptLoader,
        private _paypalCommerceRequestSender: PaypalCommerceRequestSender
    ) {}

    async initialize(paramsScript: PaypalCommerceScriptParams, isProgressiveOnboardingAvailable?: boolean, gatewayId?: string): Promise<PaypalCommerceSDK> {
        this._paypal = await this._paypalScriptLoader.loadPaypalCommerce(paramsScript, isProgressiveOnboardingAvailable);
        this._gatewayId = gatewayId;

        return this._paypal;
    }

    renderButtons(cartId: string, container: string, params: ButtonsOptions = {}, optionalParams: OptionalParamsRenderButtons = {}): PaypalCommerceButtons {
        if (!this._paypal || !this._paypal.Buttons) {
            throw new PaymentMethodClientUnavailableError();
        }

        const { paramsForProvider, fundingKey, onRenderButton } = optionalParams;

        const buttonParams: ButtonsOptions = {
            ...params,
            createOrder: () => this._setupPayment(cartId, paramsForProvider),

            onClick: async (data, actions) => {
                this._fundingSource = data.fundingSource;

                return params.onClick?.(data, actions);
            },
        };

        if (params.style) {
            buttonParams.style = this._validateStyleParams(params.style);
        }

        if (fundingKey) {
            this._fundingSource = this._paypal.FUNDING[fundingKey];
            buttonParams.fundingSource = this._fundingSource;
        }

        this._paypalButtons = this._paypal.Buttons(buttonParams);

        if (!this._paypalButtons.isEligible()) {
            this._processNotEligible(buttonParams, fundingKey);
        }

        onRenderButton?.();

        this._paypalButtons.render(container);

        return this._paypalButtons;
    }

    renderFields({
        apmFieldsContainer,
        fundingKey,
        apmFieldsStyles,
        fullName,
        email,
    }: RenderApmFieldsParams): PaypalCommerceFields {
        if (!this._paypal || !this._paypal.Fields) {
            throw new PaymentMethodClientUnavailableError();
        }

        const fieldsParams: FieldsOptions = {
            fundingSource: this._paypal.FUNDING[fundingKey],
            style: apmFieldsStyles,
            fields: {
                name: {
                    value: fullName,
                },
                email: {
                    value: email,
                },
            },
        };

        this._paypalFields = this._paypal.Fields(fieldsParams);

        const fieldContainerElement = document.querySelector(apmFieldsContainer);
        if (fieldContainerElement) {
            fieldContainerElement.innerHTML = '';
        }

        this._paypalFields.render(apmFieldsContainer);

        return this._paypalFields;
    }

    getOrderId() {
        return this._orderId;
    }

 async getShippingOptions(cartId: string, payload: {}) {
        return  await this._paypalCommerceRequestSender.getShippingOptions(cartId, payload);
    }

async getStoreCountries() {
    return  await this._paypalCommerceRequestSender.getStoreCountries();
}

async getConsignments(cartId: string, payload: {}) {
        return await this._paypalCommerceRequestSender.getConsignments(cartId, payload);
}

async getBillingAddress(cartId: string, payload: PayerDetails) {
    return await this._paypalCommerceRequestSender.getBillingAddress(cartId, payload);
}

async putConsignments(checkoutId: string, consignmentId: string, payload: {shippingOptionId: string}) {
        return await this._paypalCommerceRequestSender.putConsignments(checkoutId, consignmentId, payload);
}

async deleteCart(cartId: string) {
        return await this._paypalCommerceRequestSender.deleteCart(cartId);
}

    renderMessages(cartTotal: number, container: string): PaypalCommerceMessages {
        if (!this._paypal || !this._paypal.Messages) {
            throw new PaymentMethodClientUnavailableError();
        }
        this._paypalMessages = this._paypal.Messages({
            amount: cartTotal,
            placement: 'cart',
            style: {
                layout: 'text',
            },
        });
        this._paypalMessages.render(container);

        return this._paypalMessages;
    }

    async renderHostedFields(cartId: string, params: ParamsRenderHostedFields, events?: EventsHostedFields): Promise<void> {
        if (!this._paypal || !this._paypal.HostedFields) {
            throw new PaymentMethodClientUnavailableError();
        }

        const { fields, styles } = params;

        if (!this._paypal.HostedFields.isEligible()) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        this._hostedFields = await this._paypal.HostedFields.render({
            fields,
            styles,
            paymentsSDK: true,
            createOrder: () => this._setupPayment(cartId, { isCreditCard: true }),
        });

        if (events) {
            (Object.keys(events) as Array<keyof EventsHostedFields>).forEach(key => {
                (this._hostedFields as PaypalCommerceHostedFields).on(key, events[key] as (event: PaypalCommerceHostedFieldsState) => void);
            });
        }
    }

    async submitHostedFields(options?: PaypalCommerceHostedFieldsSubmitOptions): Promise<PaypalCommerceHostedFieldsApprove> {
        if (!this._hostedFields) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        return this._hostedFields.submit(omitBy(options, isNil));
    }

    getHostedFieldsValidationState(): { isValid: boolean; fields: PaypalCommerceHostedFieldsState['fields'] } {
        if (!this._hostedFields) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        const { fields } = this._hostedFields.getState();

        const isValid = (Object.keys(fields) as Array<keyof PaypalCommerceHostedFieldsState['fields']>)
            .every(key => fields[key]?.isValid);

        return { isValid, fields };
    }

    deinitialize() {
        this._paypalButtons?.close?.();
        this._paypal = undefined;
        this._paypalButtons = undefined;
        this._fundingSource = undefined;
        this._hostedFields = undefined;
    }

    private async _setupPayment(cartId: string, params: ParamsForProvider = {}): Promise<string> {
        const paramsForProvider = { ...params, isCredit: this._fundingSource === 'credit' || this._fundingSource === 'paylater' };
        const isAPM = this._gatewayId === PaymentStrategyType.PAYPAL_COMMERCE_ALTERNATIVE_METHODS;
        const { orderId } = await this._paypalCommerceRequestSender.setupPayment(cartId, {...paramsForProvider, isAPM});
        this._orderId = orderId;

        return orderId;
    }

    private _validateStyleParams = (style: PaypalButtonStyleOptions): PaypalButtonStyleOptions  => {
        const updatedStyle: PaypalButtonStyleOptions = { ...style };
        const { label, color, layout, shape, height, tagline } = style;

        if (label && !StyleButtonLabel[label]) {
            delete updatedStyle.label;
        }

        if (layout && !StyleButtonLayout[layout]) {
            delete updatedStyle.layout;
        }

        if (color && !StyleButtonColor[color]) {
            delete updatedStyle.color;
        }

        if (shape && !StyleButtonShape[shape]) {
            delete updatedStyle.shape;
        }

        if (typeof height === 'number') {
            updatedStyle.height = height < 25
                ? 25
                : (height > 55 ? 55 : height);
        } else {
            delete updatedStyle.height;
        }

        if (typeof tagline !== 'boolean' || (tagline && updatedStyle.layout !== StyleButtonLayout[StyleButtonLayout.horizontal])) {
            delete updatedStyle.tagline;
        }

        return updatedStyle;
    };

    private _processNotEligible(buttonParams: ButtonsOptions, fundingKey?: keyof PaypalCommerceSDKFunding): void {
        if (fundingKey?.toUpperCase() === this._paypal?.FUNDING.PAYLATER.toUpperCase()) {
            buttonParams.fundingSource = this._paypal?.FUNDING.CREDIT;

            this._paypalButtons = this._paypal?.Buttons(buttonParams);

            if (this._paypalButtons?.isEligible()) {
                return;
            }
        }

        throw new NotImplementedError(`PayPal ${this._fundingSource || ''} is not available for your region. Please use PayPal Checkout instead.`);
    }

}
