import { CheckoutButtonInitializeOptions } from '../../checkout-button-options';
import { CheckoutButtonMethodType } from '../index';

export function getApplePayButtonInitializationOptions(): CheckoutButtonInitializeOptions {
    return {
        containerId: 'applePayCheckoutButton',
        methodId: CheckoutButtonMethodType.APPLEPAY,
        applepay: {
            container: 'applePayCheckoutButton',
            shippingLabel: 'Shipping',
            subtotalLabel: 'Subtotal',
            onPaymentAuthorize: jest.fn(),
            onError: jest.fn(),
        },
    };
}

export function getContactAddress() {
    return {
        administrativeArea: 'CA',
        country: 'United States',
        countryCode: 'US',
        emailAddress: 'test@test.com',
        familyName: '',
        givenName: '',
        locality: 'San Francisco',
        phoneticFamilyName: '',
        phoneticGivenName: '',
        postalCode: '94114',
        subAdministrativeArea: '',
        subLocality: '',
    };
}
