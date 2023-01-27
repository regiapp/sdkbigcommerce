export interface BlueSnapDirectSdk {
    hostedPaymentFieldsCreate(options: unknown): void;
    hostedPaymentFieldsSubmitData(callback: (data: unknown) => void): void;
}
