import { LoadScriptOptions, LoadStylesheetOptions } from '@bigcommerce/script-loader';

import { RequestError } from '../../../common/error/errors';
import { getResponse } from '../../../common/http-request/responses.mock';
import { OrderPaymentRequestBody, OrderRequestBody } from '../../../order';
import Payment from '../../payment';
import { PaymentInitializeOptions } from '../../payment-request-options';
import { getCreditCardInstrument, getErrorPaymentResponseBody, getVaultedInstrument } from '../../payments.mock';

import { AdyenAdditionalActionErrorResponse, AdyenClient, AdyenComponent, AdyenComponentState, AdyenConfiguration, AdyenError, AdyenPaymentMethodType, ResultCode } from './adyenv2';

function getAdditionalActionErrorResponse(resultCode: ResultCode): AdyenAdditionalActionErrorResponse {
    return {
        provider_data: {
            resultCode,
            action: '{"paymentData":"ADYEN_PAYMENT_DATA","paymentMethodType":"scheme","token":"TOKEN","type":"threeDS2Fingerprint"}',
        },
        errors: [
            {
                code: 'additional_action_required',
            },
        ],
    };
}

function getPayment(paymentMethodType: AdyenPaymentMethodType): Payment {
    return {
        methodId: paymentMethodType,
        paymentData: getCreditCardInstrument(),
    };
}

function getUnknownErrorResponse(): any {
    return {
        errors: [
            {
                code: 'unknown_error',
            },
        ],
    };
}

function getVaultedPayment(paymentMethodType: AdyenPaymentMethodType): Payment {
    return {
        methodId: paymentMethodType,
        paymentData: getVaultedInstrument(),
    };
}

export function getAdditionalActionError(resultCode: ResultCode): RequestError {
    return new RequestError(getResponse({
        ...getErrorPaymentResponseBody(),
        ...getAdditionalActionErrorResponse(resultCode),
    }));
}

export function getAdyenClient(): AdyenClient {
    return {
        create: jest.fn(() => {
            return {
                mount: jest.fn(),
                unmount: jest.fn(),
            };
        }),

        createFromAction: jest.fn(() => {
            return {
                mount: jest.fn(),
                unmount: jest.fn(),
            };
        }),
    };
}

export function getTestAdyenConfiguration(): AdyenConfiguration {
    return {
        environment: 'test',
        originKey: 'YOUR_TEST_ORIGIN_KEY',
    };
}

export function getLiveAdyenConfiguration(): AdyenConfiguration {
    return {
        environment: 'live',
        originKey: 'YOUR_LIVE_ORIGIN_KEY',
    };
}

export function getAdyenError(): AdyenError {
    return {
        errorCode: 'CODE',
        message: 'MESSAGE',
    };
}

export function getComponentState(isValid: boolean = true): AdyenComponentState {
    return {
        data: {
            paymentMethod: {
                encryptedCardNumber: 'ENCRYPTED_CARD_NUMBER',
                encryptedExpiryMonth: 'ENCRYPTED_EXPIRY_MONTH',
                encryptedExpiryYear: 'ENCRYPTED_EXPIRY_YEAR',
                encryptedSecurityCode: 'ENCRYPTED_CVV',
                type: AdyenPaymentMethodType.CreditCard,
            },
        },
        isValid,
    };
}

export function getFailingComponent(): AdyenComponent {
    return {
        mount: jest.fn(() => {
            throw new Error();
        }),
        unmount: jest.fn(),
    };
}

