import { some } from 'lodash';

import {
    BillingAddress,
    getBrowserInfo,
    HostedInstrument,
    InvalidArgumentError,
    isVaultedInstrument,
    NotInitializedError,
    NotInitializedErrorType,
    OrderFinalizationNotRequiredError,
    OrderRequestBody,
    Payment,
    PaymentArgumentInvalidError,
    PaymentInitializeOptions,
    PaymentIntegrationSelectors,
    PaymentIntegrationService,
    PaymentInvalidFormError,
    PaymentInvalidFormErrorDetails,
    PaymentMethod,
    PaymentMethodCancelledError,
    PaymentRequestOptions,
    PaymentStrategy,
    RequestError,
} from "@bigcommerce/checkout-sdk/payment-integration-api";

import { isAccountState, isCardState, AdyenAction, AdyenActionType, AdyenAdditionalAction, AdyenAdditionalActionState, AdyenClient, AdyenComponent, AdyenComponentState, AdyenComponentType, AdyenError, AdyenPaymentMethodType, AdyenPlaceholderData, CardStateErrors } from './adyenv2';
import AdyenV2PaymentInitializeOptions, { WithAdyenV2PaymentInitializeOptions } from './adyenv2-initialize-options';
import AdyenV2ScriptLoader from './adyenv2-script-loader';

interface AdyenV2Promise {
    resolve(): void;
    reject(reason?: RequestError | unknown): void;
}

export default class AdyenV2PaymentStrategy implements PaymentStrategy {
    private _adyenClient?: AdyenClient;
    private _cardVerificationComponent?: AdyenComponent;
    private _componentState?: AdyenComponentState;
    private _paymentComponent?: AdyenComponent;
    private _paymentInitializeOptions?: AdyenV2PaymentInitializeOptions;

    constructor(
        private _paymentIntegrationService: PaymentIntegrationService,
        private _scriptLoader: AdyenV2ScriptLoader,
    ) {}

    async initialize(options: PaymentInitializeOptions & WithAdyenV2PaymentInitializeOptions): Promise<void> {
        const { adyenv2 } = options;

        if (!adyenv2) {
            throw new InvalidArgumentError('Unable to initialize payment because "options.adyenv2" argument is not provided.');
        }

        this._paymentInitializeOptions = adyenv2;

        const paymentMethod = this._paymentIntegrationService.getState().getPaymentMethodOrThrow(options.methodId);
        const clientSideAuthentication = {
            key: '',
            value: '',
        };

        if (paymentMethod.initializationData.originKey) {
            clientSideAuthentication.key = 'originKey';
            clientSideAuthentication.value = paymentMethod.initializationData.originKey;
        } else {
            clientSideAuthentication.key = 'clientKey';
            clientSideAuthentication.value = paymentMethod.initializationData.clientKey;
        }

        this._adyenClient = await this._scriptLoader.load({
            environment:  paymentMethod.initializationData.environment,
            locale: this._paymentIntegrationService.getState().getLocale(),
            [clientSideAuthentication.key]: clientSideAuthentication.value,
            paymentMethodsResponse: paymentMethod.initializationData.paymentMethodsResponse,
        });

        this._paymentComponent = await this._mountPaymentComponent(paymentMethod);

        if (paymentMethod.method === AdyenPaymentMethodType.CreditCard ||
            paymentMethod.method === AdyenPaymentMethodType.Bancontact) {
            this._cardVerificationComponent = await this._mountCardVerificationComponent();
        }

        return Promise.resolve();
    }

    async execute(payload: OrderRequestBody, options?: PaymentRequestOptions): Promise<void> {
        const { payment, ...order } = payload;
        const paymentData = payment && payment.paymentData;
        const shouldSaveInstrument = paymentData && (paymentData as HostedInstrument).shouldSaveInstrument;
        const shouldSetAsDefaultInstrument = paymentData && (paymentData as HostedInstrument).shouldSetAsDefaultInstrument;

        if (!payment) {
            throw new PaymentArgumentInvalidError(['payment']);
        }

        this._validateCardData();

        await this._paymentIntegrationService.submitOrder(order, options);
        
        return new Promise(async (resolve, reject) => {
            const componentState = this._componentState;
            if (!componentState) {
                throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
            }
            if (paymentData && isVaultedInstrument(paymentData)) {
                let bigpayToken = {};
                if (isCardState(componentState)) {
                    const { encryptedCardNumber, encryptedSecurityCode, encryptedExpiryMonth, encryptedExpiryYear } = componentState.data.paymentMethod;

                    bigpayToken = {
                        credit_card_number_confirmation: encryptedCardNumber,
                        expiry_month: encryptedExpiryMonth,
                        expiry_year: encryptedExpiryYear,
                        verification_value: encryptedSecurityCode,
                    };
                }

                if (isCardState(componentState) || isAccountState(componentState)) {
                    try {
                        await this._paymentIntegrationService.submitPayment({
                            ...payment,
                            paymentData: {
                                formattedPayload: {
                                    bigpay_token: {
                                        ...bigpayToken,
                                        token: paymentData.instrumentId,
                                    },
                                    origin: window.location.origin,
                                    browser_info: getBrowserInfo(),
                                    set_as_default_stored_instrument: shouldSetAsDefaultInstrument || null,
                                },
                            },
                        });
                        resolve();
                    } catch (error) {
                        this._processAdditionalAction(error, {resolve, reject}, shouldSaveInstrument, shouldSetAsDefaultInstrument);
                    }
                }
            }

            try {
                await this._paymentIntegrationService.submitPayment({
                    methodId: payment.methodId,
                    paymentData: {
                        formattedPayload: {
                            credit_card_token: {
                                token: JSON.stringify({
                                    ...componentState.data.paymentMethod,
                                    origin: window.location.origin,
                                }),
                            },
                            browser_info: getBrowserInfo(),
                            vault_payment_instrument: shouldSaveInstrument || null,
                            set_as_default_stored_instrument: shouldSetAsDefaultInstrument || null,
                        },
                    },
                });
                resolve();
            } catch (error) {
                this._processAdditionalAction(error, {resolve, reject}, shouldSaveInstrument, shouldSetAsDefaultInstrument);
            }
        });
    }

