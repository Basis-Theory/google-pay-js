# Basis Theory Google Pay JS

![Version](https://img.shields.io/npm/v/%40basis-theory/google-pay-js) ![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/Basis-Theory/google-pay-js/release.yml) ![License](https://img.shields.io/npm/l/%40basis-theory%2Fgoogle-pay-js)

Utility library for decrypting Google Payment Tokens in Node.js environments.

## Features

- **Google Pay [PaymentMethodToken](https://developers.google.com/pay/api/web/guides/resources/payment-data-cryptography#payment-method-token-structure) Decryption**: Securely decrypt user-authorized Google Pay transaction tokens using easy-to-use interfaces.
- Key Rotation: Never worry about missing payments because of key rotation unpredictable behavior. Just add multiple keys to the decryption context and rest assured that both new and old tokens will be decrypted during rotation window.

> This package only supports Google Pay `ECv2` protocol.

## Google Pay Setup

[Follow Google Pay API guides](https://developers.google.com/pay/api) for your platform of choosing (Web or Android). In order to use this library, you need to be PCI Level 1 certified and chose tokenization type `DIRECT`.

> ⚠️ If you are not PCI Level 1 certified, [reach out to us](https://basistheory.com/contact) to learn how to use `PAYMENT_GATEWAY` tokenization type.

## Installation

Install the package using NPM:

```shell
npm install @basis-theory/google-pay-js --save
```

Or Yarn:

```shell
yarn add @basis-theory/google-pay-js
```

## Node.js

The examples below show how to load private keys from the File System into Buffers, using samples from this repository. But you can load them from your KMS, secret manager, configuration, etc.

```javascript
import { GooglePaymentTokenContext } from '@basis-theory/google-pay-js';
import fs from 'fs';
import token from './test/fixtures/ec/token.new.json';

// create the decryption context
const context = new GooglePaymentTokenContext({
  // add as many merchant certificates you need
  merchants: [
    {
      // optional certificate identifier
      identifier: 'my-merchant-identifier',
      // the private key is in PEM format
      privateKeyPem: fs.readFileSync('./test/fixtures/key.new.pem'),
    },
    {
      identifier: 'my-merchant-identifier',
      // the private key is in PEM format
      privateKeyPem: fs.readFileSync('./test/fixtures/key.old.pem'),
    },
  ],
});

try {
  // the paymentData you get back from loadPaymentData Promise/event
  const token = JSON.parse(
    paymentData.paymentMethodData.tokenizationData.token
  );
  // decrypts Google's PaymentMethodToken
  console.log(context.decrypt(token));
} catch (error) {
  // couldn't decrypt the token with given merchant keys
}
```

## Reactors

This package is available to use in [Reactors](https://developers.basistheory.com/docs/concepts/what-are-reactors) context. The example below shows how to decrypt Google Pay tokens and vault the PAN compliantly.

```javascript
const { Buffer } = require('buffer');
const { GooglePaymentTokenContext } = require('@basis-theory/google-pay-js');
const {
  CustomHttpResponseError,
} = require('@basis-theory/basis-theory-reactor-formulas-sdk-js');

module.exports = async function (req) {
  const {
    bt,
    args: {
      // invoke the reactor passing the paymentData you get back from loadPaymentData Promise/event
      paymentData: {
        paymentMethodData: {
          tokenizationData: { token: tokenString, ...tokenizationData },
          ...paymentMethodData
        },
        ...paymentData
      },
    },
    configuration: { PRIMARY_PRIVATE_KEY_PEM, SECONDARY_PRIVATE_KEY_PEM },
  } = req;

  // creates token context from keys configured in Reactor
  const context = new GooglePaymentTokenContext({
    merchants: [
      {
        privateKeyPem: Buffer.from(PRIMARY_PRIVATE_KEY_PEM),
      },
      {
        privateKeyPem: Buffer.from(SECONDARY_PRIVATE_KEY_PEM),
      },
    ],
  });

  try {
    const token = JSON.parse(tokenString);
    // decrypts Google's PaymentMethodToken
    const {
      paymentMethodDetails: { pan, expirationMonth, expirationYear },
    } = context.decrypt(token);

    // vaults PAN
    const btToken = await bt.tokens.create({
      type: 'card',
      data: {
        number: pan,
        expiration_month: String(expirationMonth).padStart(2, '0'),
        expiration_year: String(expirationYear),
      },
    });

    // returns original details and vaulted token without sensitive PAN
    return {
      raw: {
        btToken,
        paymentData: {
          paymentMethodData: {
            tokenizationData,
            ...paymentMethodData,
          },
          ...paymentData,
        },
      },
    };
  } catch (error) {
    throw new CustomHttpResponseError({
      status: 500,
      body: {
        message: error.message,
      },
    });
  }
};
```
