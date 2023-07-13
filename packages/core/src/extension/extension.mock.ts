import { Extension, ExtensionRegion } from './extension';
import { ExtensionCommandHandlers } from './extension-command-handler';
import { ExtensionCommand, ExtensionOriginEvent } from './extension-origin-event';
import { ExtensionState } from './extension-state';

export function getExtensions(): Extension[] {
    return [
        {
            id: '123',
            name: 'Foo',
            region: ExtensionRegion.ShippingShippingAddressFormBefore,
            url: 'https://widget.foo.com/',
        },
        {
            id: '456',
            name: 'Bar',
            region: ExtensionRegion.ShippingShippingAddressFormAfter,
            url: 'https://widget.bar.com/',
        },
    ];
}

export function getExtensionState(): ExtensionState {
    return {
        data: getExtensions(),
        errors: {},
        statuses: {},
    };
}

export function getExtensionCommandHandlers(): ExtensionCommandHandlers {
    return {
        [ExtensionCommand.ReloadCheckout]: jest.fn(),
        [ExtensionCommand.ShowLoadingIndicator]: jest.fn(),
        [ExtensionCommand.SetIframeStyle]: jest.fn(),
    };
}

export function getExtensionMessageEvent(): {
    origin: string;
    data: ExtensionOriginEvent;
} {
    return {
        origin: 'https://widget.foo.com',
        data: {
            type: ExtensionCommand.ReloadCheckout,
            payload: {
                extensionId: '123',
            },
        },
    };
}