    finalize(): Promise<void> {
        return Promise.reject(new OrderFinalizationNotRequiredError());
    }

    deinitialize(): Promise<void> {
        this._componentState = undefined;

        if (this._paymentComponent) {
            this._paymentComponent.unmount();
            this._paymentComponent = undefined;
        }

        if (this._cardVerificationComponent) {
            this._cardVerificationComponent.unmount();
            this._cardVerificationComponent = undefined;
        }

        return Promise.resolve();
    }

    private _getAdyenClient(): AdyenClient {
        if (!this._adyenClient) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        return this._adyenClient;
    }

    private _getPaymentInitializeOptions(): AdyenV2PaymentInitializeOptions {
        if (!this._paymentInitializeOptions) {
            throw new InvalidArgumentError('"options.adyenv2" argument was not provided during initialization.');
        }

        return this._paymentInitializeOptions;
    }

    private _getThreeDS2ChallengeWidgetSize(): string {
        const { additionalActionOptions, threeDS2Options} = this._getPaymentInitializeOptions();
        const widgetSize = additionalActionOptions.widgetSize || threeDS2Options?.widgetSize;

        if (!widgetSize) {
            return '05';
        }

        return widgetSize;
    }

    private _handleAction(additionalAction: AdyenAdditionalAction): Promise<Payment> {
        return new Promise((resolve, reject) => {
            const { threeDS2ContainerId, additionalActionOptions } = this._getPaymentInitializeOptions();
            const { onBeforeLoad, containerId, onLoad, onComplete } = additionalActionOptions;
            const adyenAction: AdyenAction = JSON.parse(additionalAction.action);

            const additionalActionComponent = this._getAdyenClient().createFromAction(adyenAction, {
                onAdditionalDetails: (additionalActionState: AdyenAdditionalActionState) => {
                    const paymentPayload = {
                        methodId: adyenAction.paymentMethodType,
                        paymentData: {
                            nonce: JSON.stringify(additionalActionState.data),
                        },
                    };

                    if (onComplete) {
                        onComplete();
                    }

                    resolve(paymentPayload);
                },
                size: this._getThreeDS2ChallengeWidgetSize(),
                onError: (error: AdyenError) => reject(error),
            });

            if (onBeforeLoad) {
                onBeforeLoad(adyenAction.type === AdyenActionType.ThreeDS2Challenge ||
                    adyenAction.type === AdyenActionType.QRCode);
            }

            additionalActionComponent.mount(`#${containerId || threeDS2ContainerId}`);

            if (onLoad) {
                onLoad(() => {
                    reject(new PaymentMethodCancelledError());
                    additionalActionComponent.unmount();
                });
            }
        });
    }

    private _mapAdyenPlaceholderData(billingAddress?: BillingAddress): AdyenPlaceholderData {
        if (!billingAddress) {
            return {};
        }

        const {
            firstName,
            lastName,
            address1: street,
            address2: houseNumberOrName,
            postalCode,
            city,
            stateOrProvinceCode: stateOrProvince,
            countryCode: country,
        } = billingAddress;

        return {
            holderName: `${firstName} ${lastName}`,
            billingAddress: {
                street,
                houseNumberOrName,
                postalCode,
                city,
                stateOrProvince,
                country,
            },
        };
    }

