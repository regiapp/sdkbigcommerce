import { getBillingAddress } from './address.mock';
import getCart from './carts.mock';
import getCheckout from './checkouts.mock';
import getConfig from './config.mock';
import { getOrder } from './orders.mock';

const subscribe = jest.fn();
const state = {
    getBillingAddress: jest.fn(() => getBillingAddress()),
    getCartOrThrow: jest.fn(() => getCart()),
    getCheckoutOrThrow: jest.fn(() => getCheckout()),
    getHost: jest.fn(),
    getLocale: jest.fn(),
    getOrder: jest.fn(() => getOrder()),
    getStoreConfig: jest.fn(() => getConfig().storeConfig),
    getStoreConfigOrThrow: jest.fn(() => getConfig().storeConfig),
    getPaymentMethodOrThrow: jest.fn(),
    getPaymentStatus: jest.fn(),
    getBillingAddressOrThrow: jest.fn(() => getBillingAddress()),
};

const createHostedForm = jest.fn();
const getState = jest.fn(() => state);
const createHostedForm = jest.fn();
const initializeOffsitePayment = jest.fn();
const loadCheckout = jest.fn();
const loadDefaultCheckout = jest.fn();
const loadPaymentMethod = jest.fn();
const submitOrder = jest.fn();
const submitPayment = jest.fn();
const finalizeOrder = jest.fn();
const updateBillingAddress = jest.fn();
const updateShippingAddress = jest.fn();
const signOut = jest.fn();
const selectShippingOption = jest.fn();

const PaymentIntegrationServiceMock = jest.fn().mockImplementation(() => {
    return {
        createHostedForm,
        subscribe,
        getState,
        createHostedForm,
        initializeOffsitePayment,
        loadCheckout,
        loadDefaultCheckout,
        loadPaymentMethod,
        submitOrder,
        submitPayment,
        finalizeOrder,
        updateBillingAddress,
        updateShippingAddress,
        signOut,
        selectShippingOption,
    };
});

export default PaymentIntegrationServiceMock;
