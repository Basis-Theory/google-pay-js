export class GooglePaymentDecryptionError extends Error {
  public constructor(message: string, public readonly errors?: Error[]) {
    super(message);
    this.name = 'GooglePaymentDecryptionError';
  }
}
