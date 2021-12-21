// import { createAction } from '@bigcommerce/data-store';
// import { createRequestSender, RequestSender } from '@bigcommerce/request-sender';
// import { createScriptLoader } from '@bigcommerce/script-loader';
// import { merge } from 'lodash';
// import { of, Observable } from 'rxjs';

// import { getCart } from '../../../cart/carts.mock';
// import { CheckoutActionCreator, createCheckoutStore, CheckoutRequestSender,  CheckoutStore, CheckoutValidator } from '../../../checkout';
// import { getCheckoutStoreState } from '../../../checkout/checkouts.mock';
// import { InvalidArgumentError } from '../../../common/error/errors';
// import { OrderActionCreator, OrderActionType, OrderRequestSender } from '../../../order';
// import { OrderFinalizationNotRequiredError } from '../../../order/errors';
// import { getOrderRequestBody } from '../../../order/internal-orders.mock';
// import { createPaymentClient,
//     PaymentActionCreator,
//     PaymentMethod,
//     PaymentMethodActionCreator,
//     PaymentMethodRequestSender,
//     PaymentRequestSender,
//     PaymentRequestTransformer } from '../../../payment';
// import { PaymentArgumentInvalidError, PaymentMethodCancelledError } from '../../../payment/errors';
// import { PaymentActionType, SubmitPaymentAction } from '../../../payment/payment-actions';
// import { getApplePay } from '../../../payment/payment-methods.mock';
// import { MockApplePaySession } from '../../../payment/strategies/apple-pay/apple-pay-payment.mock';
// import ApplePaySessionFactory from '../../../payment/strategies/apple-pay/apple-pay-session-factory';
// import { RemoteCheckoutActionCreator, RemoteCheckoutRequestSender } from '../../../remote-checkout';
// import { ConsignmentActionCreator, ConsignmentRequestSender } from '../../../shipping';
// import { createSpamProtection, PaymentHumanVerificationHandler } from '../../../spam-protection';

// import { ApplePayCustomerStrategy } from '.';

// describe('ApplePayCustomerStrategy', () => {
//     let store: CheckoutStore;
//     let requestSender: RequestSender;
//     let paymentClient: OrderRequestSender;
//     let remoteCheckoutActionCreator: RemoteCheckoutActionCreator;
//     let paymentMethodActionCreator: PaymentMethodActionCreator;
//     let consignmentActionCreator: ConsignmentActionCreator;
//     let paymentMethod: PaymentMethod;
//     let strategy: ApplePayCustomerStrategy;
//     let applePaySession: MockApplePaySession;
//     let submitPaymentAction: Observable<SubmitPaymentAction>;
//     let applePayFactory: ApplePaySessionFactory;

//     beforeEach(() => {
//         applePaySession = new MockApplePaySession();

//         Object.defineProperty(window, 'ApplePaySession', {
//             writable: true,
//             value: applePaySession,
//         });

//         store = createCheckoutStore(getCheckoutStoreState());
//         requestSender = createRequestSender();
//         paymentClient = createPaymentClient(store);
//         paymentMethod = getApplePay();
//         applePayFactory = new ApplePaySessionFactory();
//         submitPaymentAction = of(createAction(PaymentActionType.SubmitPaymentRequested));

//         remoteCheckoutActionCreator = new RemoteCheckoutActionCreator(
//             new RemoteCheckoutRequestSender(requestSender),
//             checkoutActionCreator
//         );

//         consignmentActionCreator = new ConsignmentActionCreator(
//             new ConsignmentRequestSender(requestSender),
//             new CheckoutRequestSender(requestSender)
//         );

//         paymentMethodActionCreator = new PaymentMethodActionCreator(
//             new PaymentMethodRequestSender(requestSender)
//         );

//         jest.spyOn(paymentMethodActionCreator, 'loadPaymentMethod')
//             .mockResolvedValue(store.getState());
//         jest.spyOn(requestSender, 'post')
//             .mockReturnValue(true);
//         jest.spyOn(applePayFactory, 'create')
//             .mockReturnValue(applePaySession);

