import { createAction } from '@bigcommerce/data-store';
import { Observable, of } from 'rxjs';

import { PaymentProviderCustomer } from './payment-provider-customer';
import {
    PaymentProviderCustomerAction,
    PaymentProviderCustomerType,
} from './payment-provider-customer-actions';

export default class PaymentProviderCustomerActionCreator {
    updatePaymentProviderCustomer<T>(
        providerCustomerData: PaymentProviderCustomer<T>,
    ): Observable<PaymentProviderCustomerAction> {
        return of(
            createAction(
                PaymentProviderCustomerType.UpdatePaymentProviderCustomer,
                providerCustomerData,
            ),
        );
    }
}
