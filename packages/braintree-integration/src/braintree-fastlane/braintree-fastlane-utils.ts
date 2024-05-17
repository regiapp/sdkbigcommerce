import { isEqual, omit } from 'lodash';

import {
    BraintreeConnect,
    BraintreeConnectAddress,
    BraintreeConnectPhone,
    BraintreeConnectProfileData,
    BraintreeConnectVaultedInstrument,
    BraintreeFastlane,
    BraintreeFastlaneAddress,
    BraintreeFastlaneAuthenticationState,
    BraintreeFastlaneProfileData,
    BraintreeFastlaneStylesOption,
    BraintreeFastlaneVaultedInstrument,
    BraintreeInitializationData,
    BraintreeIntegrationService,
    isBraintreeConnectPhone,
} from '@bigcommerce/checkout-sdk/braintree-utils';
import {
    CardInstrument,
    CustomerAddress,
    InvalidArgumentError,
    MissingDataError,
    MissingDataErrorType,
    PaymentIntegrationService,
    PaymentMethodClientUnavailableError,
    UntrustedShippingCardVerificationType,
} from '@bigcommerce/checkout-sdk/payment-integration-api';
import { BrowserStorage } from '@bigcommerce/checkout-sdk/storage';

export default class BraintreeFastlaneUtils {
    private braintreeConnect?: BraintreeConnect;
    private braintreeFastlane?: BraintreeFastlane;
    private methodId?: string;

    constructor(
        private paymentIntegrationService: PaymentIntegrationService,
        private braintreeIntegrationService: BraintreeIntegrationService,
        private browserStorage: BrowserStorage,
    ) {}

    async getDeviceSessionId(): Promise<string | undefined> {
        const cart = this.paymentIntegrationService.getState().getCart();

        return this.braintreeIntegrationService.getSessionId(cart?.id);
    }

    /**
     *
     * Initialization method
     *
     */
    async initializeBraintreeAcceleratedCheckoutOrThrow(
        // TODO: Rename to initializeBraintreeFastlaneOrThrow when connect will be deprecated
        methodId: string,
        styles?: BraintreeFastlaneStylesOption,
    ) {
        const state = this.paymentIntegrationService.getState();
        const cart = state.getCart();
        const storeConfig = state.getStoreConfigOrThrow();
        const { clientToken, config, initializationData } =
            state.getPaymentMethodOrThrow<BraintreeInitializationData>(methodId);

        if (!clientToken || !initializationData) {
            throw new MissingDataError(MissingDataErrorType.MissingPaymentMethod);
        }

        this.methodId = methodId;

        this.braintreeIntegrationService.initialize(clientToken, storeConfig);

        if (initializationData?.isFastlaneEnabled) {
            this.braintreeFastlane = await this.braintreeIntegrationService.getBraintreeFastlane(
                cart?.id,
                config.testMode,
                styles,
            );
        } else {
            this.braintreeConnect = await this.braintreeIntegrationService.getBraintreeConnect(
                cart?.id,
                config.testMode,
                styles,
            );
        }
    }

    /**
     *
     * Braintree Connect methods
     *
     */
    getBraintreeConnectOrThrow(): BraintreeConnect {
        if (!this.braintreeConnect) {
            throw new PaymentMethodClientUnavailableError();
        }

        return this.braintreeConnect;
    }

    getBraintreeConnectComponentOrThrow(): BraintreeConnect['ConnectCardComponent'] {
        const braintreeConnect = this.getBraintreeConnectOrThrow();

        return braintreeConnect.ConnectCardComponent;
    }

    /**
     *
     * Braintree Fastlane methods
     *
     */
    getBraintreeFastlaneOrThrow(): BraintreeFastlane {
        if (!this.braintreeFastlane) {
            throw new PaymentMethodClientUnavailableError();
        }

        return this.braintreeFastlane;
    }

    getBraintreeFastlaneComponentOrThrow(): BraintreeFastlane['FastlaneCardComponent'] {
        const braintreeFastlane = this.getBraintreeFastlaneOrThrow();

        return braintreeFastlane.FastlaneCardComponent;
    }

