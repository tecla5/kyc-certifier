// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

process.env.REDIS_BUFFERS = true;

const redis = require('../redis');

async function main () {
  let next = 0;
  let size = 0;

  do {
    const [ cursor, keys ] = await redis.scan(next);

    next = Number(cursor);
    size += keys.length;
  } while (next !== 0);

  let progress = 0;

  do {
    const [ cursor, keys ] = await redis.scan(next);

    next = Number(cursor);

    for (const key of keys) {
      if (!/picops/i.test(key)) {
        continue;
      }

      const data = await redis.dump(key);
      const result = { key, data };
      const pttl = await redis.pttl(key);

      if (pttl > 0) {
        result.expires = Date.now() + pttl;
      }

      console.log(JSON.stringify(result));
    }

    progress += keys.length;
    process.stderr.write(`\r  progress: ${Math.round(progress / size * 10000) / 100}%     `);
  } while (next !== 0);

  console.warn('');
  redis.client.end(true);
}

main().catch((error) => {
  console.error(error);
  redis.client.end(true);
  process.exit(1);
});
