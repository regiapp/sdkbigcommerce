import { PaymentMethodClientUnavailableError } from '@bigcommerce/checkout-sdk/payment-integration-api';

import type { BlueSnapDirectSdk } from './types';

interface BlueSnapDirectHostWindow extends Window {
    bluesnap: BlueSnapDirectSdk;
}

function isBlueSnapDirectWindow(window: Window): window is BlueSnapDirectHostWindow {
    return 'bluesnap' in window;
}

export default function assertBlueSnapDirectWindow(
    window: Window,
): asserts window is BlueSnapDirectHostWindow {
    if (!isBlueSnapDirectWindow(window)) {
        throw new PaymentMethodClientUnavailableError();
    }
}
