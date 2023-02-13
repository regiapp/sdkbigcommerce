import { Checkout } from '../checkout';
import { Config } from '../config';
import { Order, OrderMeta } from '../order';
import {
    HostedCreditCardInstrument,
    HostedVaultedInstrument,
    NonceInstrument,
    PaymentAdditionalAction,
    PaymentInstrumentMeta,
    PaymentMethod,
    PaymentMethodMeta,
} from '../payment';

export default interface HostedFormOrderData {
    additionalAction?: PaymentAdditionalAction;
    authToken: string;
    checkout?: Checkout;
    config?: Config;
    order?: Order;
    orderMeta?: OrderMeta;
    payment?:
        | ((HostedCreditCardInstrument | HostedVaultedInstrument) & PaymentInstrumentMeta)
        | NonceInstrument;
    paymentMethod?: PaymentMethod;
    paymentMethodMeta?: PaymentMethodMeta;
}
