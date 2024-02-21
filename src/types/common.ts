interface PaymentMethodToken {
  protocolVersion: 'ECv2';
  signature: string;
  intermediateSigningKey: {
    signedKey: string;
    signatures: string[];
  };
  signedMessage: string;
}

interface SignedKey {
  keyValue: string;
  keyExpiration: string;
}

interface SignedMessage {
  encryptedMessage: string;
  ephemeralPublicKey: string;
  tag: string;
}

type PaymentMethodDetails = {
  pan: string;
  expirationMonth: number;
  expirationYear: number;
} & (
  | {
      authMethod: 'PAN_ONLY';
    }
  | {
      authMethod: 'CRYPTOGRAM_3DS';
      cryptogram: string;
      eciIndicator: string;
    }
);

interface DecryptedMessage {
  messageExpiration: string;
  messageId: string;
  paymentMethod: 'CARD';
  paymentMethodDetails: PaymentMethodDetails;
}

export type { PaymentMethodToken, DecryptedMessage, SignedKey, SignedMessage };