export function getInitializeOptions(hasVaultedInstruments = false): PaymentInitializeOptions {
    return {
        methodId: 'adyenv2',
        adyenv2: {
            containerId: 'adyen-scheme-component-field',
            cardVerificationContainerId: 'adyen-custom-card-component-field',
            threeDS2ContainerId: 'adyen-scheme-3ds-component-field',
            hasVaultedInstruments,
            options: {
                hasHolderName: true,
                styles: {},
                placeholders: {},
            },
            threeDS2Options: {
                widgetSize: '05',
                onBeforeLoad: jest.fn(),
                onComplete: jest.fn(),
                onLoad: jest.fn(),
            },
            additionalActionOptions: {
                containerId: 'adyen-scheme-additional-action-component-field',
                onBeforeLoad: jest.fn(),
                onComplete: jest.fn(),
                onLoad: jest.fn(),
            },
        },
    };
}

export function getInitializeOptionsWithNoCallbacks(): PaymentInitializeOptions {
    return {
        methodId: 'adyenv2',
        adyenv2: {
            containerId: 'adyen-scheme-component-field',
            cardVerificationContainerId: 'adyen-custom-card-component-field',
            threeDS2ContainerId: 'adyen-scheme-3ds-component-field',
            options: {
                hasHolderName: true,
                styles: {},
                placeholders: {},
            },
            threeDS2Options: {
                widgetSize: '05',
            },
            additionalActionOptions: {
                containerId: 'adyen-scheme-additional-action-component-field',
            },
        },
    };
}

export function getInitializeOptionsWithUndefinedWidgetSize(): PaymentInitializeOptions {
    return {
        methodId: 'adyenv2',
        adyenv2: {
            containerId: 'adyen-scheme-component-field',
            cardVerificationContainerId: 'adyen-custom-card-component-field',
            threeDS2ContainerId: 'adyen-scheme-3ds-component-field',
            options: {
                hasHolderName: true,
                styles: {},
                placeholders: {},
            },
            threeDS2Options: {
                onBeforeLoad: jest.fn(),
                onComplete: jest.fn(),
                onLoad: jest.fn(),
            },
            additionalActionOptions: {
                containerId: 'adyen-scheme-additional-action-component-field',
                onBeforeLoad: jest.fn(),
                onComplete: jest.fn(),
                onLoad: jest.fn(),
            },
        },
    };
}

export function getOrderRequestBody(paymentMethodType: AdyenPaymentMethodType = AdyenPaymentMethodType.CreditCard): OrderRequestBody {
    return {
        useStoreCredit: false,
        payment: getPayment(paymentMethodType) as OrderPaymentRequestBody,
    };
}

export function getOrderRequestBodyWithVaultedInstrument(paymentMethodType: AdyenPaymentMethodType = AdyenPaymentMethodType.CreditCard): OrderRequestBody {
    return {
        useStoreCredit: false,
        payment: getVaultedPayment(paymentMethodType) as OrderPaymentRequestBody,
    };
}

export function getOrderRequestBodyWithoutPayment(): OrderRequestBody {
    return {
        useStoreCredit: false,
        payment: undefined,
    };
}

export function getUnknownError(): RequestError {
    return new RequestError(getResponse({
        ...getUnknownErrorResponse(),
        ...getErrorPaymentResponseBody(),
    }));
}

export function getLoadScriptOptions(environment: string | undefined): LoadScriptOptions {
    const checksums: { [id: string]: string } = {
        test: 'sha384-j+P95C9gdyJZ9LTUtvrMDElDvFEeTCelUsE89yfnDfP7nbOXS3N0+e5nb0CLTdx/',
        live: 'sha384-rwJ33r9d5uXn5L8KSr4UqcaSaAHs2NQNjtNCvclBkZ8P36yDAXQq65YPX+q1LiEr',
    };

    return {
        async: false,
        attributes: {
            integrity: checksums[environment ? environment : 'test'],
            crossorigin: 'anonymous',
        },
    };
}

export function getLoadStylesheetOptions(): LoadStylesheetOptions {
    return {
        prepend: true,
        attributes: {
            integrity: 'sha384-y1lKqffK5z+ENzddmGIfP3bcMRobxkjDt/9lyPAvV9H3JXbJYxCSD6L8TdyRMCGM',
            crossorigin: 'anonymous',
        },
    };
}
