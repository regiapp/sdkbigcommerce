import { 
    InvalidArgumentError,
    NotInitializedError,
    OrderPaymentRequestBody,
    PaymentArgumentInvalidError,
    PaymentIntegrationService
} from '@bigcommerce/checkout-sdk/payment-integration-api';
import { PaymentIntegrationServiceMock, } from "@bigcommerce/checkout-sdk/payment-integrations-test-utils";
import { FormPoster } from '@bigcommerce/form-poster';
import { createScriptLoader } from '@bigcommerce/script-loader';

import { CheckoutStore, createCheckoutStore } from 'packages/core/src/checkout';
import { HostedFieldType, HostedForm, HostedFormFactory } from 'packages/core/src/hosted-form';
import { createSpamProtection, PaymentHumanVerificationHandler } from 'packages/core/src/spam-protection';
import { getCheckoutStoreState } from 'packages/core/src/checkout/checkouts.mock';
import { getPayment } from 'packages/core/src/payment/payments.mock';

import { PpsdkPaymentInitializeOptions } from '../ppsdk-payment-initialize-options';
import { createStepHandler } from '../step-handler';

import { CardSubStrategy } from './card-sub-strategy';

describe('CardSubStrategy', () => {
    const stepHandler = createStepHandler(new FormPoster(), new PaymentHumanVerificationHandler(createSpamProtection(createScriptLoader())));

    let paymentIntegrationService: PaymentIntegrationService;
    let store: CheckoutStore;
    let formFactory: HostedFormFactory;
    let form: Pick<HostedForm, 'attach' | 'submit' | 'validate'>;
    let initializeOptions: PpsdkPaymentInitializeOptions;
    let cardSubStrategy: CardSubStrategy;

    beforeEach(() => {
        paymentIntegrationService = new PaymentIntegrationServiceMock();
        store = createCheckoutStore(getCheckoutStoreState());
        
        formFactory = new HostedFormFactory(store);

        cardSubStrategy = new CardSubStrategy(paymentIntegrationService, formFactory, stepHandler);

        form = {
            attach: jest.fn(() => Promise.resolve()),
            submit: jest.fn(() => Promise.resolve({ payload: { response: { body: { type: 'success' } } } })),
            validate: jest.fn(() => Promise.resolve()),
        };
        initializeOptions = {
            creditCard: {
                form: {
                    fields: {
                        [HostedFieldType.CardExpiry]: { containerId: 'card-expiry' },
                        [HostedFieldType.CardName]: { containerId: 'card-name' },
                        [HostedFieldType.CardNumber]: { containerId: 'card-number' },
                    },
                },
            },
            methodId: 'cabbage_pay.card',
        };
       
        jest.spyOn(formFactory, 'create')
            .mockReturnValue(form);
    });

    describe('initialize()', () => {
        it('creates hosted form', async () => {
            await cardSubStrategy.initialize(initializeOptions);

            expect(formFactory.create)
                .toHaveBeenCalledWith(
                    'https://bigpay.integration.zone',
                    // tslint:disable-next-line:no-non-null-assertion
                    initializeOptions.creditCard!.form!
                );
        });

        it('attaches hosted form to container', async () => {
            await cardSubStrategy.initialize(initializeOptions);

            expect(form.attach)
                .toHaveBeenCalled();
        });

        it('throws error form when fields does not exist ', async () => {
            initializeOptions = {
                methodId: 'cabbage_pay.card',
            };
            try {
                await cardSubStrategy.initialize(initializeOptions);
            } catch (error) {
                expect(error).toBeInstanceOf(InvalidArgumentError);
            }
        });
    });

    describe('execute()', () => {
        const payment = getPayment() as OrderPaymentRequestBody;

        it('throws error if hosted form does not exist', async () => {
            try {
                // execute without initialization
                await cardSubStrategy.execute({
                    payment,
                    methodId: 'cabbage_pay.card',
                    bigpayBaseUrl: 'https://bigpay.integration.zone',
                    token: 'abc',
                });
            } catch (error) {
                expect(error).toBeInstanceOf(NotInitializedError);
            }
        });

        it('throws error if payment data is missing', async () => {
            try {
                await cardSubStrategy.initialize(initializeOptions);
                await cardSubStrategy.execute({
                    payment: undefined,
                    methodId: 'cabbage_pay.card',
                    bigpayBaseUrl: 'https://bigpay.integration.zone',
                    token: 'abc',
                });
            } catch (error) {
                expect(error).toBeInstanceOf(PaymentArgumentInvalidError);
            }
        });

        it('validates user input before submitting data', async () => {
            await cardSubStrategy.initialize(initializeOptions);
            await cardSubStrategy.execute({
                payment,
                methodId: 'cabbage_pay.card',
                bigpayBaseUrl: 'https://bigpay.integration.zone',
                token: 'abc',
            });

            expect(form.validate).toHaveBeenCalled();
        });

        it('does not submit payment data with hosted form if validation fails', async () => {
            jest.spyOn(form, 'validate').mockRejectedValue(new Error());

            try {
                await cardSubStrategy.initialize(initializeOptions);
                await cardSubStrategy.execute({
                    payment,
                    methodId: 'cabbage_pay.card',
                    bigpayBaseUrl: 'https://bigpay.integration.zone',
                    token: 'abc',
                });
            } catch (error) {
                expect(form.submit).not.toHaveBeenCalled();
            }
        });

        it('submits payment data with hosted form', async () => {
            await cardSubStrategy.initialize(initializeOptions);
            await cardSubStrategy.execute({
                payment,
                methodId: 'cabbage_pay.card',
                bigpayBaseUrl: 'https://bigpay.integration.zone',
                token: 'abc',
            });

            expect(form.submit).toHaveBeenCalledWith(payment, undefined);
        });

        it('loads current order after payment submission', async () => {
            await cardSubStrategy.initialize(initializeOptions);
            await cardSubStrategy.execute({
                payment,
                methodId: 'cabbage_pay.card',
                bigpayBaseUrl: 'https://bigpay.integration.zone',
                token: 'abc',
            });

            expect(paymentIntegrationService.loadCurrentOrder).toHaveBeenCalled();
        });
    });
});
