// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const path = require('path');

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../../../config');

const { uniq } = require('lodash');
const config = require('config');

const { CachingTransport } = require('../api/transport');
const Certifier = require('../contracts/certifier');
const Identity = require('../identity');
const Fee = require('../contracts/fee');
const ParityConnector = require('../api/parity');

const onfidoMaxChecks = config.get('onfido.maxChecks');

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

async function main () {
  const transport = new CachingTransport(config.get('nodeWs'));
  const connector = new ParityConnector(transport);
  const feeRegistrar = new Fee(connector);

  const certifier = new Certifier(connector, config.get('certifierContract'));

  await fetch(feeRegistrar._fallbacks[1]);

  async function fetch (feeContractInstance) {
    process.stderr.write('\n> fetching logs...  ');

    const payments = await feeContractInstance.events.Paid().get({
      fromBlock: '0x' + (4294787).toString(16)
    });

    process.stderr.write('done!\n\n');

    const payers = uniq(payments.map((log) => log.params.who));
    const uncertifiedPayers = [];

    for (const payer of payers) {
      const certified = await certifier.isCertified(payer);

      if (certified) {
        continue;
      }

      const identity = new Identity(payer);
      const checks = await identity.checks.count();
      const [ paymentCount ] = await feeContractInstance.methods.payer(payer).get();

      if (paymentCount * onfidoMaxChecks <= checks) {
        continue;
      }

      const { status, reason } = await identity.getData();

      if (reason === 'blocked-country' || reason === 'used-document') {
        continue;
      }

      uncertifiedPayers.push({
        who: payer,
        checks,
        payments: paymentCount,
        status
      });
    }

    console.warn(`> received ${payments.length} payements`);
    console.warn(`> by ${payers.length} unique addresses`);
    console.warn(`> of which ${uncertifiedPayers.length} have not been certified yet`);
    console.warn(JSON.stringify(uncertifiedPayers.slice(0, 10), null, 2));
  }
}
