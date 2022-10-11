import {
    InvalidArgumentError,
    NotInitializedError,
    RequestError,
    OrderFinalizationNotRequiredError,
    PaymentArgumentInvalidError,
    PaymentInvalidFormError,
    PaymentActionType,
    SubmitPaymentAction,
    PaymentMethodCancelledError,
    PaymentIntegrationService,
    PaymentInitializeOptions,
} from "@bigcommerce/checkout-sdk/payment-integration-api";
import { PaymentIntegrationServiceMock, getCreditCardInstrument } from "@bigcommerce/checkout-sdk/payment-integrations-test-utils";
import { createAction, createErrorAction } from '@bigcommerce/data-store';
// import { createRequestSender } from '@bigcommerce/request-sender';
import { createScriptLoader, createStylesheetLoader } from '@bigcommerce/script-loader';
import { of, Observable } from 'rxjs';

// import { createCheckoutStore, CheckoutStore } from '../../../checkout';
// import { getCheckoutStoreState } from '../../../checkout/checkouts.mock';
// import { FinalizeOrderAction, OrderActionType, OrderRequestSender, SubmitOrderAction } from '../../../order';

import { getAdyenV2 } from './adyenv2-method.mock';
import AdyenV2ScriptLoader from './adyenv2-script-loader';
import AdyenV2PaymentStrategy from './adyenv2-payment-strategy';

import { AdyenAdditionalActionState, AdyenComponent, AdyenComponentState, AdyenComponentType, AdyenError, AdyenPaymentMethodType, ResultCode } from './adyenv2';
import { getAdditionalActionError, getAdyenClient, getAdyenError, getComponentState, getFailingComponent, getInitializeOptions, getInitializeOptionsWithNoCallbacks, getInitializeOptionsWithUndefinedWidgetSize, getOrderRequestBody, getOrderRequestBodyWithoutPayment, getOrderRequestBodyWithVaultedInstrument, getUnknownError } from './adyenv2.mock';

