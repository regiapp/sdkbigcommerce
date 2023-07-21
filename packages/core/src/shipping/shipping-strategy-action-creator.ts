import { createAction, createErrorAction, ThunkAction } from '@bigcommerce/data-store';
import { Observable, Observer } from 'rxjs';

import { ShippingStrategy as ShippingStrategyV2 } from '@bigcommerce/checkout-sdk/payment-integration-api';

import { AddressRequestBody } from '../address';
import { InternalCheckoutSelectors } from '../checkout';
import { Registry } from '../common/registry';

import { ShippingInitializeOptions, ShippingRequestOptions } from './shipping-request-options';
import {
    ShippingStrategyAction,
    ShippingStrategyActionType,
    ShippingStrategyDeinitializeAction,
    ShippingStrategyInitializeAction,
    ShippingStrategySelectOptionAction,
    ShippingStrategyUpdateAddressAction,
} from './shipping-strategy-actions';
import ShippingStrategyRegistryV2 from './shipping-strategy-registry-v2';
import { ShippingStrategy } from './strategies';

export default class ShippingStrategyActionCreator {
    constructor(
        private _strategyRegistry: Registry<ShippingStrategy>,
        private _strategyRegistryV2: ShippingStrategyRegistryV2,
    ) {}

    updateAddress(
        address: Partial<AddressRequestBody>,
        options?: ShippingRequestOptions,
    ): ThunkAction<ShippingStrategyUpdateAddressAction, InternalCheckoutSelectors> {
        return (store) =>
            Observable.create((observer: Observer<ShippingStrategyUpdateAddressAction>) => {
                const payment = store.getState().payment.getPaymentId();
                const methodId = (options && options.methodId) || (payment && payment.providerId);

                observer.next(
                    createAction(ShippingStrategyActionType.UpdateAddressRequested, undefined, {
                        methodId,
                    }),
                );

                const promise: Promise<InternalCheckoutSelectors | void> = this._getStrategy(
                    methodId,
                ).updateAddress(address, { ...options, methodId });

                promise
                    .then(() => {
                        observer.next(
                            createAction(
                                ShippingStrategyActionType.UpdateAddressSucceeded,
                                undefined,
                                { methodId },
                            ),
                        );
                        observer.complete();
                    })
                    .catch((error) => {
                        observer.error(
                            createErrorAction(
                                ShippingStrategyActionType.UpdateAddressFailed,
                                error,
                                { methodId },
                            ),
                        );
                    });
            });
    }

    selectOption(
        shippingOptionId: string,
        options?: ShippingRequestOptions,
    ): ThunkAction<ShippingStrategySelectOptionAction, InternalCheckoutSelectors> {
        return (store) =>
            Observable.create((observer: Observer<ShippingStrategySelectOptionAction>) => {
                const payment = store.getState().payment.getPaymentId();
                const methodId = (options && options.methodId) || (payment && payment.providerId);

                observer.next(
                    createAction(ShippingStrategyActionType.SelectOptionRequested, undefined, {
                        methodId,
                    }),
                );

                const promise: Promise<InternalCheckoutSelectors | void> = this._getStrategy(
                    methodId,
                ).selectOption(shippingOptionId, { ...options, methodId });

                promise
                    .then(() => {
                        observer.next(
                            createAction(
                                ShippingStrategyActionType.SelectOptionSucceeded,
                                undefined,
                                { methodId },
                            ),
                        );
                        observer.complete();
                    })
                    .catch((error) => {
                        observer.error(
                            createErrorAction(
                                ShippingStrategyActionType.SelectOptionFailed,
                                error,
                                { methodId },
                            ),
                        );
                    });
            });
    }

    initialize(
        options?: ShippingInitializeOptions,
    ): ThunkAction<ShippingStrategyInitializeAction, InternalCheckoutSelectors> {
        return (store) =>
            Observable.create((observer: Observer<ShippingStrategyInitializeAction>) => {
                const state = store.getState();
                const payment = state.payment.getPaymentId();
                const methodId = (options && options.methodId) || (payment && payment.providerId);
                const mergedOptions = { ...options, methodId };

                if (methodId && state.shippingStrategies.isInitialized(methodId)) {
                    return observer.complete();
                }

                observer.next(
                    createAction(ShippingStrategyActionType.InitializeRequested, undefined, {
                        methodId,
                    }),
                );

                const promise: Promise<InternalCheckoutSelectors | void> =
                    this._getStrategy(methodId).initialize(mergedOptions);

                promise
                    .then(() => {
                        observer.next(
                            createAction(
                                ShippingStrategyActionType.InitializeSucceeded,
                                undefined,
                                { methodId },
                            ),
                        );
                        observer.complete();
                    })
                    .catch((error) => {
                        observer.error(
                            createErrorAction(ShippingStrategyActionType.InitializeFailed, error, {
                                methodId,
                            }),
                        );
                    });
            });
    }

    deinitialize(
        options?: ShippingRequestOptions,
    ): ThunkAction<ShippingStrategyDeinitializeAction, InternalCheckoutSelectors> {
        return (store) =>
            Observable.create((observer: Observer<ShippingStrategyDeinitializeAction>) => {
                const state = store.getState();
                const payment = state.payment.getPaymentId();
                const methodId = (options && options.methodId) || (payment && payment.providerId);

                if (methodId && !state.shippingStrategies.isInitialized(methodId)) {
                    return observer.complete();
                }

                observer.next(
                    createAction(ShippingStrategyActionType.DeinitializeRequested, undefined, {
                        methodId,
                    }),
                );

                const promise: Promise<InternalCheckoutSelectors | void> = this._getStrategy(
                    methodId,
                ).deinitialize({ ...options, methodId });

                promise
                    .then(() => {
                        observer.next(
                            createAction(
                                ShippingStrategyActionType.DeinitializeSucceeded,
                                undefined,
                                { methodId },
                            ),
                        );
                        observer.complete();
                    })
                    .catch((error) => {
                        observer.error(
                            createErrorAction(
                                ShippingStrategyActionType.DeinitializeFailed,
                                error,
                                { methodId },
                            ),
                        );
                    });
            });
    }

    widgetInteraction(
        method: () => Promise<any>,
        options?: ShippingRequestOptions,
    ): Observable<ShippingStrategyAction> {
        return Observable.create((observer: Observer<ShippingStrategyAction>) => {
            const methodId = options && options.methodId;
            const meta = { methodId };

            observer.next(
                createAction(ShippingStrategyActionType.WidgetInteractionStarted, undefined, meta),
            );

            method()
                .then(() => {
                    observer.next(
                        createAction(
                            ShippingStrategyActionType.WidgetInteractionFinished,
                            undefined,
                            meta,
                        ),
                    );
                    observer.complete();
                })
                .catch((error) => {
                    observer.error(
                        createErrorAction(
                            ShippingStrategyActionType.WidgetInteractionFailed,
                            error,
                            meta,
                        ),
                    );
                });
        });
    }

    private _getStrategy(methodId?: string): ShippingStrategy | ShippingStrategyV2 {
        let strategy: ShippingStrategy | ShippingStrategyV2;

        try {
            strategy = this._strategyRegistryV2.get({ id: methodId || '' });
        } catch {
            strategy = this._strategyRegistry.get(methodId);
        }

        return strategy;
    }
}
