// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const path = require('path');

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../../../config');

const fetch = require('node-fetch');
const config = require('config');
const Mailjet = require('node-mailjet');
const os = require('os');
const fs = require('fs');

const { RpcTransport } = require('../api/transport');
const ParityConnector = require('../api/parity');

const transport = new RpcTransport(config.get('nodeWs'));
const connector = new ParityConnector(transport);
const mailjet = Mailjet.connect(config.get('mailjet.key'), config.get('mailjet.secret'));

const emails = config.get('alert.emails');

const BASE_API = config.get('etherscan').replace('://etherscan.io', '://api.etherscan.io');

async function getBlockNumber () {
  const request = await fetch(`${BASE_API}/api?module=proxy&action=eth_blockNumber`);
  const { result } = await request.json();

  return parseInt(result, 16);
}

// async function getBlock (blockNumber) {
//   const request = await fetch(`${BASE_API}/api?module=proxy&action=eth_getBlockByNumber&tag=${blockNumber}&boolean=false`);
//   const { result } = await request.json();

//   return result;
// }

async function main () {
  const block = await connector.getBlock('latest');
  const blockDate = new Date(parseInt(block.timestamp) * 1000);
  const blockNumber = parseInt(block.number, 16);

  // If latest block is older than 2 minutes ago
  if (Date.now() - blockDate > 2 * 60 * 1000) {
    throw new Error(`Latest block is old: ${blockDate}`);
  }

  const etherscanBlockNumber = await getBlockNumber();

  // Local node is ahead of time
  if (blockNumber > etherscanBlockNumber) {
    return;
  }

  // Block shouldn't be more than 5 blocks away from latest Etherscan one
  if (blockNumber < etherscanBlockNumber - 5) {
    return {
      error: `Node is out of sync: local=#${blockNumber} ; etherscan=#${etherscanBlockNumber}`,
      block: {
        number: blockNumber,
        hash: block.hash,
        date: blockDate
      }
    };
  }

  // const etherscanBlock = await getBlock('0x' + blockNumber.toString(16));

  // // Check if the block hash is correct
  // if (block.hash !== etherscanBlock.hash) {
  //   return {
  //     error: `Invalid block #${blockNumber}: local hash=${block.hash} ; etherscan hash=${etherscanBlock.hash}`,
  //     block: {
  //       number: blockNumber,
  //       hash: block.hash,
  //       date: blockDate
  //     }
  //   };
  // }
}

async function sleep (duration) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), duration);
  });
}

const LAST_REPORT_TIMESTAMP_FILEPATH = path.join(os.tmpdir(), 'picops_health-checker_report-timestamp');

async function report (block, error) {
  let lastReportTimestamp = 0;

  try {
    lastReportTimestamp = parseInt(fs.readFileSync(LAST_REPORT_TIMESTAMP_FILEPATH).toString().trim());
  } catch (err) {
  }

  // Don't send more than 1 email per hour
  if (Date.now() - lastReportTimestamp < 1000 * 60 * 60) {
    return;
  }

  fs.writeFileSync(LAST_REPORT_TIMESTAMP_FILEPATH, Date.now());

  try {
    await mailjet.post('send').request({
      'FromEmail': 'noreply@parity.io',
      'FromName': 'PICOPS Health Checker',
      'Subject': 'Something went wrong...',
      'Text-part': `The Parity node behind PICOPS is out of sync!

\t Error: ${error}
\t Block Information: ${JSON.stringify(block)}

Please fix ASAP.
      `,
      'Recipients': emails.map((email) => ({ Email: email }))
    });
  } catch (err) {
    console.error(err);
  }
}

async function loop () {
  while (true) {
    try {
      const result = await main();

      if (!result) {
        console.log(`[${new Date().toISOString()}] OK`);
      } else {
        const { block, error } = result;

        console.error(`[${new Date().toISOString()}]`, error);
        report(block, error);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}]`, error);
    }

    await sleep(2 * 60 * 1000);
  }
}

loop().catch((error) => {
  console.error(error);
  process.exit(1);
});