describe('AdyenV2PaymentStrategy', () => {
    // let finalizeOrderAction: Observable<FinalizeOrderAction>;
    let adyenV2ScriptLoader: AdyenV2ScriptLoader;
    let paymentIntegrationService: PaymentIntegrationService;
    // let store: CheckoutStore;
    // let orderRequestSender: OrderRequestSender;
    let submitPaymentAction: Observable<SubmitPaymentAction>;
    let strategy: AdyenV2PaymentStrategy;

    beforeEach(() => {
        const scriptLoader = createScriptLoader();
        const stylesheetLoader = createStylesheetLoader();
        submitPaymentAction = of(createAction(PaymentActionType.SubmitPaymentRequested));

        adyenV2ScriptLoader = new AdyenV2ScriptLoader(scriptLoader, stylesheetLoader);
        paymentIntegrationService = new PaymentIntegrationServiceMock();

        strategy = new AdyenV2PaymentStrategy(
            paymentIntegrationService,
            adyenV2ScriptLoader,
        );
    });

    describe('#Initializes & Executes', () => {
        let options: PaymentInitializeOptions;
        const adyenCheckout = getAdyenClient();
        let paymentComponent: AdyenComponent;
        let cardVerificationComponent: AdyenComponent;

        beforeEach(() => {
            let handleOnChange: (componentState: AdyenComponentState) => {};
            let handleOnError: (componentState: AdyenComponentState) => {};

            options = getInitializeOptions();
            console.log('#Initializes & Executes before each');

            paymentComponent = {
                mount: jest.fn(() => {
                    console.log('paymentComponent mount');
                    handleOnChange(getComponentState());
                    return;
                }),
                unmount: jest.fn(),
            };

            cardVerificationComponent = {
                mount: jest.fn(() => {
                    console.log('cardVerificationComponent mount');
                    handleOnChange(getComponentState());
                    handleOnError(getComponentState(false));

                    return;
                }),
                unmount: jest.fn(),
            };

            jest.spyOn(paymentIntegrationService.getState(), 'getPaymentMethodOrThrow').mockReturnValue(getAdyenV2());

            jest.spyOn(adyenV2ScriptLoader, 'load').mockReturnValue(Promise.resolve(adyenCheckout));

            jest.spyOn(adyenCheckout, 'create')
                .mockImplementation(jest.fn((_method, options) => {
                    const { onChange, onError } = options;
                    console.log('mock 2');
                    handleOnChange = onChange;
                    handleOnError = onError;

                    return _method === AdyenComponentType.SecuredFields
                        ? cardVerificationComponent
                        : paymentComponent;
                }));
        });

        afterEach(() => {
            console.log('#Initializes & Executes clear after each');
            jest.clearAllMocks();
        });

        describe('#initialize()', () => {
            console.log('initialize');
            it('does not create adyen card verification component', async () => {
                console.log('-----------------');
                if (options.adyenv2) {
                    options.adyenv2.cardVerificationContainerId = undefined;
                }

                await strategy.initialize(options);

                expect(adyenCheckout.create).toHaveBeenCalledTimes(1);
            });

            it('does not load adyen V2 if initialization options are not provided', () => {
                console.log('-----------------');
                options.adyenv2 = undefined;
                const response = strategy.initialize(options);

                return expect(response).rejects.toThrow(InvalidArgumentError);
            });

            it('fails mounting scheme payment component', async () => {
                console.log('-----------------');
                paymentComponent = getFailingComponent();

                await expect(strategy.initialize(options))
                    .rejects.toThrow(NotInitializedError);
            });

            it('fails mounting card verification component', async () => {
                console.log('-----------------');
                cardVerificationComponent = getFailingComponent();

                await expect(strategy.initialize(options))
                    .rejects.toThrow(NotInitializedError);
            });

            it('does not call adyenCheckout.create when initializing AliPay', async () => {
                console.log('-----------------');
                jest.spyOn(paymentIntegrationService.getState(), 'getPaymentMethodOrThrow')
                    .mockReturnValue(getAdyenV2(AdyenPaymentMethodType.AliPay));

                await strategy.initialize(options);

                expect(adyenCheckout.create).not.toBeCalled();
            });

            it('does not call adyenCheckout.create when initializing Klarna', async () => {
                console.log('-----------------');
                jest.spyOn(paymentIntegrationService.getState(), 'getPaymentMethodOrThrow')
                    .mockReturnValue(getAdyenV2(AdyenPaymentMethodType.Klarna));

                await strategy.initialize(options);

                expect(adyenCheckout.create).not.toBeCalled();
            });

            it('does not call adyenCheckout.create when initializing KlarnaAccount', async () => {
                console.log('-----------------');
                jest.spyOn(paymentIntegrationService.getState(), 'getPaymentMethodOrThrow')
                    .mockReturnValue(getAdyenV2(AdyenPaymentMethodType.KlarnaAccount));

                await strategy.initialize(options);

                expect(adyenCheckout.create).not.toBeCalled();
            });

            it('does not call adyenCheckout.create when initializing KlarnaPayNow', async () => {
                console.log('-----------------');
                jest.spyOn(paymentIntegrationService.getState(), 'getPaymentMethodOrThrow')
                    .mockReturnValue(getAdyenV2(AdyenPaymentMethodType.KlarnaPayNow));

                await strategy.initialize(options);

                expect(adyenCheckout.create).not.toBeCalled();
            });

            it('does not call adyenCheckout.create when initializing GiroPay', async () => {
                console.log('-----------------');
                jest.spyOn(paymentIntegrationService.getState(), 'getPaymentMethodOrThrow')
                    .mockReturnValue(getAdyenV2(AdyenPaymentMethodType.GiroPay));

                await strategy.initialize(options);

                expect(adyenCheckout.create).not.toBeCalled();
            });
        });

        describe('#execute', () => {
            console.log('execute');
            const identifyShopperError = getAdditionalActionError(ResultCode.IdentifyShopper);
            const challengeShopperError = getAdditionalActionError(ResultCode.ChallengeShopper);
            let additionalActionComponent: AdyenComponent;

            beforeEach(() => {
                let handleOnAdditionalDetails: (additionalActionState: AdyenAdditionalActionState) => {};

                additionalActionComponent = {
                    mount: jest.fn(() => {
                        handleOnAdditionalDetails({
                            data: {
                                resultCode: ResultCode.ChallengeShopper,
                                action: 'adyenAction',
                            },
                            isValid: true,
                        });

                        return;
                    }),
                    unmount: jest.fn(),
                };

                jest.spyOn(adyenCheckout, 'createFromAction')
                    .mockImplementation(jest.fn((_type, options) => {
                        const { onAdditionalDetails } = options;
                        handleOnAdditionalDetails = onAdditionalDetails;

                        return additionalActionComponent;
                    }));
            });

            it('throws an error when payment is not present',  async () => {
                console.log('-----------------');
                await expect(strategy.execute(getOrderRequestBodyWithoutPayment())).rejects.toThrow(PaymentArgumentInvalidError);
            });

            it('does not submit payment when trying to pay with invalid component state', async () => {
                console.log('-----------------');
                const adyenInvalidPaymentComponent = {
                    mount: jest.fn(),
                    unmount: jest.fn(),
                };
                jest.spyOn(adyenCheckout, 'create')
                    .mockReturnValueOnce(adyenInvalidPaymentComponent)
                    .mockReturnValueOnce(adyenInvalidPaymentComponent);

                await strategy.initialize(options);

                await expect(strategy.execute(getOrderRequestBody()))
                    .rejects.toThrow(NotInitializedError);

                expect(paymentIntegrationService.submitPayment).toHaveBeenCalledTimes(0);
                expect(adyenCheckout.create).toHaveBeenCalledTimes(2);
            });

            it('skip fields validation if payment type is "ideal"',  async () => {
                console.log('-----------------');
                const adyenInvalidPaymentComponent = {
                    mount: jest.fn(),
                    unmount: jest.fn(),
                    componentRef: {
                        showValidation: jest.fn(),
                    },
                    state: {
                        isValid: false,
                    },
                    props: {
                        type: 'ideal',
                    },
                };
                jest.spyOn(adyenCheckout, 'create')
                    .mockReturnValueOnce(adyenInvalidPaymentComponent)
                    .mockReturnValueOnce(adyenInvalidPaymentComponent);
                // jest.spyOn(paymentIntegrationService, 'submitOrder')
                //     .mockReturnValue(submitOrderAction);

                await strategy.initialize(options);
                await expect(() => strategy.execute(getOrderRequestBody())).not.toThrow(PaymentInvalidFormError);

                expect(adyenInvalidPaymentComponent.componentRef.showValidation).toHaveBeenCalledTimes(0);
                expect(paymentIntegrationService.submitOrder).toHaveBeenCalledTimes(1);
            });

            it('throws an error when card fields invalid',  async () => {
                console.log('-----------------');
                const adyenInvalidPaymentComponent = {
                    mount: jest.fn(),
                    unmount: jest.fn(),
                    componentRef: {
                        showValidation: jest.fn(),
                    },
                    state: {
                        isValid: false,
                    },
                    props: {
                        type: 'card',
                    },
                };
                jest.spyOn(adyenCheckout, 'create')
                    .mockReturnValueOnce(adyenInvalidPaymentComponent)
                    .mockReturnValueOnce(adyenInvalidPaymentComponent);

                await strategy.initialize(options);

                await expect(strategy.execute(getOrderRequestBody())).rejects.toThrow(PaymentInvalidFormError);
                expect(adyenInvalidPaymentComponent.componentRef.showValidation).toHaveBeenCalledTimes(1);

                expect(paymentIntegrationService.submitPayment).toHaveBeenCalledTimes(0);
            });

            it('calls submitPayment when paying with vaulted instrument', async () => {
                console.log('---------------------');
                jest.spyOn(paymentIntegrationService, 'submitPayment')
                    .mockReturnValueOnce(submitPaymentAction);
                await strategy.initialize(options);
                await strategy.execute(getOrderRequestBodyWithVaultedInstrument());

                expect(paymentIntegrationService.submitPayment).toHaveBeenCalledWith(expect.objectContaining({
                    methodId: 'scheme',
                    paymentData: {
                        formattedPayload: expect.objectContaining({
                            bigpay_token : {
                                credit_card_number_confirmation: 'ENCRYPTED_CARD_NUMBER',
                                token: '123',
                                verification_value: 'ENCRYPTED_CVV',
                                expiry_month: 'ENCRYPTED_EXPIRY_MONTH',
                                expiry_year: 'ENCRYPTED_EXPIRY_YEAR',
                            },
                            origin: 'http://localhost',
                            browser_info: {
                                color_depth: 24,
                                java_enabled: false,
                                language: 'en-US',
                                screen_height: 0,
                                screen_width: 0,
                                time_zone_offset: expect.anything(),
                            },
                        }),
                    },
                }));
                expect(adyenCheckout.create).toHaveBeenCalledTimes(2);
            });

            it('calls submitPayment, passing a set as default flag, when paying with a vaulted instrument that should be defaulted', async () => {
                jest.spyOn(paymentIntegrationService, 'submitPayment')
                    .mockReturnValueOnce(submitPaymentAction);

                await strategy.initialize(options);
                await strategy.execute({
                    useStoreCredit: false,
                    payment: { methodId: 'scheme', paymentData: { instrumentId: '123', shouldSetAsDefaultInstrument: true } },
                  });

                expect(paymentIntegrationService.submitPayment).toHaveBeenCalledWith(
                    expect.objectContaining({
                        paymentData: expect.objectContaining({
                            formattedPayload: expect.objectContaining({
                                set_as_default_stored_instrument: true,
                            }),
                        }),
                    })
                );
            });

            // it('calls submitPayment, passing a vault flag, when paying with an instrument that should be vaulted', async () => {
            //     jest.spyOn(paymentIntegrationService, 'submitPayment')
            //         .mockReturnValueOnce(submitPaymentAction);

            //     await strategy.initialize(options);
            //     await strategy.execute({
            //         payment: {
            //             methodId: 'scheme',
            //             paymentData: {
            //                 ...getCreditCardInstrument(),
            //                 shouldSaveInstrument: true,
            //             },
            //         },
            //     });

            //     expect(paymentIntegrationService.submitPayment).toHaveBeenCalledWith(
            //         expect.objectContaining({
            //             paymentData: expect.objectContaining({
            //                 formattedPayload: expect.objectContaining({
            //                     vault_payment_instrument: true,
            //                     set_as_default_stored_instrument: null,
            //                 }),
            //             }),
            //         })
            //     );
            // });

            // it('calls submitPayment, passing both a vault and set as default flag, when paying with an instrument that should be vaulted and defaulted', async () => {
            //     jest.spyOn(paymentIntegrationService, 'submitPayment')
            //         .mockReturnValueOnce(submitPaymentAction);

            //     await strategy.initialize(options);
            //     await strategy.execute({
            //         payment: {
            //             methodId: 'scheme',
            //             paymentData: {
            //                 ...getCreditCardInstrument(),
            //                 shouldSaveInstrument: true,
            //                 shouldSetAsDefaultInstrument: true,
            //             },
            //         },
            //     });

            //     expect(paymentIntegrationService.submitPayment).toHaveBeenCalledWith(
            //         expect.objectContaining({
            //             paymentData: expect.objectContaining({
            //                 formattedPayload: expect.objectContaining({
            //                     vault_payment_instrument: true,
            //                     set_as_default_stored_instrument: true,
            //                 }),
            //             }),
            //         })
            //     );
            // });

            // it('additional action component fires back onError', async () => {
            //     const adyenError = getAdyenError();
            //     let handleOnError: (error: AdyenError) => {};

            //     const additionalActionComponentWithError: AdyenComponent = {
            //         mount: jest.fn(() => {
            //             handleOnError(adyenError);

            //             return;
            //         }),
            //         unmount: jest.fn(),
            //     };

            //     jest.spyOn(adyenCheckout, 'createFromAction')
            //         .mockImplementation(jest.fn((_type, options) => {
            //             const { onError } = options;
            //             handleOnError = onError;

            //             return additionalActionComponentWithError;
            //         }));
            //     jest.spyOn(paymentIntegrationService, 'submitPayment')
            //         .mockReturnValueOnce(of(createErrorAction(PaymentActionType.SubmitPaymentFailed, identifyShopperError)));

            //     await strategy.initialize(options);

            //     await expect(strategy.execute(getOrderRequestBody()))
            //         .rejects.toMatchObject(adyenError);

            //     expect(paymentIntegrationService.submitPayment).toHaveBeenCalledTimes(1);
            //     expect(adyenCheckout.create).toHaveBeenCalledTimes(2);
            //     expect(adyenCheckout.createFromAction).toHaveBeenCalledTimes(1);
            // });

            // it('returns 3DS2 ChallengeShopper flow with default widget size', async () => {
            //     jest.spyOn(paymentIntegrationService, 'submitPayment')
            //         .mockReturnValueOnce(of(createErrorAction(PaymentActionType.SubmitPaymentFailed, challengeShopperError)))
            //         .mockReturnValueOnce(submitPaymentAction);

            //     options = getInitializeOptionsWithUndefinedWidgetSize();

            //     await strategy.initialize(options);
            //     await strategy.execute(getOrderRequestBody());

            //     expect(paymentIntegrationService.submitPayment).toHaveBeenCalledTimes(2);
            //     expect(adyenCheckout.create).toHaveBeenCalledTimes(2);
            //     expect(adyenCheckout.createFromAction).toHaveBeenCalledTimes(1);
            // });

            // it('calls submit payment with SEPA component', async () => {
            //     jest.spyOn(paymentIntegrationService.getState(), 'getPaymentMethodOrThrow')
            //         .mockReturnValue(getAdyenV2(AdyenPaymentMethodType.SEPA));

            //     await strategy.initialize(options);
            //     await strategy.execute(getOrderRequestBody(AdyenPaymentMethodType.SEPA));

            //     expect(paymentIntegrationService.submitPayment).toHaveBeenCalledTimes(1);
            //     expect(adyenCheckout.create).toHaveBeenCalledTimes(1);
            // });

            // it('calls submit payment with ACH component and a correct payload', async () => {
            //     jest.spyOn(paymentIntegrationService.getState(), 'getPaymentMethodOrThrow')
            //         .mockReturnValue(getAdyenV2(AdyenPaymentMethodType.ACH));

            //     await strategy.initialize(options);
            //     await strategy.execute(getOrderRequestBody(AdyenPaymentMethodType.ACH));

            //     expect(adyenCheckout.create).toHaveBeenCalledTimes(1);
            //     expect(adyenCheckout.create).toHaveBeenCalledWith('ach', {
            //         hasHolderName: expect.any(Boolean),
            //         styles: expect.any(Object),
            //         placeholders: expect.any(Object),
            //         onChange: expect.any(Function),
            //         data: {
            //             holderName: 'Test Tester',
            //             billingAddress: {
            //                 street: '12345 Testing Way',
            //                 houseNumberOrName: '',
            //                 postalCode: '95555',
            //                 city: 'Some City',
            //                 stateOrProvince: 'CA',
            //                 country: 'US',
            //             },
            //         },
            //     });
            // });

            // it('calls submitPayment when paying with vaulted account', async () => {
            //     jest.spyOn(paymentIntegrationService.getState(), 'getPaymentMethodOrThrow')
            //         .mockReturnValue(getAdyenV2(AdyenPaymentMethodType.GiroPay));

            //     jest.spyOn(paymentIntegrationService, 'submitPayment')
            //         .mockReturnValueOnce(submitPaymentAction);

            //     options = getInitializeOptions(true);

            //     await strategy.initialize(options);
            //     await strategy.execute(getOrderRequestBodyWithVaultedInstrument(AdyenPaymentMethodType.GiroPay));

            //     expect(paymentIntegrationService.submitPayment).toHaveBeenCalledWith(expect.objectContaining({
            //         methodId: 'giropay',
            //         paymentData: {
            //             formattedPayload: expect.objectContaining({
            //                 bigpay_token : {
            //                     token: '123',
            //                 },
            //                 origin: 'http://localhost',
            //                 browser_info: {
            //                     color_depth: 24,
            //                     java_enabled: false,
            //                     language: 'en-US',
            //                     screen_height: 0,
            //                     screen_width: 0,
            //                     time_zone_offset: expect.anything(),
            //                 },
            //             }),
            //         },
            //     }));
            //     expect(adyenCheckout.create).toHaveBeenCalledTimes(0);
            // });

            // it('calls submitPayment, passing a set as default flag, when paying with vaulted account that should be defaulted', async () => {
            //     jest.spyOn(paymentIntegrationService.getState(), 'getPaymentMethodOrThrow')
            //         .mockReturnValue(getAdyenV2(AdyenPaymentMethodType.GiroPay));

            //     jest.spyOn(paymentIntegrationService, 'submitPayment')
            //         .mockReturnValueOnce(submitPaymentAction);

            //     options = getInitializeOptions(true);

            //     await strategy.initialize(options);
            //     await strategy.execute({
            //         useStoreCredit: false,
            //         payment: { methodId: 'giropay', paymentData: { instrumentId: '123', shouldSetAsDefaultInstrument: true } },
            //     });

            //     expect(paymentIntegrationService.submitPayment).toHaveBeenCalledWith(expect.objectContaining({
            //         paymentData: expect.objectContaining({
            //             formattedPayload: expect.objectContaining({
            //                 set_as_default_stored_instrument: true,
            //             }),
            //         }),
            //     }));
            // });

            // it('returns 3DS2 ChallengeShopper flow with no callbacks', async () => {
            //     jest.spyOn(paymentIntegrationService, 'submitPayment')
            //         .mockReturnValueOnce(of(createErrorAction(PaymentActionType.SubmitPaymentFailed, challengeShopperError)))
            //         .mockReturnValueOnce(submitPaymentAction);

            //     options = getInitializeOptionsWithNoCallbacks();
            //     await strategy.initialize(options);
            //     await strategy.execute(getOrderRequestBody());

            //     expect(paymentIntegrationService.submitPayment).toHaveBeenCalledTimes(2);
            //     expect(adyenCheckout.create).toHaveBeenCalledTimes(2);
            //     expect(adyenCheckout.createFromAction).toHaveBeenCalledTimes(1);
            // });

            // it('unmounts additional component when payment fails with challengeShopperError', async () => {
            //     additionalActionComponent = {
            //         mount: jest.fn(),
            //         unmount: jest.fn(),
            //     };

            //     jest.spyOn(paymentIntegrationService, 'submitPayment')
            //         .mockReturnValueOnce(of(createErrorAction(PaymentActionType.SubmitPaymentFailed, challengeShopperError)));

            //     const newOptions = {
            //         methodId: 'adyenv2',
            //         adyenv2: {
            //             containerId: 'adyen-scheme-component-field',
            //             cardVerificationContainerId: 'adyen-custom-card-component-field',
            //             threeDS2ContainerId: 'adyen-scheme-3ds-component-field',
            //             options: {
            //                 hasHolderName: true,
            //                 styles: {},
            //                 placeholders: {},
            //             },
            //             threeDS2Options: {
            //                 widgetSize: '05',
            //                 onBeforeLoad: jest.fn(),
            //                 onComplete: jest.fn(),
            //                 onLoad: jest.fn(),
            //             },
            //             additionalActionOptions: {
            //                 containerId: 'adyen-scheme-additional-action-component-field',
            //                 onBeforeLoad: jest.fn(),
            //                 onComplete: jest.fn(),
            //                 onLoad: jest.fn(func => {
            //                     func('Cancel');
            //                 }),
            //             },
            //             validateCardFields: jest.fn(),
            //         },
            //     };

            //     await strategy.initialize(newOptions);

            //     await expect(strategy.execute(getOrderRequestBody()))
            //         .rejects.toThrow(PaymentMethodCancelledError);

            //     expect(paymentIntegrationService.submitPayment).toHaveBeenCalledTimes(1);
            //     expect(additionalActionComponent.unmount).toHaveBeenCalledTimes(1);
            // });

            // describe( 'submitPayment fails with identifyShopperError', () => {
            //     beforeEach(async () => {
            //         jest.spyOn(paymentIntegrationService, 'submitPayment')
            //             .mockReturnValueOnce(of(createErrorAction(PaymentActionType.SubmitPaymentFailed, identifyShopperError)));

            //         await strategy.initialize(options);
            //     });

            //     it('calls submitPayment when additional action completes', async () => {
            //         jest.spyOn(paymentIntegrationService, 'submitPayment').mockReturnValueOnce(submitPaymentAction);

            //         await strategy.execute(getOrderRequestBody());

            //         expect(paymentIntegrationService.submitPayment).toHaveBeenCalledTimes(2);
            //         expect(adyenCheckout.create).toHaveBeenCalledTimes(2);
            //         expect(adyenCheckout.createFromAction).toHaveBeenCalledTimes(1);
            //     });

            //     it('returns UNKNOWN_ERROR when submitPayment fails', async () => {
            //         jest.spyOn(paymentIntegrationService, 'submitPayment')
            //             .mockReturnValueOnce(of(createErrorAction(PaymentActionType.SubmitPaymentFailed, getUnknownError())))
            //             .mockReturnValueOnce(submitPaymentAction);

            //         await expect(strategy.execute(getOrderRequestBody()))
            //             .rejects.toThrow(RequestError);

            //         expect(paymentIntegrationService.submitPayment).toHaveBeenCalledTimes(2);
            //         expect(adyenCheckout.create).toHaveBeenCalledTimes(2);
            //         expect(adyenCheckout.createFromAction).toHaveBeenCalledTimes(1);
            //     });

            //     describe( 'submitPayment fails with challengeShopperError', () => {
            //         beforeEach( () => {
            //             jest.spyOn(paymentIntegrationService, 'submitPayment')
            //                 .mockReturnValueOnce(of(createErrorAction(PaymentActionType.SubmitPaymentFailed, challengeShopperError)));
            //         });

            //         it('calls submitPayment when additional action completes', async () => {
            //             jest.spyOn(paymentIntegrationService, 'submitPayment')
            //                 .mockReturnValueOnce(submitPaymentAction);

            //             await strategy.execute(getOrderRequestBody());

            //             expect(paymentIntegrationService.submitPayment).toHaveBeenCalledTimes(3);
            //             expect(adyenCheckout.create).toHaveBeenCalledTimes(2);
            //             expect(adyenCheckout.createFromAction).toHaveBeenCalledTimes(2);
            //         });

            //         it('returns UNKNOWN_ERROR when submitPayment fails',  async  () => {
            //             jest.spyOn(paymentIntegrationService, 'submitPayment')
            //                 .mockReturnValueOnce(of(createErrorAction(PaymentActionType.SubmitPaymentFailed, getUnknownError())));

            //             await expect(strategy.execute(getOrderRequestBody()))
            //                 .rejects.toThrow(RequestError);

            //             expect(paymentIntegrationService.submitPayment).toHaveBeenCalledTimes(3);
            //             expect(adyenCheckout.create).toHaveBeenCalledTimes(2);
            //             expect(adyenCheckout.createFromAction).toHaveBeenCalledTimes(2);
            //         });
            //     });
            // });

            // describe( 'submitPayment fails with challengeShopperError', () => {
            //     beforeEach(async () => {
            //         jest.spyOn(paymentIntegrationService, 'submitPayment')
            //             .mockReturnValueOnce(of(createErrorAction(PaymentActionType.SubmitPaymentFailed, challengeShopperError)));

            //         await strategy.initialize(options);
            //     });

            //     it('calls submitPayment when additional action completes', async () => {
            //         jest.spyOn(paymentIntegrationService, 'submitPayment').mockReturnValueOnce(submitPaymentAction);

            //         await strategy.execute(getOrderRequestBody());

            //         expect(paymentIntegrationService.submitPayment).toHaveBeenCalledTimes(2);
            //         expect(adyenCheckout.create).toHaveBeenCalledTimes(2);
            //         expect(adyenCheckout.createFromAction).toHaveBeenCalledTimes(1);
            //     });

            //     it('returns UNKNOWN_ERROR when submitPayment fails', async () => {
            //         jest.spyOn(paymentIntegrationService, 'submitPayment')
            //             .mockReturnValueOnce(of(createErrorAction(PaymentActionType.SubmitPaymentFailed, getUnknownError())))
            //             .mockReturnValueOnce(submitPaymentAction);

            //         await expect(strategy.execute(getOrderRequestBody()))
            //             .rejects.toThrow(RequestError);

            //         expect(paymentIntegrationService.submitPayment).toHaveBeenCalledTimes(2);
            //         expect(adyenCheckout.create).toHaveBeenCalledTimes(2);
            //         expect(adyenCheckout.createFromAction).toHaveBeenCalledTimes(1);
            //     });
            // });
        });
    });

    describe('#finalize()', () => {
        it('throws an error to inform that order finalization is not required', async () => {
            const promise = strategy.finalize();

            return expect(promise).rejects.toBeInstanceOf(OrderFinalizationNotRequiredError);
        });
    });

    describe('#deinitialize', () => {
        beforeEach(() => {
            jest.spyOn(paymentIntegrationService.getState(), 'getPaymentMethodOrThrow').mockReturnValue(getAdyenV2());
        });

        it('deinitialize adyen payment strategy', async () => {
            const adyenClient = getAdyenClient();
            const adyenComponent = adyenClient.create('scheme', {});

            jest.spyOn(adyenV2ScriptLoader, 'load').mockReturnValue(Promise.resolve(adyenClient));
            jest.spyOn(adyenClient, 'create').mockReturnValue(adyenComponent);

            await strategy.initialize(getInitializeOptions());
            const promise = strategy.deinitialize();

            expect(adyenComponent.unmount).toHaveBeenCalled();

            return expect(promise).resolves.toBe();
        });

        it('does not unmount when adyen component is not available', async () => {
            const promise = strategy.deinitialize();

            return expect(promise).resolves.toBe();
        });
    });
});
