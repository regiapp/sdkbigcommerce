import {
    BuyNowCartCreationError,
    Cart,
    CheckoutButtonInitializeOptions,
    CheckoutButtonStrategy,
    guard,
    InvalidArgumentError,
    NotInitializedError,
    NotInitializedErrorType,
    PaymentIntegrationService,
    PaymentMethodCancelledError,
    PaymentMethodFailedError,
} from '@bigcommerce/checkout-sdk/payment-integration-api';

import {
    GooglePayButtonInitializeOptions,
    WithGooglePayButtonInitializeOptions,
} from './google-pay-button-initialize-option';
import GooglePayCustomerInitializeOptions from './google-pay-customer-initialize-options';
import { WithGooglePayPaymentInitializeOptions } from './google-pay-payment-initialize-options';
import GooglePayPaymentProcessor from './google-pay-payment-processor';
import isGooglePayErrorObject from './guards/is-google-pay-error-object';
import isGooglePayKey from './guards/is-google-pay-key';
import {
    CallbackIntentsType,
    CallbackTriggerType,
    GooglePayBuyNowInitializeOptions,
    GooglePayInitializationData,
    GooglePayPaymentOptions,
    IntermediatePaymentData,
    NewTransactionInfo,
    TotalPriceStatusType,
} from './types';

export default class GooglePayButtonStrategy implements CheckoutButtonStrategy {
    private _paymentButton?: HTMLElement;
    private _methodId?: keyof WithGooglePayPaymentInitializeOptions;
    private _buyNowCart?: Cart;
    private _buyNowInitializeOptions?: GooglePayBuyNowInitializeOptions;
    private _currencyCode?: string;

    constructor(
        private _paymentIntegrationService: PaymentIntegrationService,
        private _googlePayPaymentProcessor: GooglePayPaymentProcessor,
    ) {}

    async initialize(
        options: CheckoutButtonInitializeOptions & WithGooglePayButtonInitializeOptions,
    ): Promise<void> {
        if (!options.methodId || !isGooglePayKey(options.methodId)) {
            throw new InvalidArgumentError(
                'Unable to proceed because "methodId" is not a valid key.',
            );
        }

        this._methodId = options.methodId;

        if (!options.containerId) {
            throw new InvalidArgumentError(
                'Unable to proceed because "containerId" is not a valid key.',
            );
        }

        const googlePayOptions = options[this._getMethodId()];

        if (!googlePayOptions) {
            throw new InvalidArgumentError('Unable to proceed without valid options.');
        }

        const { buyNowInitializeOptions, currencyCode } = googlePayOptions;

        try {
            if (buyNowInitializeOptions) {
                if (!currencyCode) {
                    throw new InvalidArgumentError(
                        `Unable to initialize payment because "options.currencyCode" argument is not provided.`,
                    );
                }

                await this._googlePayPaymentProcessor.initialize(
                    () =>
                        this._paymentIntegrationService
                            .getState()
                            .getPaymentMethodOrThrow<GooglePayInitializationData>(
                                this._getMethodId(),
                            ),
                    () => this._getGooglePayClientOptions(googlePayOptions, options.currencyCode),
                    !!buyNowInitializeOptions,
                );

                this._buyNowInitializeOptions = buyNowInitializeOptions;
                this._currencyCode = currencyCode;
            } else {
                await this._paymentIntegrationService.loadDefaultCheckout();
                await this._googlePayPaymentProcessor.initialize(() =>
                    this._paymentIntegrationService
                        .getState()
                        .getPaymentMethodOrThrow<GooglePayInitializationData>(this._getMethodId()),
                );
            }
        } catch (error) {
            return;
        }

        this._addPaymentButton({
            ...googlePayOptions,
            container: options.containerId,
        });
    }

    deinitialize(): Promise<void> {
        return Promise.resolve();
    }

    private _addPaymentButton({
        container,
        buttonColor,
        buttonType,
        onError,
    }: GooglePayButtonInitializeOptions): void {
        this._paymentButton =
            this._paymentButton ??
            this._googlePayPaymentProcessor.addPaymentButton(container, {
                buttonColor: buttonColor ?? 'default',
                buttonType: buttonType ?? 'plain',
                onClick: this._handleClick(onError),
            });
    }

