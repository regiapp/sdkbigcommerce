import { ScriptLoader } from '@bigcommerce/script-loader';

import assertBlueSnapDirectWindow from './is-bluesnap-direct-window';
import { BlueSnapDirectSdk } from './types';

export enum BlueSnapDirectSdkEnv {
    PRODUCTION = 'https://pay.bluesnap.com/web-sdk/5/bluesnap.js',
    SANDBOX = 'https://sandpay.bluesnap.com/web-sdk/5/bluesnap.js',
}

export default class BlueSnapDirectScriptLoader {
    constructor(private _scriptLoader: ScriptLoader) {}

    async load(testMode = false): Promise<BlueSnapDirectSdk> {
        await this._scriptLoader.loadScript(
            testMode ? BlueSnapDirectSdkEnv.SANDBOX : BlueSnapDirectSdkEnv.PRODUCTION,
        );

        assertBlueSnapDirectWindow(window);

        return window.bluesnap;
    }
}
