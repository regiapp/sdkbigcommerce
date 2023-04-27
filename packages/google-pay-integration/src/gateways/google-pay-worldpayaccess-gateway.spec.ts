import { PaymentIntegrationService } from '@bigcommerce/checkout-sdk/payment-integration-api';
import { PaymentIntegrationServiceMock } from '@bigcommerce/checkout-sdk/payment-integrations-test-utils';

import getCardDataResponse from '../mocks/google-pay-card-data-response.mock';

import GooglePayGateway from './google-pay-gateway';
import GooglePayWorldpayAccessGateway from './google-pay-worldpayaccess-gateway';

describe('GooglePayWorldpayAccessGateway', () => {
    let gateway: GooglePayWorldpayAccessGateway;
    let paymentIntegrationService: PaymentIntegrationService;

    beforeEach(() => {
        paymentIntegrationService = new PaymentIntegrationServiceMock();

        gateway = new GooglePayWorldpayAccessGateway(paymentIntegrationService);
    });

    it('is a special type of GooglePayGateway', () => {
        expect(gateway).toBeInstanceOf(GooglePayGateway);
    });

    describe('#mapToExternalCheckoutData', () => {
        it('should map response to external checkout data', async () => {
            const expectedData = {
                nonce: btoa(
                    '{"signature":"foo","protocolVersion":"ECv1","signedMessage":{"encryptedMessage":"bar","ephemeralPublicKey":"baz","tag":"foobar"}}',
                ),
                card_information: {
                    type: 'VISA',
                    number: '1111',
                },
            };

            const mappedData = await gateway.mapToExternalCheckoutData(getCardDataResponse());

            expect(mappedData).toStrictEqual(expectedData);
        });
    });
});
