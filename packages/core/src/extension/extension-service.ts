import { noop } from 'lodash';

import { IframeEventListener, IframeEventPoster } from '../common/iframe';

import {
    ExtensionCommandType,
    ExtensionListenEventMap,
    ExtensionListenEventType,
    ExtensionPostCommand,
} from './extension-client';

export default class ExtensionService {
    private _extensionId?: string;

    constructor(
        private _eventListener: IframeEventListener<ExtensionListenEventMap>,
        private _eventPoster: IframeEventPoster<ExtensionPostCommand>,
    ) {
        this._eventPoster.setTarget(window.parent);
    }

    initialize(extensionId: string): void {
        if (!extensionId) {
            throw new Error('Extension Id not found.');
        }

        this._extensionId = extensionId;

        this._eventListener.listen();
    }

    post(event: ExtensionPostCommand): void {
        if (!this._extensionId) {
            return;
        }

        if (!Object.values(ExtensionCommandType).includes(event.type)) {
            throw new Error(`${event.type} is not supported.`);
        }

        const payload = {
            ...event.payload,
            extensionId: this._extensionId,
        };

        this._eventPoster.post({ ...event, payload });
    }

    addListener(eventType: ExtensionListenEventType, callback: () => void = noop): () => void {
        if (!Object.values(ExtensionListenEventType).includes(eventType)) {
            throw new Error(`${eventType} is not supported.`);
        }

        this._eventListener.addListener(eventType, callback);

        return () => this._eventListener.removeListener(eventType, callback);
    }
}
