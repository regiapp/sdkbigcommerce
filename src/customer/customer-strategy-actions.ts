import { Action } from '@bigcommerce/data-store';

export enum CustomerStrategyActionType {
    SignInFailed = 'CUSTOMER_STRATEGY_SIGN_IN_FAILED',
    SignInRequested = 'CUSTOMER_STRATEGY_SIGN_IN_REQUESTED',
    SignInSucceeded = 'CUSTOMER_STRATEGY_SIGN_IN_SUCCEEDED',
    SignOutFailed = 'CUSTOMER_STRATEGY_SIGN_OUT_FAILED',
    SignOutRequested = 'CUSTOMER_STRATEGY_SIGN_OUT_REQUESTED',
    SignOutSucceeded = 'CUSTOMER_STRATEGY_SIGN_OUT_SUCCEEDED',
    SignUpFailed = 'CUSTOMER_STRATEGY_SIGN_UP_FAILED',
    SignUpRequested = 'CUSTOMER_STRATEGY_SIGN_UP_REQUESTED',
    SignUpSucceeded = 'CUSTOMER_STRATEGY_SIGN_UP_SUCCEEDED',
    ContinueAsGuestFailed = 'CUSTOMER_STRATEGY_CONTINUE_AS_GUEST_FAILED',
    ContinueAsGuestRequested = 'CUSTOMER_STRATEGY_CONTINUE_AS_GUEST_REQUESTED',
    ContinueAsGuestSucceeded = 'CUSTOMER_STRATEGY_CONTINUE_AS_GUEST_SUCCEEDED',
    InitializeFailed = 'CUSTOMER_STRATEGY_INITIALIZE_FAILED',
    InitializeRequested = 'CUSTOMER_STRATEGY_INITIALIZE_REQUESTED',
    InitializeSucceeded = 'CUSTOMER_STRATEGY_INITIALIZE_SUCCEEDED',
    DeinitializeFailed = 'CUSTOMER_STRATEGY_DEINITIALIZE_FAILED',
    DeinitializeRequested = 'CUSTOMER_STRATEGY_DEINITIALIZE_REQUESTED',
    DeinitializeSucceeded = 'CUSTOMER_STRATEGY_DEINITIALIZE_SUCCEEDED',
    WidgetInteractionStarted = 'CUSTOMER_STRATEGY_WIDGET_INTERACTION_STARTED',
    WidgetInteractionFinished = 'CUSTOMER_STRATEGY_WIDGET_INTERACTION_FINISHED',
    WidgetInteractionFailed = 'CUSTOMER_STRATEGY_WIDGET_INTERACTION_FAILED',
}

export type CustomerStrategyAction =
    CustomerStrategySignInAction |
    CustomerStrategySignOutAction |
    CustomerStrategySignUpAction |
    CustomerStrategyContinueAsGuestAction |
    CustomerStrategyInitializeAction |
    CustomerStrategyDeinitializeAction |
    CustomerStrategyWidgetAction;

export type CustomerStrategySignInAction =
    SignInRequestedAction |
    SignInSucceededAction |
    SignInFailedAction;

export type CustomerStrategySignOutAction =
    SignOutRequestedAction |
    SignOutSucceededAction |
    SignOutFailedAction;

export type CustomerStrategySignUpAction =
    SignUpRequestedAction |
    SignUpSucceededAction |
    SignUpFailedAction;

export type CustomerStrategyContinueAsGuestAction =
    ContinueAsGuestRequestedAction |
    ContinueAsGuestSucceededAction |
    ContinueAsGuestFailedAction;

export type CustomerStrategyInitializeAction =
    InitializeRequestedAction |
    InitializeSucceededAction |
    InitializeFailedAction;

export type CustomerStrategyDeinitializeAction =
    DeinitializeRequestedAction |
    DeinitializeSucceededAction |
    DeinitializeFailedAction;

export type CustomerStrategyWidgetAction =
    WidgetInteractionStartedAction |
    WidgetInteractionFinishedAction |
    WidgetInteractionFailedAction;

export interface SignInRequestedAction extends Action {
    type: CustomerStrategyActionType.SignInRequested;
}

export interface SignInSucceededAction extends Action {
    type: CustomerStrategyActionType.SignInSucceeded;
}

export interface SignInFailedAction extends Action<Error> {
    type: CustomerStrategyActionType.SignInFailed;
}

export interface SignOutRequestedAction extends Action {
    type: CustomerStrategyActionType.SignOutRequested;
}

export interface SignOutSucceededAction extends Action {
    type: CustomerStrategyActionType.SignOutSucceeded;
}

export interface SignOutFailedAction extends Action<Error> {
    type: CustomerStrategyActionType.SignOutFailed;
}

export interface SignUpRequestedAction extends Action {
    type: CustomerStrategyActionType.SignUpRequested;
}

export interface SignUpSucceededAction extends Action {
    type: CustomerStrategyActionType.SignUpSucceeded;
}

export interface SignUpFailedAction extends Action<Error> {
    type: CustomerStrategyActionType.SignUpFailed;
}

export interface ContinueAsGuestRequestedAction extends Action {
    type: CustomerStrategyActionType.ContinueAsGuestRequested;
}

export interface ContinueAsGuestSucceededAction extends Action {
    type: CustomerStrategyActionType.ContinueAsGuestSucceeded;
}

export interface ContinueAsGuestFailedAction extends Action<Error> {
    type: CustomerStrategyActionType.ContinueAsGuestFailed;
}

export interface InitializeRequestedAction extends Action {
    type: CustomerStrategyActionType.InitializeRequested;
}

export interface InitializeSucceededAction extends Action {
    type: CustomerStrategyActionType.InitializeSucceeded;
}

export interface InitializeFailedAction extends Action<Error> {
    type: CustomerStrategyActionType.InitializeFailed;
}

export interface DeinitializeRequestedAction extends Action {
    type: CustomerStrategyActionType.DeinitializeRequested;
}

export interface DeinitializeSucceededAction extends Action {
    type: CustomerStrategyActionType.DeinitializeSucceeded;
}

export interface DeinitializeFailedAction extends Action<Error> {
    type: CustomerStrategyActionType.DeinitializeFailed;
}

export interface WidgetInteractionStartedAction extends Action {
    type: CustomerStrategyActionType.WidgetInteractionStarted;
}

export interface WidgetInteractionFinishedAction extends Action {
    type: CustomerStrategyActionType.WidgetInteractionFinished;
}

export interface WidgetInteractionFailedAction extends Action<Error> {
    type: CustomerStrategyActionType.WidgetInteractionFailed;
}
