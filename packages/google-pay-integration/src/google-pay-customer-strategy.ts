import { noop } from 'lodash';
import {
    CustomerInitializeOptions,
    CustomerStrategy,
    ExecutePaymentMethodCheckoutOptions,
    guard,
    InvalidArgumentError,
    NotImplementedError,
    NotInitializedError,
    NotInitializedErrorType,
    PaymentIntegrationService,
    PaymentMethodCancelledError,
    PaymentMethodFailedError,
} from '@bigcommerce/checkout-sdk/payment-integration-api';

import GooglePayCustomerInitializeOptions, {
    WithGooglePayCustomerInitializeOptions,
} from './google-pay-customer-initialize-options';
import GooglePayPaymentProcessor from './google-pay-payment-processor';
import isGooglePayErrorObject from './guards/is-google-pay-error-object';
import isGooglePayKey from './guards/is-google-pay-key';
import { GooglePayInitializationData } from './types';

export default class GooglePayCustomerStrategy implements CustomerStrategy {
    private _paymentButton?: HTMLElement;
    private _methodId?: keyof WithGooglePayCustomerInitializeOptions;
    private _onClick?: () => void;

    constructor(
        private _paymentIntegrationService: PaymentIntegrationService,
        private _googlePayPaymentProcessor: GooglePayPaymentProcessor,
    ) {}

    async initialize(
        options?: CustomerInitializeOptions & WithGooglePayCustomerInitializeOptions,
    ): Promise<void> {
        if (!options?.methodId || !isGooglePayKey(options.methodId)) {
            throw new InvalidArgumentError(
                'Unable to proceed because "methodId" is not a valid key.',
            );
        }

        this._methodId = options.methodId;

        const googlePayOptions = options[this._getMethodId()];

        if (!googlePayOptions) {
            throw new InvalidArgumentError('Unable to proceed without valid options.');
        }

        this._onClick = googlePayOptions.onClick || noop;

        await this._paymentIntegrationService.loadPaymentMethod(this._getMethodId());

        try {
            await this._googlePayPaymentProcessor.initialize(() =>
                this._paymentIntegrationService
                    .getState()
                    .getPaymentMethodOrThrow<GooglePayInitializationData>(this._getMethodId()),
            );
        } catch {
            return;
        }

        this._addPaymentButton(googlePayOptions);
    }

    signIn(): Promise<void> {
        return Promise.reject(
            new NotImplementedError(
                'In order to sign in via Google Pay, the shopper must click on "Google Pay" button.',
            ),
        );
    }

    async signOut(): Promise<void> {
        const providerId = this._paymentIntegrationService.getState().getPaymentId()?.providerId;

        if (providerId) {
            await this._googlePayPaymentProcessor.signOut(providerId);
        }
    }

    executePaymentMethodCheckout(options?: ExecutePaymentMethodCheckoutOptions): Promise<void> {
        options?.continueWithCheckoutCallback?.();

        return Promise.resolve();
    }

    deinitialize(): Promise<void> {
        this._paymentButton?.remove();
        this._paymentButton = undefined;
        this._methodId = undefined;

        return Promise.resolve();
    }

    private _addPaymentButton({
        container,
        buttonColor,
        buttonType,
        onError,
    }: GooglePayCustomerInitializeOptions): void {
        this._paymentButton =
            this._paymentButton ??
            this._googlePayPaymentProcessor.addPaymentButton(container, {
                buttonColor: buttonColor ?? 'default',
                buttonType: buttonType ?? 'plain',
                onClick: this._handleClick(onError),
            });
    }

    private _handleClick(
        onError: GooglePayCustomerInitializeOptions['onError'],
    ): (event: MouseEvent) => unknown {
        return async (event: MouseEvent) => {
            event.preventDefault();

            if (this._onClick && typeof this._onClick === 'function') {
                this._onClick();
            }

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
        await this._paymentIntegrationService.loadCheckout();

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

    private _getMethodId(): keyof WithGooglePayCustomerInitializeOptions {
        return guard(
            this._methodId,
            () => new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized),
        );
    }
}
