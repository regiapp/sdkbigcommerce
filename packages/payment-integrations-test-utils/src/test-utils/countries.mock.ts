import { Country } from '@bigcommerce/checkout-sdk/payment-integration-api';

export default function getCountries(): Country[] {
    return [getAustralia(), getUnitedStates(), getJapan()];
}

export function getAustralia(): Country {
    return {
        code: 'AU',
        name: 'Australia',
        subdivisions: [
            { code: 'NSW', name: 'New South Wales' },
            { code: 'VIC', name: 'Victoria' },
        ],
        hasPostalCodes: true,
        requiresState: true,
    };
}

export function getUnitedStates(): Country {
    return {
        code: 'US',
        name: 'United States',
        hasPostalCodes: true,
        subdivisions: [
            { code: 'CA', name: 'California' },
            { code: 'TX', name: 'Texas' },
        ],
        requiresState: false,
    };
}

export function getJapan(): Country {
    return {
        code: 'JP',
        name: 'Japan',
        hasPostalCodes: false,
        subdivisions: [],
        requiresState: false,
    };
}
