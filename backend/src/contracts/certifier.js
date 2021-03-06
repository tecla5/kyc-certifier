// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const account = require('./account');
const { MultiCertifier } = require('../abis');
const Contract = require('../api/contract');
const { int2hex, keccak256 } = require('../utils');

class Certifier extends Contract {
  /**
   * Abstraction over the certifier contract, found here:
   * https://github.com/paritytech/second-price-auction/blob/master/src/contracts/MultiCertifier.sol
   *
   * @param {Object} connector  A ParityConnector
   * @param {String} address    `0x` prefixed
   */
  constructor (connector, address) {
    super(connector, address, MultiCertifier);
  }

  /**
   * Certify an address using a trusted account
   *
   * @param {String} address to certify, `0x` prefixed
   *
   * @return {Promise<String>} promise of a TX hash
   */
  async certify (address) {
    const gasPrice = int2hex(this.connector.gasPrice);
    const txHash = await this.methods.certify(address).post({ gasPrice }, account.privateKey);

    console.log(`sent certify tx for ${address} : ${txHash} `);

    return txHash;
  }

  /**
   * Check if account is certified
   *
   * @param {String}  address `0x` prefixed
   *
   * @return {Promise<Boolean>}
   */
  async isCertified (address) {
    const [ certified ] = await this.methods.certified(address).get();

    return certified;
  }

  /**
   * Test if the given address is a delegate or the owner
   * of the contract.
   *
   * @param  {String}  address
   * @return {Boolean}
   */
  async isDelegate (address) {
    const [ owner ] = await this.methods.owner().get();

    if (address.toLowerCase() === owner.toLowerCase()) {
      return true;
    }

    // delegates is a mapping(address => bool) at position 2
    const key = address.toLowerCase().replace('0x', '').padStart(64, '0') + '2'.padStart(64, '0');
    const storageLocation = '0x' + keccak256(Buffer.from(key, 'hex'));
    const data = await this.connector.getStorageAt(this.address, storageLocation);
    const isDelegate = data[data.length - 1] === '1';

    return isDelegate;
  }

  /**
   * Revoke an address using a trusted account
   *
   * @param {String} address to revoke, `0x` prefixed
   *
   * @return {Promise<String>} promise of a TX hash
   */
  async revoke (address) {
    const gasPrice = int2hex(this.connector.gasPrice);
    const txHash = await this.methods.revoke(address).post({ gasPrice }, account.privateKey);

    console.log(`sent revoke tx for ${address} : ${txHash} `);

    return txHash;
  }
}

module.exports = Certifier;