    private _updatePaymentDataRequest() {
        if (!!this._buyNowInitializeOptions && this._currencyCode) {
            this._googlePayPaymentProcessor.updatePaymentDataRequest({
                transactionInfo: {
                    currencyCode: this._currencyCode,
                    totalPrice: '0',
                    totalPriceStatus: TotalPriceStatusType.ESTIMATED,
                },
                callbackIntents: [CallbackIntentsType.OFFER],
            });
        }
    }

    private _handleClick(
        onError: GooglePayCustomerInitializeOptions['onError'],
    ): (event: MouseEvent) => unknown {
        return async (event: MouseEvent) => {
            event.preventDefault();

            // TODO: Dispatch Widget Actions
            try {
                await this._interactWithPaymentSheet();
            } catch (error) {
                let err: unknown = error;

                if (isGooglePayErrorObject(error)) {
                    if (error.statusCode === 'CANCELED') {
                        throw new PaymentMethodCancelledError();
                    }

                    err = new PaymentMethodFailedError(JSON.stringify(error));
                }

                onError?.(
                    new PaymentMethodFailedError(
                        'An error occurred while requesting your Google Pay payment details.',
                    ),
                );

                throw err;
            }
        };
    }

    private async _interactWithPaymentSheet(): Promise<void> {
        if (this._buyNowInitializeOptions) {
            this._updatePaymentDataRequest();
        } else {
            await this._paymentIntegrationService.loadCheckout();
        }

        const response = await this._googlePayPaymentProcessor.showPaymentSheet();
        const billingAddress =
            this._googlePayPaymentProcessor.mapToBillingAddressRequestBody(response);
        const shippingAddress =
            this._googlePayPaymentProcessor.mapToShippingAddressRequestBody(response);
        const siteLink =
            window.location.pathname === '/embedded-checkout'
                ? this._paymentIntegrationService.getState().getStoreConfigOrThrow().links.siteLink
                : undefined;

        if (billingAddress) {
            await this._paymentIntegrationService.updateBillingAddress(billingAddress);
        }

        if (shippingAddress) {
            await this._paymentIntegrationService.updateShippingAddress(shippingAddress);
        }

        await this._googlePayPaymentProcessor.setExternalCheckoutForm(
            this._getMethodId(),
            response,
            siteLink,
        );
    }

    private _getGooglePayClientOptions(
        googlePayOptions: GooglePayButtonInitializeOptions,
        currencyCode?: string,
    ): GooglePayPaymentOptions | undefined {
        if (googlePayOptions.buyNowInitializeOptions) {
            if (!currencyCode) {
                throw new InvalidArgumentError(
                    `Unable to initialize payment because "options.currencyCode" argument is not provided.`,
                );
            }

            return {
                paymentDataCallbacks: {
                    onPaymentDataChanged: async ({
                        callbackTrigger,
                    }: IntermediatePaymentData): Promise<NewTransactionInfo | void> => {
                        if (callbackTrigger !== CallbackTriggerType.INITIALIZE) {
                            return;
                        }

                        try {
                            this._buyNowCart = await this._createBuyNowCart(
                                googlePayOptions.buyNowInitializeOptions,
                            );

                            if (this._buyNowCart) {
                                const { id, cartAmount } = this._buyNowCart;

                                await this._paymentIntegrationService.loadCheckout(id);

                                return {
                                    newTransactionInfo: {
                                        currencyCode,
                                        totalPrice: String(cartAmount),
                                        totalPriceStatus: TotalPriceStatusType.FINAL,
                                    },
                                };
                            }
                        } catch (error) {
                            throw new BuyNowCartCreationError(error);
                        }
                    },
                },
            };
        }
    }

    private async _createBuyNowCart(
        buyNowInitializeOptions?: GooglePayBuyNowInitializeOptions,
    ): Promise<Cart | undefined> {
        if (typeof buyNowInitializeOptions?.getBuyNowCartRequestBody === 'function') {
            const cartRequestBody = buyNowInitializeOptions.getBuyNowCartRequestBody();

            try {
                return await this._paymentIntegrationService.createBuyNowCart(cartRequestBody);
            } catch (error) {
                throw new BuyNowCartCreationError();
            }
        }
    }

    private _getMethodId(): keyof WithGooglePayButtonInitializeOptions {
        return guard(
            this._methodId,
            () => new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized),
        );
    }
}
