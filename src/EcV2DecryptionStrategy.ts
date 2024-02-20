import crypto from 'crypto';
import { parsePem } from 'eckey-utils';
import type { DecryptedMessage, SignedMessage } from './types';

export class EcV2DecryptionStrategy {
  // There is no type definitions for eckey-utils
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly privateKey: any;

  public constructor(privateKeyPem: Buffer) {
    this.privateKey = parsePem(privateKeyPem.toString()).privateKey;
  }

  public decrypt(signedMessage: string): DecryptedMessage {
    const { ephemeralPublicKey, encryptedMessage, tag } = JSON.parse(
      signedMessage
    ) as SignedMessage;

    const sharedKey = this.getSharedKey(ephemeralPublicKey);
    const derivedKey = this.getDerivedKey(ephemeralPublicKey, sharedKey);

    const symmetricEncryptionKey = derivedKey.slice(0, 64);
    const macKey = derivedKey.slice(64);

    this.verifyMessageHmac(macKey, tag, encryptedMessage);

    const decryptedMessage = this.decryptMessage(
      encryptedMessage,
      symmetricEncryptionKey
    );

    return JSON.parse(decryptedMessage);
  }

  private getSharedKey(ephemeralPublicKey: string): string {
    /**
     *  Use the private key and the given ephemeralPublicKey to
     *  derive a 512-bit long shared key that uses ECIES-KEM.
     */
    const sharedKey = crypto.createECDH('prime256v1');

    sharedKey.setPrivateKey(this.privateKey);

    return sharedKey.computeSecret(ephemeralPublicKey, 'base64', 'hex');
  }

  private getDerivedKey(ephemeralPublicKey: string, sharedKey: string): string {
    return Buffer.from(
      crypto.hkdfSync(
        'sha256',
        Buffer.concat([
          Buffer.from(ephemeralPublicKey, 'base64'),
          Buffer.from(sharedKey, 'hex'),
        ]),
        Buffer.alloc(32),
        Buffer.from('Google', 'utf-8'),
        64
      )
    ).toString('hex');
  }

  private verifyMessageHmac(
    macKey: string,
    tag: string,
    encryptedMessage: string
  ): void {
    const hmac = crypto.createHmac('sha256', Buffer.from(macKey, 'hex'));

    hmac.update(Buffer.from(encryptedMessage, 'base64'));

    const calculatedTag = hmac.digest().toString('base64');

    if (calculatedTag !== tag) {
      throw new Error('Tag is not a valid MAC for the encrypted message');
    }
  }

  private decryptMessage(
    encryptedMessage: string,
    symmetricEncryptionKey: string
  ): string {
    const decipher = crypto.createCipheriv(
      'aes-256-ctr',
      Buffer.from(symmetricEncryptionKey, 'hex'),
      Buffer.alloc(16)
    );

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedMessage, 'base64')),
      decipher.final(),
    ]).toString('utf-8');
  }
}
