import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Button, Header, Loader, Modal } from 'semantic-ui-react';
import QRCode from 'qrcode.react';

import { isValidAddress, fromWei } from '../../utils';

import appStore from '../../stores/app.store';
import feeStore from '../../stores/fee.store';

import AccountInfo from '../AccountInfo';
import AddressInput from '../AddressInput';

@observer
export default class WaitingPayment extends Component {
  state = {
    alreadyPaidError: false,
    openAlreadyPaid: false,
    paidFor: ''
  };

  componentWillMount () {
    feeStore.watchWallet();
  }

  componentWillUnmount () {
    feeStore.unwatchWallet();
  }

  render () {
    const { requiredEth, wallet } = feeStore;

    if (requiredEth === null || wallet === null) {
      return null;
    }

    const link = `web+ethereum:${wallet.address}?value=${requiredEth.toNumber()}&gas=21000`;
    const feeStyle = {
      padding: '0.1em 0.25em',
      background: '#fff8dd',
      borderRadius: '0.25em'
    };

    return (
      <div>
        {this.renderAlreadyPaid()}
        <Header
          as='h3'
          textAlign='center'
        >
          PAY THE CERTIFICATION FEE BY SENDING <big style={feeStyle}>{ fromWei(requiredEth).toFormat() } ETH</big> TO:
        </Header>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '1.5em 0 0',
          flexDirection: 'column'
        }}>
          <AccountInfo
            address={wallet.address}
            showCertified={false}
          />

          <br />

          <a href={link}>
            <QRCode
              level='M'
              size={192}
              value={wallet.address}
            />
          </a>

          <div style={{
            margin: '1.5em 0',
            color: 'red',
            fontSize: '1.25em',
            display: 'flex'
          }}>
            <Loader active inline size='tiny' style={{ marginRight: '0.5em' }} />
            <span>Waiting for transaction...</span>
          </div>

          <div style={{
            display: 'flex'
          }}>
            {
              /**
                <Button primary onClick={this.handleShowAlreadyPaid}>
                  I already paid
                </Button>
               */
            }
            <Button secondary onClick={this.handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  renderAlreadyPaid () {
    const { alreadyPaidError, openAlreadyPaid, paidFor } = this.state;
    const valid = isValidAddress(paidFor);

    return (
      <Modal
        open={openAlreadyPaid}
        onClose={this.handleCloseAlreadyPaid}
        size='small'
      >
        <Header content='The fee has already been paid for' />
        <Modal.Content>
          {
            alreadyPaidError
              ? (
                <p>
                  We couldn't verify the payment for this address.
                </p>
              )
              : (
                <div>
                  <p>
                    If you already paid for the fee, please enter the Ethereum address
                    you paid the fee for (ie. the address you wish to certify) below:
                  </p>
                  <AddressInput
                    basic
                    onChange={this.handlePaidForChange}
                    onEnter={this.handleCheckPayment}
                    value={paidFor}
                  />
                </div>
              )
          }
        </Modal.Content>
        <Modal.Actions>
          {
            alreadyPaidError
              ? null
              : (
                <Button onClick={this.handleCheckPayment} disabled={!valid}>
                  Check payment
                </Button>
              )
          }
          <Button secondary onClick={this.handleCloseAlreadyPaid}>
            Close
          </Button>
        </Modal.Actions>
      </Modal>
    );
  }

  handleCheckPayment = async () => {
    const { paidFor } = this.state;

    if (!isValidAddress(paidFor)) {
      return;
    }

    const success = await feeStore.checkPayer(paidFor);

    if (!success) {
      this.setState({ alreadyPaidError: true });
    }
  };

  handlePaidForChange = (_, { value }) => {
    this.setState({ paidFor: value });
  };

  handleCloseAlreadyPaid = () => {
    this.setState({ openAlreadyPaid: false, paidFor: '', alreadyPaidError: false });
  };

  handleShowAlreadyPaid = () => {
    this.setState({ openAlreadyPaid: true });
  };

  handleCancel = () => {
    appStore.restart();
  };
}
