import {
    CreditCardPaymentStrategy,
    WithCreditCardPaymentInitializeOptions,
} from '@bigcommerce/checkout-sdk/credit-card-integration';
import {
    guard,
    HostedFieldType,
    HostedInputValidateResults,
    InvalidArgumentError,
    MissingDataError,
    MissingDataErrorType,
    NotInitializedError,
    NotInitializedErrorType,
    OrderRequestBody,
    PaymentArgumentInvalidError,
    PaymentInitializeOptions,
    PaymentIntegrationService,
    PaymentRequestOptions,
} from '@bigcommerce/checkout-sdk/payment-integration-api';

import BlueSnapDirectHostedForm from './bluesnap-direct-hosted-form';
import isHostedCardFieldOptionsMap from './is-hosted-card-field-options-map';

export default class BlueSnapDirectCreditCardPaymentStrategy extends CreditCardPaymentStrategy {
    private _paymentFieldsToken?: string;

    constructor(
        paymentIntegrationService: PaymentIntegrationService,
        private _blueSnapDirectHostedForm: BlueSnapDirectHostedForm,
    ) {
        super(paymentIntegrationService);
    }

    async initialize(
        options: PaymentInitializeOptions & WithCreditCardPaymentInitializeOptions,
    ): Promise<void> {
        const { methodId, gatewayId, creditCard } = options;

        if (!gatewayId || !creditCard || !isHostedCardFieldOptionsMap(creditCard.form.fields)) {
            throw new InvalidArgumentError();
        }

        const parentOptions = {
            ...options,
            creditCard: {
                ...creditCard,
                form: {
                    ...creditCard.form,
                    fields: {
                        [HostedFieldType.CardName]:
                            creditCard.form.fields[HostedFieldType.CardName],
                    },
                    onValidate: (data: HostedInputValidateResults) =>
                        this._blueSnapDirectHostedForm.onValidate(data),
                },
            },
        };

        await super.initialize(parentOptions);

        if (!this._shouldRenderHostedForm) {
            throw new NotInitializedError(NotInitializedErrorType.PaymentNotInitialized);
        }

        const {
            config: { testMode },
            clientToken,
        } = (
            await this._paymentIntegrationService.loadPaymentMethod(gatewayId, {
                params: { method: methodId },
            })
        ).getPaymentMethodOrThrow(methodId, gatewayId);

        this._paymentFieldsToken = clientToken;

        await this._blueSnapDirectHostedForm.initialize(testMode);
        await this._blueSnapDirectHostedForm.attach(this._getPaymentFieldsToken(), creditCard);
    }

    async execute(payload: OrderRequestBody, options?: PaymentRequestOptions): Promise<void> {
        if (!payload.payment) {
            throw new PaymentArgumentInvalidError(['payment']);
        }

        const pfToken = this._getPaymentFieldsToken();

        await this._blueSnapDirectHostedForm.validate().submit();
        await super.execute(
            {
                ...payload,
                payment: {
                    ...payload.payment,
                    paymentData: {
                        nonce: pfToken,
                    },
                },
            },
            options,
        );
    }

    private _getPaymentFieldsToken(): string {
        return guard(
            this._paymentFieldsToken,
            () => new MissingDataError(MissingDataErrorType.MissingPaymentToken),
        );
    }
}