    /**
     *
     * Authentication methods
     *
     * */
    async runPayPalConnectAuthenticationFlowOrThrow(email?: string): Promise<void> {
        try {
            const methodId = this.getMethodIdOrThrow();

            const braintreeConnect = this.getBraintreeConnectOrThrow();
            const { lookupCustomerByEmail, triggerAuthenticationFlow } = braintreeConnect.identity;

            const state = this.paymentIntegrationService.getState();
            const cart = state.getCartOrThrow();
            const customer = state.getCustomer();
            const billingAddress = state.getBillingAddress();

            const customerEmail = email || customer?.email || billingAddress?.email || '';

            const { customerContextId } = await lookupCustomerByEmail(customerEmail);

            if (!customerContextId) {
                // Info: we should clean up previous experience with default data and related authenticationState
                await this.paymentIntegrationService.updatePaymentProviderCustomer({
                    authenticationState: BraintreeFastlaneAuthenticationState.UNRECOGNIZED,
                    addresses: [],
                    instruments: [],
                });

                this.browserStorage.setItem('sessionId', cart.id);

                return;
            }

            const { authenticationState, profileData } = await triggerAuthenticationFlow(
                customerContextId,
            );

            if (authenticationState === BraintreeFastlaneAuthenticationState.CANCELED) {
                await this.paymentIntegrationService.updatePaymentProviderCustomer({
                    authenticationState,
                    addresses: [],
                    instruments: [],
                });

                this.browserStorage.removeItem('sessionId');

                return;
            }

            const shippingAddresses =
                this.mapPayPalToBcAddress(profileData.addresses, profileData.phones) || [];
            const paypalBillingAddresses = this.getPayPalBillingAddresses(profileData);
            const billingAddresses =
                this.mapPayPalToBcAddress(paypalBillingAddresses, profileData.phones) || [];
            const instruments = this.mapPayPalToBcInstrument(methodId, profileData.cards) || [];
            const addresses = this.mergeShippingAndBillingAddresses(
                shippingAddresses,
                billingAddresses,
            );

            this.browserStorage.setItem('sessionId', cart.id);

            await this.paymentIntegrationService.updatePaymentProviderCustomer({
                authenticationState,
                addresses,
                instruments,
            });

            if (billingAddresses.length > 0) {
                await this.paymentIntegrationService.updateBillingAddress(billingAddresses[0]);
            }

            if (shippingAddresses.length > 0 && cart.lineItems.physicalItems.length > 0) {
                await this.paymentIntegrationService.updateShippingAddress(shippingAddresses[0]);
            }
        } catch (error) {
            // TODO: we should figure out what to do here
            // TODO: because we should not to stop the flow if the error occurs on paypal side
        }
    }

    async runPayPalFastlaneAuthenticationFlowOrThrow(email?: string): Promise<void> {
        try {
            const methodId = this.getMethodIdOrThrow();

            const braintreeFastlane = this.getBraintreeFastlaneOrThrow();
            const { lookupCustomerByEmail, triggerAuthenticationFlow } = braintreeFastlane.identity;

            const state = this.paymentIntegrationService.getState();
            const cart = state.getCartOrThrow();
            const customer = state.getCustomer();
            const billingAddress = state.getBillingAddress();

            const customerEmail = email || customer?.email || billingAddress?.email || '';

            const { customerContextId } = await lookupCustomerByEmail(customerEmail);

            if (!customerContextId) {
                // Info: we should clean up previous experience with default data and related authenticationState
                await this.paymentIntegrationService.updatePaymentProviderCustomer({
                    authenticationState: BraintreeFastlaneAuthenticationState.UNRECOGNIZED,
                    addresses: [],
                    instruments: [],
                });

                this.browserStorage.setItem('sessionId', cart.id);

                return;
            }

            const { authenticationState, profileData } = await triggerAuthenticationFlow(
                customerContextId,
            );
            const phoneNumber = profileData?.shippingAddress?.phoneNumber || '';

            if (authenticationState === BraintreeFastlaneAuthenticationState.CANCELED) {
                await this.paymentIntegrationService.updatePaymentProviderCustomer({
                    authenticationState,
                    addresses: [],
                    instruments: [],
                });

                this.browserStorage.removeItem('sessionId');

                return;
            }

            const shippingAddresses =
                this.mapPayPalToBcAddress([profileData.shippingAddress], [phoneNumber]) || [];
            const paypalBillingAddress = this.getPayPalFastlaneBillingAddress(profileData);
            const billingAddresses = paypalBillingAddress
                ? this.mapPayPalToBcAddress([paypalBillingAddress], [phoneNumber])
                : [];
            const instruments = this.mapPayPalToBcInstrument(methodId, [profileData.card]) || [];
            const addresses = this.mergeShippingAndBillingAddresses(
                shippingAddresses,
                billingAddresses,
            );

            this.browserStorage.setItem('sessionId', cart.id);
            await this.paymentIntegrationService.updatePaymentProviderCustomer({
                authenticationState,
                addresses,
                instruments,
            });

            if (billingAddresses.length > 0 && cart.lineItems.physicalItems.length > 0) {
                await this.paymentIntegrationService.updateBillingAddress(billingAddresses[0]);
            }

            // Prefill billing form if only digital items in cart with billing data and firstName and lastName
            // from shippingAddresses because there are empty in billing
            if (
                billingAddresses.length > 0 &&
                cart.lineItems.digitalItems.length > 0 &&
                cart.lineItems.physicalItems.length === 0
            ) {
                const { firstName, lastName } = addresses[0];
                const digitalItemBilling = {
                    ...billingAddresses[0],
                    firstName,
                    lastName,
                };
                await this.paymentIntegrationService.updateBillingAddress(digitalItemBilling);
            }

            if (shippingAddresses.length > 0 && cart.lineItems.physicalItems.length > 0) {
                await this.paymentIntegrationService.updateShippingAddress(shippingAddresses[0]);
            }
        } catch (error) {
            // TODO: we should figure out what to do here
            // TODO: because we should not to stop the flow if the error occurs on paypal side
        }
    }

