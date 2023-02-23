import isCreditCardLike from './is-credit-card-like';
import isNonceLike from './is-nonce-like';
import { HybridHostedFormInstrument, PaymentInstrument } from './payment';

export default function isHybridHostedFormInstrumentLike(
    instrument: PaymentInstrument,
): instrument is HybridHostedFormInstrument {
    return (
        isNonceLike(instrument) && isCreditCardLike(instrument) && 'hostedFormNonce' in instrument
    );
}
