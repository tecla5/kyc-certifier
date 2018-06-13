// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const redis = require('../redis');
const store = require('../store');
const { isValidAddress } = require('../utils');

const arg = process.argv[2];

if (!isValidAddress(arg)) {
  console.error('Usage: node recover.js <ETHEREUM_ADDRESS>');
  process.exit(1);
}

async function main () {
  const result = await store.getPhrase(arg);

  console.log(result || 'No recovery phrase has been found.');
}

main()
  .then(() => {
    redis.client.end(true);
  })
  .catch((error) => {
    redis.client.end(true);
    console.error(error);
    process.exit(1);
  });