    private _mountCardVerificationComponent(): Promise<AdyenComponent> {
        const adyenv2 = this._getPaymentInitializeOptions();
        const adyenClient = this._getAdyenClient();
        let cardVerificationComponent: AdyenComponent;

        return new Promise((resolve, reject) => {
            if (adyenv2.cardVerificationContainerId) {
                cardVerificationComponent = adyenClient.create(AdyenComponentType.SecuredFields, {
                    ...adyenv2.options,
                    onChange: componentState => this._updateComponentState(componentState),
                    onError: validateState => adyenv2.validateCardFields(validateState),
                    onFieldValid: validateState => adyenv2.validateCardFields(validateState),
                });

                try {
                    cardVerificationComponent.mount(`#${adyenv2.cardVerificationContainerId}`);
                } catch (error) {
                    reject(new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized));
                }
            }

            resolve(cardVerificationComponent);
        });
    }

    private _mountPaymentComponent(paymentMethod: PaymentMethod): Promise<AdyenComponent> {
        let paymentComponent: AdyenComponent;
        const adyenv2 = this._getPaymentInitializeOptions();
        const adyenClient = this._getAdyenClient();

        return new Promise((resolve, reject) => {
            switch (paymentMethod.method) {
                case AdyenPaymentMethodType.CreditCard:
                case AdyenPaymentMethodType.ACH:
                case AdyenPaymentMethodType.Bancontact: {
                    const billingAddress = this._paymentIntegrationService.getState().getBillingAddress();

                    paymentComponent = adyenClient.create(paymentMethod.method, {
                        ...adyenv2.options,
                        onChange: componentState => this._updateComponentState(componentState),
                        data: this._mapAdyenPlaceholderData(billingAddress),
                    });

                    try {
                        paymentComponent.mount(`#${adyenv2.containerId}`);
                    } catch (error) {
                        reject(new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized));
                    }

                    break;
                }

                case AdyenPaymentMethodType.iDEAL:
                case AdyenPaymentMethodType.SEPA:
                    if (!adyenv2.hasVaultedInstruments) {
                        paymentComponent = adyenClient.create(paymentMethod.method, {
                            ...adyenv2.options,
                            onChange: componentState => this._updateComponentState(componentState),
                        });

                        try {
                            paymentComponent.mount(`#${adyenv2.containerId}`);
                        } catch (error) {
                            reject(new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized));
                        }

                    } else {
                        this._updateComponentState({
                            data: {
                                paymentMethod: {
                                    type: paymentMethod.method,
                                },
                            },
                        });
                    }
                    break;

                case AdyenPaymentMethodType.AliPay:
                case AdyenPaymentMethodType.GiroPay:
                case AdyenPaymentMethodType.Sofort:
                case AdyenPaymentMethodType.Klarna:
                case AdyenPaymentMethodType.KlarnaPayNow:
                case AdyenPaymentMethodType.KlarnaAccount:
                case AdyenPaymentMethodType.Vipps:
                case AdyenPaymentMethodType.WeChatPayQR:
                    this._updateComponentState({
                        data: {
                            paymentMethod: {
                                type: paymentMethod.method,
                            },
                        },
                    });
            }

            resolve(paymentComponent);
        });
    }

    private async _processAdditionalAction(error: unknown, promise: AdyenV2Promise, shouldSaveInstrument?: boolean, shouldSetAsDefaultInstrument?: boolean): Promise<PaymentIntegrationSelectors | void> {
        if (!(error instanceof RequestError) || !some(error.body.errors, {code: 'additional_action_required'})) {
            return promise.reject(error);
        }

        const payment = await this._handleAction(error.body.provider_data);

        try {
            await this._paymentIntegrationService.submitPayment({
                ...payment,
                paymentData: {
                    ...payment.paymentData,
                    shouldSaveInstrument,
                    shouldSetAsDefaultInstrument,
                },
            });
            return promise.resolve();
        } catch (error) {
            return this._processAdditionalAction(error, promise, shouldSaveInstrument, shouldSetAsDefaultInstrument);
        }
    }

    private _updateComponentState(componentState: AdyenComponentState) {
        this._componentState = componentState;
    }

    private _validateCardData(): void {
        const adyenv2 = this._getPaymentInitializeOptions();
        const cardComponent = adyenv2.hasVaultedInstruments ? this._cardVerificationComponent : this._paymentComponent;

        if (cardComponent?.props?.type === 'ideal' || !cardComponent?.componentRef?.showValidation || !cardComponent?.state) {
            return;
        }

        cardComponent.componentRef.showValidation();

        if ( Object.keys(cardComponent.state).length === 0 || !cardComponent.state?.isValid ) {
            throw new PaymentInvalidFormError( this._mapCardErrors(cardComponent?.state?.errors) );
        }
    }

    private _mapCardErrors(cardStateErrors: CardStateErrors = {}): PaymentInvalidFormErrorDetails {
        const errors: PaymentInvalidFormErrorDetails = {};

        Object.keys(cardStateErrors).forEach(key => {
            errors[key] = [{
                message: cardStateErrors[key],
                type: key,
            }];
        });

        return errors;
    }
}
