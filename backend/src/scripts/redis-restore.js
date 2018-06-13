// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const redis = require('../redis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function importLine (line) {
  const result = JSON.parse(line.toString());

  if (result.key.type !== 'Buffer' || !result.key.data) {
    console.error(new Error(`Wrong key type ${result}`));
    redis.client.end(true);
    process.exit(1);
  }

  if (result.data.type !== 'Buffer' || !result.data.data) {
    console.error(new Error(`Wrong data type ${result}`));
    redis.client.end(true);
    process.exit(1);
  }

  const key = Buffer.from(result.key.data);
  const data = Buffer.from(result.data.data);

  const now = Date.now();
  const ttl = result.expires
    ? Math.round((result.expires - now) / 1000)
    : null;

  if (ttl !== null && ttl <= 0) {
    console.log('expired');
    return;
  }

  await redis.restore(key, ttl || 0, data);
}

async function main () {
  const filearg = process.argv[2];

  if (!filearg) {
    throw new Error('Please provide the path of the backed-up file.');
  }

  const filepath = path.resolve(filearg);

  if (!fs.existsSync(filepath)) {
    throw new Error(`File ${filepath} could not be found.`);
  }

  return new Promise((resolve, reject) => {
    const filestream = fs.createReadStream(filepath);

    const lineReader = readline.createInterface({
      input: filestream
    });

    lineReader.on('line', async (line) => {
      try {
        importLine(line);
      } catch (error) {
        reject(error);
      }
    });

    filestream.on('close', () => {
      setTimeout(() => {
        resolve();
      });
    });
  });
}

main()
  .then(() => {
    redis.client.end(true);
  })
  .catch((error) => {
    console.error(error);
    redis.client.end(true);
    process.exit(1);
  });
