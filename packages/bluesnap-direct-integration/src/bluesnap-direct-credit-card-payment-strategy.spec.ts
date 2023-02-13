import { createScriptLoader } from '@bigcommerce/script-loader';

import { WithCreditCardPaymentInitializeOptions } from '@bigcommerce/checkout-sdk/credit-card-integration';
import {
    HostedFieldType,
    HostedForm,
    InvalidArgumentError,
    MissingDataError,
    MissingDataErrorType,
    NotInitializedError,
    OrderRequestBody,
    PaymentArgumentInvalidError,
    PaymentInitializeOptions,
    PaymentIntegrationService,
} from '@bigcommerce/checkout-sdk/payment-integration-api';
import { PaymentIntegrationServiceMock } from '@bigcommerce/checkout-sdk/payment-integrations-test-utils';

import BlueSnapDirectCreditCardPaymentStrategy from './bluesnap-direct-credit-card-payment-strategy';
import BlueSnapDirectHostedForm from './bluesnap-direct-hosted-form';
import BlueSnapHostedInputValidator from './bluesnap-direct-hosted-input-validator';
import BlueSnapDirectScriptLoader from './bluesnap-direct-script-loader';
import { getBlueSnapDirect } from './mocks/bluesnap-direct-method.mock';

describe('BlueSnapDirectCreditCardPaymentStrategy', () => {
    let paymentIntegrationService: PaymentIntegrationService;
    let form: Pick<HostedForm, 'attach' | 'submit' | 'validate'>;
    let scriptLoader: BlueSnapDirectScriptLoader;
    let hostedInputValidator: BlueSnapHostedInputValidator;
    let hostedForm: BlueSnapDirectHostedForm;
    let strategy: BlueSnapDirectCreditCardPaymentStrategy;
    let options: PaymentInitializeOptions & WithCreditCardPaymentInitializeOptions;

    beforeEach(() => {
        paymentIntegrationService =
            new PaymentIntegrationServiceMock() as PaymentIntegrationService;

        jest.spyOn(paymentIntegrationService, 'loadPaymentMethod').mockReturnValue(
            paymentIntegrationService.getState(),
        );
        jest.spyOn(paymentIntegrationService.getState(), 'getPaymentMethodOrThrow').mockReturnValue(
            getBlueSnapDirect(),
        );
        form = {
            attach: jest.fn(() => Promise.resolve()),
            submit: jest.fn(() => Promise.resolve()),
            validate: jest.fn(() => Promise.resolve()),
        };
        jest.spyOn(paymentIntegrationService, 'createHostedForm').mockReturnValue(form);

        scriptLoader = new BlueSnapDirectScriptLoader(createScriptLoader());
        hostedInputValidator = new BlueSnapHostedInputValidator();
        hostedForm = new BlueSnapDirectHostedForm(scriptLoader, hostedInputValidator);

        jest.spyOn(hostedForm, 'initialize').mockResolvedValue(undefined);
        jest.spyOn(hostedForm, 'attach').mockResolvedValue(undefined);
        jest.spyOn(hostedForm, 'validate').mockReturnValue(hostedForm);
        jest.spyOn(hostedForm, 'submit').mockResolvedValue(undefined);

        strategy = new BlueSnapDirectCreditCardPaymentStrategy(
            paymentIntegrationService,
            hostedForm,
        );

        options = {
            creditCard: {
                form: {
                    fields: {
                        [HostedFieldType.CardNumber]: { containerId: 'card-number' },
                        [HostedFieldType.CardExpiry]: { containerId: 'card-expiry' },
                        [HostedFieldType.CardName]: { containerId: 'card-name' },
                        [HostedFieldType.CardCode]: { containerId: 'card-code' },
                    },
                },
            },
            gatewayId: 'bluesnapdirect',
            methodId: 'cc',
        };
    });

    describe('#initialize()', () => {
        afterEach(() => {
            (paymentIntegrationService.createHostedForm as jest.Mock).mockClear();
        });

        it('initializes the strategy successfully', async () => {
            const initialize = strategy.initialize(options);

            await expect(initialize).resolves.toBeUndefined();
        });

        it('should create hosted form only for card name', async () => {
            await strategy.initialize(options);

            expect(paymentIntegrationService.createHostedForm).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    fields: { [HostedFieldType.CardName]: { containerId: 'card-name' } },
                }),
            );
        });

        it('should initialize BlueSnap hosted form', async () => {
            await strategy.initialize(options);

            expect(hostedForm.initialize).toHaveBeenCalledWith(true);
        });

        it('should attach BlueSnap hosted form', async () => {
            await strategy.initialize(options);

            expect(hostedForm.attach).toHaveBeenCalledWith('pfToken', options.creditCard);
        });

        describe('should fail if...', () => {
            test('gatewayId is not provided', async () => {
                const initialize = () => {
                    options.gatewayId = undefined;

                    return strategy.initialize(options);
                };

                await expect(initialize()).rejects.toThrow(InvalidArgumentError);
                expect(paymentIntegrationService.createHostedForm).not.toHaveBeenCalled();
            });

            test('creditCard is not provided', async () => {
                const initialize = () => {
                    options.creditCard = undefined;

                    return strategy.initialize(options);
                };

                await expect(initialize()).rejects.toThrow(InvalidArgumentError);
                expect(paymentIntegrationService.createHostedForm).not.toHaveBeenCalled();
            });

            test('fields is not a HostedCardFieldOptionsMap', async () => {
                const initialize = () => {
                    options = {
                        ...options,
                        creditCard: { form: { fields: {} } },
                    };

                    return strategy.initialize(options);
                };

                await expect(initialize()).rejects.toThrow(InvalidArgumentError);
                expect(paymentIntegrationService.createHostedForm).not.toHaveBeenCalled();
            });

            test('hosted form was not rendered', async () => {
                const initialize = () => {
                    const method = getBlueSnapDirect();

                    jest.spyOn(
                        paymentIntegrationService.getState(),
                        'getPaymentMethodOrThrow',
                    ).mockReturnValue({
                        ...method,
                        config: { ...method.config, isHostedFormEnabled: false },
                    });

                    return strategy.initialize(options);
                };

                await expect(initialize()).rejects.toThrow(NotInitializedError);
                expect(hostedForm.initialize).not.toHaveBeenCalled();
                expect(hostedForm.attach).not.toHaveBeenCalled();
            });

            test('there is no payment method data', async () => {
                const initialize = () => {
                    jest.spyOn(
                        paymentIntegrationService.getState(),
                        'getPaymentMethodOrThrow',
                    ).mockImplementation(() => {
                        throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
                    });

                    return strategy.initialize(options);
                };

                await expect(initialize()).rejects.toThrow(MissingDataError);
                expect(hostedForm.initialize).not.toHaveBeenCalled();
                expect(hostedForm.attach).not.toHaveBeenCalled();
            });
        });
    });

    describe('#execute()', () => {
        let payload: OrderRequestBody;

        beforeEach(async () => {
            payload = {
                payment: {
                    gatewayId: 'bluesnapdirect',
                    methodId: 'cc',
                },
            };

            await strategy.initialize(options);
        });

        it('executes the strategy successfully', async () => {
            const execute = strategy.execute(payload);

            await expect(execute).resolves.toBeUndefined();
        });

        it('should submit validated data to BlueSnap servers', async () => {
            await strategy.execute(payload);

            expect(hostedForm.validate).toHaveBeenCalled();
            expect(hostedForm.submit).toHaveBeenCalled();
        });

        it('should submit the order', async () => {
            await strategy.execute(payload);

            expect(paymentIntegrationService.submitOrder).toHaveBeenCalled();
        });

        it('should submit the payment', async () => {
            await strategy.execute(payload);

            expect(form.validate).toHaveBeenCalled();
            expect(form.submit).toHaveBeenCalledWith({
                ...payload.payment,
                paymentData: { nonce: 'pfToken' },
            });
        });

        describe('should fail if...', () => {
            test('payload.payment is not provided', async () => {
                const execute = () => strategy.execute({ ...payload, payment: undefined });

                await expect(execute()).rejects.toThrow(PaymentArgumentInvalidError);
            });
        });
    });
});
