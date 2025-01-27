export { default as PaymentIntegrationServiceMock } from './payment-integration-service.mock';
export { default as getBuyNowCartRequestBody } from './buy-now-cart-request-body.mock';
export { default as getBillingAddress } from './billing-address.mock';
export { default as getCart, getBuyNowCart } from './carts.mock';
export { getCustomer, getGuestCustomer } from './customer.mock';
export { default as getCheckout, getCheckoutWithBuyNowCart } from './checkouts.mock';
export { default as getConfig } from './config.mock';
export { default as getConsignment } from './consignment.mock';
export { default as getCountries } from './countries.mock';
export { default as getOrderRequestBody } from './internal-orders.mock';
export { getOrder } from './orders.mock';
export {
    getResponse,
    getPaymentResponse,
    getErrorResponse,
    getErrorResponseBody,
    getTimeoutResponse,
} from './responses.mock';
export { default as getShippingOption } from './shipping-option.mock';
export {
    getPayment,
    getPaymentMethod,
    getCreditCardInstrument,
    getVaultedInstrument,
    getErrorPaymentResponseBody,
    getInstruments,
} from './payments.mock';

export { getShippingAddress, getShippingAddressWithCustomFields } from './shipping-addresses.mock';
export { getAddress } from './address.mock';