//         strategy = new ApplePayCustomerStrategy(
//             store,
//             requestSender,
//             remoteCheckoutActionCreator,
//             paymentMethodActionCreator,
//             consignmentActionCreator,
//             applePayFactory
//         );
//     });

//     describe('#initialize()', () => {
//         it('throws invalid argument error if no method id', async () => {
//             await expect(strategy.initialize())
//                 .rejects.toBeInstanceOf(InvalidArgumentError);
//         });

//         it('initializes the strategy successfully', async () => {
//             await strategy.initialize({ methodId: 'applepay' });
//             expect(paymentMethodActionCreator.loadPaymentMethod).toHaveBeenCalled();
//         });
//     });

//     describe('#execute()', () => {
//         beforeEach(() => {
//             jest.spyOn(store.getState().cart, 'getCartOrThrow')
//                 .mockReturnValue(getCart());
//         });

//         it('throws error when payment data is empty', async () => {
//             await expect(strategy.execute({})).rejects.toThrow(PaymentArgumentInvalidError);
//         });

//         it('validates merchant', async () => {
//             const payload = merge({}, getOrderRequestBody(), {
//                 payment: { methodId: paymentMethod.id },
//             });
//             strategy.execute(payload);

//             const validateEvent = {
//                 validationURL: 'test',
//             } as ApplePayJS.ApplePayValidateMerchantEvent;

//             await new Promise(resolve => process.nextTick(resolve));
//             await applePaySession.onvalidatemerchant(validateEvent);

//             expect(applePaySession.begin).toHaveBeenCalled();
//             expect(requestSender.post).toHaveBeenCalled();
//         });

//         it('throws error if merchant validation fails', async () => {
//             jest.spyOn(requestSender, 'post')
//                 .mockRejectedValue(false);

//             const payload = merge({}, getOrderRequestBody(), {
//                 payment: { methodId: paymentMethod.id },
//             });
//             strategy.execute(payload);

//             await new Promise(resolve => process.nextTick(resolve));

//             const validateEvent = {
//                 validationURL: 'test',
//             } as ApplePayJS.ApplePayValidateMerchantEvent;

//             try {
//                 await applePaySession.onvalidatemerchant(validateEvent);
//             } catch (error) {
//                 expect(error).toBeInstanceOf(Error);
//             }
//         });

//         // tests for Sign in and sign out??

//         it('updates shipping contact when shopper selects contact', async () => {
//             // todo
//         });

//         it('updates shipping address when shopper selects address', async () => {
//             // todo
//         });

//         it('throws error when Apple Pay payment sheet is cancelled', async () => {
//             jest.spyOn(requestSender, 'post')
//                 .mockRejectedValue(false);

//             const payload = merge({}, getOrderRequestBody(), {
//                 payment: { methodId: paymentMethod.id },
//             });
//             const promise = strategy.execute(payload);
//             await new Promise(resolve => process.nextTick(resolve));
//             applePaySession.oncancel();

//             expect(promise).rejects.toThrow(new PaymentMethodCancelledError('Continue with applepay'));
//         });

//         it('submits payment when shopper authorises', async () => {
//             const payload = merge({}, getOrderRequestBody(), {
//                 payment: { methodId: paymentMethod.id },
//             });
//             const authEvent = {
//                 payment: {
//                     token: {
//                         paymentData: {},
//                         paymentMethod: {},
//                         transactionIdentifier: {},
//                     },
//                 },
//             } as ApplePayJS.ApplePayPaymentAuthorizedEvent;
//             strategy.execute(payload);
//             await new Promise(resolve => process.nextTick(resolve));
//             await applePaySession.onpaymentauthorized(authEvent);

//             expect(paymentActionCreator.submitPayment).toHaveBeenCalled();
//             expect(applePaySession.completePayment).toHaveBeenCalled();
//         });
//     });

//     describe('#finalize()', () => {
//         it('throws error to inform that order finalization is not required', async () => {
//             await expect(strategy.finalize()).rejects.toThrow(OrderFinalizationNotRequiredError);
//         });
//     });

//     describe('#deinitialize()', () => {
//         it('deinitializes strategy', async () => {
//             await expect(strategy.deinitialize()).resolves.toEqual(store.getState());
//         });
//     });
// });
