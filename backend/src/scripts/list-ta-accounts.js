// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');

const redis = require('../redis');
const { CachingTransport } = require('../api/transport');
const ParityConnector = require('../api/parity');

async function main () {
  const transport = new CachingTransport(config.get('nodeWs'));
  const connector = new ParityConnector(transport);

  const addresses = await redis.hkeys('picops::ta-accounts-phrases');

  for (const address of addresses) {
    const balance = await connector.balance(address);

    console.log(`- ${address} : ${balance.div(Math.pow(10, 18)).toFormat()} ETH`);
  }
}

main()
  .then(() => {
    redis.client.end(true);
    process.exit(0);
  })
  .catch((error) => {
    redis.client.end(true);
    console.error(error);
    process.exit(1);
  });
