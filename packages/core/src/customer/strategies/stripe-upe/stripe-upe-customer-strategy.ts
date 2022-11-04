import { createAction } from '@bigcommerce/data-store';
import { AddressRequestBody } from 'packages/core/src/address';
import ConsignmentActionCreator from 'packages/core/src/shipping/consignment-action-creator';
import { CheckoutStore, InternalCheckoutSelectors } from '../../../checkout';
import { InvalidArgumentError, MissingDataError, MissingDataErrorType } from '../../../common/error/errors';
import { PaymentMethodActionCreator } from '../../../payment';
import { StripeElements, StripeElementType, StripeScriptLoader, StripeUPEClient, StripeEventType, StripeUPEAppearanceOptions } from '../../../payment/strategies/stripe-upe';
import CustomerActionCreator from '../../customer-action-creator';
import { CustomerActionType } from '../../customer-actions';
import CustomerCredentials from '../../customer-credentials';
import { CustomerInitializeOptions, CustomerRequestOptions, ExecutePaymentMethodCheckoutOptions } from '../../customer-request-options';
import CustomerStrategy from '../customer-strategy';


export default class StripeUPECustomerStrategy implements CustomerStrategy {
    private _stripeElements?: StripeElements;

    constructor(
        private _store: CheckoutStore,
        private _stripeUPEScriptLoader: StripeScriptLoader,
        private _customerActionCreator: CustomerActionCreator,
        private _paymentMethodActionCreator: PaymentMethodActionCreator,
        private _consignmentActionCreator: ConsignmentActionCreator
    ) { }

    async initialize(options: CustomerInitializeOptions): Promise<InternalCheckoutSelectors> {
        let stripeUPEClient: StripeUPEClient;
        if (!options.stripeupe) {
            throw new InvalidArgumentError(`Unable to proceed because "options" argument is not provided.`);
        }

        const { container, gatewayId, methodId, onEmailChange, getStyles, isLoading } = options.stripeupe;

        Object.entries(options.stripeupe).forEach(([key, value]) => {
            if (!value) {
                throw new InvalidArgumentError(`Unable to proceed because "${key}" argument is not provided.`);
            }
        });

        const {
            paymentMethods: { getPaymentMethodOrThrow }, customer: { getCustomerOrThrow },
        } = await this._store.dispatch(
            this._paymentMethodActionCreator.loadPaymentMethod(gatewayId, { params: { method: methodId } })
        );
        const {
            clientToken, initializationData: { stripePublishableKey, stripeConnectedAccount } = {}
        } = getPaymentMethodOrThrow(methodId, gatewayId);
        const { email, isStripeLinkAuthenticated } = getCustomerOrThrow();

        if (!email) {
            if (!stripePublishableKey || !clientToken) {
                throw new MissingDataError(MissingDataErrorType.MissingPaymentToken);
            }

            let appearance: StripeUPEAppearanceOptions | undefined;
            const styles = typeof getStyles === 'function' && getStyles();

            if (styles) {
                appearance = {
                    variables: {
                        colorPrimary: styles.fieldInnerShadow,
                        colorBackground: styles.fieldBackground,
                        colorText: styles.labelText,
                        colorDanger: styles.fieldErrorText,
                        colorTextSecondary: styles.labelText,
                        colorTextPlaceholder: styles.fieldPlaceholderText,
                    },
                    rules: {
                        '.Input': {
                            borderColor: styles.fieldBorder,
                            color: styles.fieldText,
                            boxShadow: styles.fieldInnerShadow,
                        },
                    }
                };
            } else {
                appearance = {}
            }

            stripeUPEClient = await this._stripeUPEScriptLoader.getStripeClient(stripePublishableKey, stripeConnectedAccount);

            this._stripeElements = this._stripeUPEScriptLoader.getElements(stripeUPEClient, {
                clientSecret: clientToken,
                appearance,
            });

            const linkAuthenticationElement = this._stripeElements.getElement(StripeElementType.AUTHENTICATION) || this._stripeElements.create(StripeElementType.AUTHENTICATION);

            linkAuthenticationElement.on('change', (event: StripeEventType) => {
                if (!('authenticated' in event)) {
                    throw new MissingDataError(MissingDataErrorType.MissingCustomer);
                }
                if (isStripeLinkAuthenticated && !event.authenticated) {
                    const state = this._store.getState();
                    const shippingAddres = state.shippingAddress.getShippingAddressOrThrow();
                    const resetAddress = this._resetAddress(shippingAddres);

                    return this._store.dispatch(
                        this._consignmentActionCreator.updateAddress(resetAddress, options)
                    );

                }
                this._store.dispatch(createAction(CustomerActionType.StripeLinkAuthenticated, event.authenticated));
                event.complete ? onEmailChange(event.authenticated, event.value.email) : onEmailChange(false, '');

                if (isLoading) {
                    isLoading(false);
                }
            });

            linkAuthenticationElement.mount(`#${container}`);

        }

        return this._store.getState();
    }

    deinitialize(): Promise<InternalCheckoutSelectors> {
        this._stripeElements?.getElement(StripeElementType.AUTHENTICATION)?.unmount();

        return Promise.resolve(this._store.getState());
    }

    signIn(credentials: CustomerCredentials, options?: CustomerRequestOptions): Promise<InternalCheckoutSelectors> {
        return this._store.dispatch(
            this._customerActionCreator.signInCustomer(credentials, options)
        );
    }

    signOut(options?: CustomerRequestOptions): Promise<InternalCheckoutSelectors> {
        return this._store.dispatch(
            this._customerActionCreator.signOutCustomer(options)
        );
    }

    executePaymentMethodCheckout(options?: ExecutePaymentMethodCheckoutOptions): Promise<InternalCheckoutSelectors> {
        options?.continueWithCheckoutCallback?.();

        return Promise.resolve(this._store.getState());
    }

    _resetAddress(address: AddressRequestBody) {

        const { firstName, lastName, company, address1, address2, city, stateOrProvince, stateOrProvinceCode, countryCode, postalCode, phone  } = address;

        return {
            ...address,
            firstName: firstName !== 'Fake' ? firstName : '',
            lastName: lastName !== 'Fake' ? lastName : '',
            company: company !== 'Fake' ? company : '',
            address1: address1 !== 'Fake' ? address1 : '',
            address2: address2 !== 'Fake' ? address2 : '',
            city: city !== 'Fake' ? city : '',
            stateOrProvince: stateOrProvince !== 'Fake' ? stateOrProvince : '',
            stateOrProvinceCode: stateOrProvinceCode !== 'Fake' ? stateOrProvinceCode : '',
            countryCode: countryCode !== 'Fake' ? countryCode : '',
            postalCode: postalCode !== 'Fake' ? postalCode : '',
            phone: phone !== 'Fake' ? phone : '',
        }
    }
}

