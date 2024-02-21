import { EcV2DecryptionStrategy } from './EcV2DecryptionStrategy';
import { GooglePaymentDecryptionError } from './GooglePaymentDecryptionError';
import type { DecryptedMessage, PaymentMethodToken } from './types';

interface GooglePayMerchantConfiguration {
  /**
   * (Optional) Merchant identifier, used for tracking errors.
   */
  identifier?: string;
  /**
   * Merchant private encryption key uploaded to Google Pay and Wallet Console
   */
  privateKeyPem: Buffer;
}
interface GooglePaymentMethodTokenContextOptions {
  merchants: GooglePayMerchantConfiguration[];
}

export class GooglePaymentMethodTokenContext {
  public constructor(
    private readonly options: GooglePaymentMethodTokenContextOptions
  ) {
    if (!options.merchants.length) {
      throw new GooglePaymentDecryptionError(
        'No merchant configuration provided for decryption context.'
      );
    }
  }

  public decrypt(token: PaymentMethodToken): DecryptedMessage {
    const errors = [];

    if (token.protocolVersion !== 'ECv2') {
      throw new Error(
        `Unsupported decryption for protocol version ${token.protocolVersion}`
      );
    }

    for (const merchant of this.options.merchants) {
      try {
        const strategy = new EcV2DecryptionStrategy(merchant.privateKeyPem);

        return strategy.decrypt(token.signedMessage);
      } catch (error) {
        error.merchantIdentifier = merchant.identifier;
        errors.push(error);
      }
    }

    throw new GooglePaymentDecryptionError(
      'Failed to decrypt payment data using provided merchant configuration(s).',
      errors
    );
  }
}
