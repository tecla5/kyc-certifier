# Certifier Website

## Architectur & Implementation

**This service is implemented through four major components:**

1. A Background-Check Smart Contract, hosted on Ethereum (BSC).
2. A firewalled, Verification Signing Relay (VSR).
3. A Background-Check Web Service for accepting payment and initiating verification (BWS).
4. The Onfido Identity Document Verification service (IDV).

### Background-Check Smart Contract
This is a simple certification contract, implemented in Solidity and deployed on the Ethereum blockchain. The code for this is specified [here](https://github.com/paritytech/contracts/blob/master/SimpleCertifier.sol). The smart contract respects two addresses: owner and delegate. The former is a “top-level” failsafe key which has full ownership and administrative rights over the contract. It is kept only as a recovery phrase. It is never expected to be used. The latter, delegate, is a secure account from which transactions may be signed by the Verification Signing Relay.

### Verification Signing Relay
This service is the security-critical portion of the components hosted by Parity Technologies. It exists as a Node.js module and its code can be found in this repository. This service runs on a secure and firewalled server to which no incoming connections (save SSH over an internal private network) are allowed. It is allowed only to receive requests from CWS via a secure Redis pubsub messages, verify the requests with IDV and submit final signed transactions to the Ethereum network via a proxy service (securely hosted Parity node). It monitors the IDV service for identities that have been verified as conforming to the various provisions that were set out above. When such an identity is found, a transaction which affects certification of the Ethereum address that the identity provided is signed by the delegate address and published to the blockchain.

### Background-Check Web-Service
This is a standard-security module implemented as a Node.js service which is able to collect information (the Ethereum address primarily) and payment from a potential person who wishes to gain certification. The code is defined  in this repository. It fulfills two key tasks: firstly, it initiates the background-check processes with the IDV module in a manner resistant to spam/economic-DoS attacks. Secondly, it passes the key for the results of the background-check process to the Verification Signing Relay module in order that it can enact the results on-chain.

### Identity Document Verification
This module is a combination of web-service and web-backend. It is implemented and operated by Onfido. Parity Technologies has no insight into its implementation, however there are clear guarantees of its operation under contract with Parity Technologies. The service begins with the authorisation for a particular user to begin the verification process. This is initiated from the Certification Web-Service. Once authorised, the user is able to provide their identity document as an uploaded image. The IDV service then performs the checks listed under “Document Image Check” and “Watchlist Check” on https://onfido.com/products. The aggregate of all obtained personal information is then communicated to any service that has the authorisation key, which in this case would be the Verification Signing Relay.

## Quick start

See [Quick start](./Quick-start.md)