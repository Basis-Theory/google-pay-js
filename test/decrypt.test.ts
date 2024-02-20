import * as fs from 'fs';
import { GooglePaymentMethodTokenContext } from '../src';
import { PaymentMethodToken } from '../src/types';
import newToken from './fixtures/token.new.json';
import oldToken from './fixtures/token.old.json';

const newKey = fs.readFileSync('test/fixtures/key.new.pem');
const oldKey = fs.readFileSync('test/fixtures/key.old.pem');

describe('decrypt', () => {
  let newContext: GooglePaymentMethodTokenContext;
  let oldContext: GooglePaymentMethodTokenContext;
  let fullContext: GooglePaymentMethodTokenContext;

  beforeEach(() => {
    oldContext = new GooglePaymentMethodTokenContext({
      merchants: [
        {
          privateKeyPem: oldKey,
        },
      ],
    });
    newContext = new GooglePaymentMethodTokenContext({
      merchants: [
        {
          privateKeyPem: newKey,
        },
      ],
    });
    fullContext = new GooglePaymentMethodTokenContext({
      merchants: [
        {
          privateKeyPem: oldKey,
        },
        {
          privateKeyPem: newKey,
        },
      ],
    });
  });

  test('should throw when no merchant configuration is provided', () => {
    expect(
      () => new GooglePaymentMethodTokenContext({ merchants: [] })
    ).toThrow('No merchant configuration provided for decryption context.');
  });

  test('should throw when using old key', () => {
    expect(() => oldContext.decrypt(newToken as PaymentMethodToken)).toThrow(
      'Failed to decrypt payment data using provided merchant configuration(s).'
    );
  });

  test('should decrypt using new key', () => {
    expect(
      newContext.decrypt(newToken as PaymentMethodToken)
    ).toMatchSnapshot();
  });

  test('should support key rotation', () => {
    expect(
      fullContext.decrypt(oldToken as PaymentMethodToken)
    ).toMatchSnapshot();
    expect(
      fullContext.decrypt(newToken as PaymentMethodToken)
    ).toMatchSnapshot();
  });
});
