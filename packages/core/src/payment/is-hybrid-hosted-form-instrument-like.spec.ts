import isHybridHostedFormInstrumentLike from './is-hybrid-hosted-form-instrument-like';
import { getCreditCardInstrument } from './payments.mock';

describe('isHybridHostedFormInstrumentLike', () => {
    it('returns true if the object looks like an Hybrid Hosted Form', () => {
        const paymentData = {
            nonce: 'my_nonce',
            ...getCreditCardInstrument(),
            hostedFormNonce: 'hosted_form_nonce',
        };

        expect(isHybridHostedFormInstrumentLike(paymentData)).toBeTruthy();
    });

    it('returns false if a Vaulted Instrument', () => {
        const paymentData = { instrumentId: 'my_instrument_id', cvv: 123, iin: '123123' };

        expect(isHybridHostedFormInstrumentLike(paymentData)).toBeFalsy();
    });
});