    /**
     *
     * PayPal to BC data mappers
     *
     * */
    mapPayPalToBcInstrument(
        methodId: string,
        instruments?: BraintreeConnectVaultedInstrument[] | BraintreeFastlaneVaultedInstrument[],
    ): CardInstrument[] | undefined {
        if (!instruments) {
            return;
        }

        return instruments.map((instrument) => {
            const { id, paymentSource } = instrument;
            const { brand, expiry, lastDigits } = paymentSource.card;

            const [expiryYear, expiryMonth] = expiry.split('-');

            return {
                bigpayToken: id,
                brand,
                defaultInstrument: false,
                expiryMonth,
                expiryYear,
                iin: '',
                last4: lastDigits,
                method: methodId,
                provider: methodId,
                trustedShippingAddress: false,
                type: 'card',
                untrustedShippingCardVerificationMode: UntrustedShippingCardVerificationType.PAN,
            };
        });
    }

    private mapPayPalToBcAddress(
        addresses?: BraintreeFastlaneAddress[],
        phones?: BraintreeConnectPhone[] | string[],
    ): CustomerAddress[] {
        if (!addresses) {
            return [];
        }

        const countries = this.paymentIntegrationService.getState().getCountries() || [];
        let phoneNumber: string;

        if (phones && typeof phones[0] === 'string') {
            phoneNumber = phones[0];
        }

        if (phones && isBraintreeConnectPhone(phones[0])) {
            phoneNumber = phones[0].country_code + phones[0].national_number;
        }

        const getCountryNameByCountryCode = (countryCode: string) => {
            const matchedCountry = countries.find((country) => country.code === countryCode);

            return matchedCountry?.name || '';
        };

        return addresses.map((address) => ({
            id: Date.now(),
            type: 'paypal-address',
            firstName: address.firstName || '',
            lastName: address.lastName || '',
            company: address.company || '',
            address1: address.streetAddress,
            address2: address.extendedAddress || '',
            city: address.locality,
            stateOrProvince: address.region,
            stateOrProvinceCode: address.region,
            country: getCountryNameByCountryCode(address.countryCodeAlpha2),
            countryCode: address.countryCodeAlpha2,
            postalCode: address.postalCode,
            phone: phoneNumber || '',
            customFields: [],
        }));
    }

    /**
     *
     * Get PayPal billing addresses from stored braintree instruments info
     *
     * */
    private getPayPalBillingAddresses(
        profileData?: BraintreeConnectProfileData,
    ): BraintreeConnectAddress[] | undefined {
        const { cards, name } = profileData || {};

        if (!cards?.length) {
            return;
        }

        return cards.reduce(
            (
                billingAddressesList: BraintreeConnectAddress[],
                instrument: BraintreeConnectVaultedInstrument,
            ) => {
                const { firstName, lastName } = instrument.paymentSource.card.billingAddress;
                const { given_name, surname } = name || {};
                const address = {
                    ...instrument.paymentSource.card.billingAddress,
                    firstName: firstName || given_name,
                    lastName: lastName || surname,
                };
                const isAddressExist = billingAddressesList.some(
                    (existingAddress: BraintreeConnectAddress) =>
                        isEqual(
                            this.normalizeAddress(address),
                            this.normalizeAddress(existingAddress),
                        ),
                );

                return isAddressExist ? billingAddressesList : [...billingAddressesList, address];
            },
            [],
        );
    }

    private getPayPalFastlaneBillingAddress(
        profileData?: BraintreeFastlaneProfileData,
    ): BraintreeFastlaneAddress | undefined {
        const { card, name } = profileData || {};

        if (!card) {
            return;
        }

        const { firstName, lastName } = card.paymentSource.card.billingAddress;
        const { given_name, surname } = name || {};
        const { shippingAddress } = profileData || {};
        const address = {
            ...card.paymentSource.card.billingAddress,
            firstName: firstName || given_name,
            lastName: lastName || surname,
        };

        const isAddressExist =
            shippingAddress &&
            isEqual(this.normalizeAddress(address), this.normalizeAddress(shippingAddress));

        return isAddressExist ? shippingAddress : address;
    }

    private normalizeAddress(
        address: CustomerAddress | BraintreeConnectAddress | BraintreeFastlaneAddress,
    ) {
        return omit(address, ['id']);
    }

    private mergeShippingAndBillingAddresses(
        shippingAddresses: CustomerAddress[],
        billingAddresses: CustomerAddress[],
    ): CustomerAddress[] {
        const filteredBillingAddresses = billingAddresses.filter(
            (billingAddress: CustomerAddress) =>
                !shippingAddresses.some((shippingAddress: CustomerAddress) => {
                    return isEqual(
                        this.normalizeAddress(shippingAddress),
                        this.normalizeAddress(billingAddress),
                    );
                }),
        );

        return [...shippingAddresses, ...filteredBillingAddresses];
    }

    /**
     *
     * Other
     *
     * */
    private getMethodIdOrThrow(): string {
        if (!this.methodId) {
            throw new InvalidArgumentError(
                'Unable to proceed because "methodId" argument is not provided.',
            );
        }

        return this.methodId;
    }
}
