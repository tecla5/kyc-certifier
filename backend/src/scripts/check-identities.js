// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const path = require('path');
const { uniq } = require('lodash');

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../../../config');

const store = require('../store');
const Onfido = require('../onfido');
const Identity = require('../identity');
const { isValidAddress } = require('../utils');

const documentMap = {};

const config = require('config');

const Certifier = require('../contracts/certifier');
const { RpcTransport } = require('../api/transport');
const ParityConnector = require('../api/parity');

const transport = new RpcTransport(config.get('nodeWs'));
const connector = new ParityConnector(transport);

const certifier = new Certifier(connector, config.get('certifierContract'));

async function addDocuments (identity) {
  const checks = await identity.checks.getAll();

  for (const check of checks) {
    const { documentHash } = check;

    if (!documentHash) {
      continue;
    }

    if (!documentMap[documentHash]) {
      documentMap[documentHash] = [];
    }

    documentMap[documentHash] = uniq([].concat(documentMap[documentHash], identity.address));
  }
}

async function push (verification, href) {
  const { address } = verification;
  const hasPendingTransaction = await store.hasPendingTransaction(address);

  if (hasPendingTransaction) {
    const txHash = await store.getPendingTransaction(address);
    const receipt = await connector.getTxReceipt(txHash);

    if (!receipt) {
      console.warn(`> Transaction ${txHash} is not to be found. Deleting it.`);
      await store.removePendingTransaction(address);
    } else {
      console.warn(`> Pending transaction:`, receipt);
    }
  } else {
    console.warn(`> No pending transaction for ${address}`);
  }

  store.push(href);
}

const dryRun = process.argv.find((arg) => arg === '-d' || arg === '--dry-run');
const argAddress = process.argv.find((arg) => isValidAddress(arg));

if (dryRun) {
  console.warn('Running in dry-run mode!');
}

async function checkIdentity (identity) {
  const check = await identity.getData();
  const { result, reason, status } = check;

  const selfUsedDocument = check.documentHash &&
    documentMap[check.documentHash] &&
    documentMap[check.documentHash].length === 1 &&
    documentMap[check.documentHash][0].toLowerCase() === identity.address.toLowerCase();

  const shouldCheck = (status === 'pending') ||
    // The identity should have been certified but isn't
    (status === 'completed' && result === 'success' && !(await certifier.isCertified(identity.address))) ||
    // The identity has been flagged with a used document, but shouldn't have been (and is not certified)
    (status === 'completed' && reason === 'used-document' && selfUsedDocument && !(await certifier.isCertified(identity.address)));

  if (shouldCheck) {
    const applicants = await identity.applicants.getAll();
    const applicant = applicants.find((a) => a.checkId === check.id);
    const href = `https://api.onfido.com/v2/applicants/${applicant.id}/checks/${check.id}`;
    const verification = await Onfido.verify(href);
    const { address } = verification;

    // Verification still pending. Skip.
    if (verification.pending) {
      return;
    }

    if (!verification.documentHash) {
      return console.warn(`\n> ${address} : no document hash`, verification);
    }

    if (verification.reason === 'used-document') {
      const sameDocIds = documentMap[verification.documentHash];

      if (!sameDocIds || (sameDocIds.length === 1 && sameDocIds[0].toLowerCase() === address.toLowerCase())) {
        console.warn(`\n> ${address} should not be set as used document. Removing it.`);

        if (!dryRun) {
          store.markDocumentAsUnused(verification.documentHash);
          await push(verification, href);
        }
      }

      return;
    }

    if (verification.valid) {
      console.warn(`\n> ${address} should be tested again. Pushing it.`);

      if (!dryRun) {
        await push(verification, href);
      }
    }
  }
}

async function mainSingle (address) {
  try {
    await store.scanIdentities(async (identity) => {
      await addDocuments(identity);
    });

    const identity = new Identity(address);

    await checkIdentity(identity);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  console.warn('\nDone');
  process.exit(0);
}

async function main () {
  let count = 0;
  let total = 0;

  try {
    await store.scanIdentities(async (identity) => {
      total++;
      await addDocuments(identity);
    });

    await store.scanIdentities(async (identity) => {
      count++;
      await checkIdentity(identity);
      process.stderr.write(`\r${Math.round(10000 * count / total) / 100} %           `);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  console.warn('\nDone');
  process.exit(0);
}

argAddress ? mainSingle(argAddress) : main();
