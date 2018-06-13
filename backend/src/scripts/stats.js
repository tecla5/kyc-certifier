// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const path = require('path');

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../../../config');

const redis = require('../redis');
const store = require('../store');
const Onfido = require('../onfido');

async function main () {
  let countIdentities = 0;

  await store.scanIdentities(async (identity) => {
    countIdentities++;
  });

  console.warn(`> found ${countIdentities} identities in DB`);

  const sApplicantsCount = await store.countApplicants();

  console.warn(`> found ${sApplicantsCount} applicants in DB`);

  const oApplicantsCount = await Onfido.getApplicantsCount();

  console.warn(`> found ${oApplicantsCount} applicants on Onfido`);
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
