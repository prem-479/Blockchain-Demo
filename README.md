# Blockchain Demo

A practical implementation of fundamental blockchain concepts using Java and JavaScript. The project provides an interactive web demonstration of SHA-256 hashing, block creation, Proof-of-Work mining, blockchain linking, distributed peers, token transactions, and Coinbase transactions.

## Live Demo

**[Open the Live Demo](https://dist-prem-479.vercel.app/#/hash)**

**[GitHub Repository](https://github.com/prem-479/Blockchain-Demo)**

## Overview

This project demonstrates how a basic blockchain works through six interactive modules:

- **Hash** – SHA-256 hashing and data integrity
- **Block** – Block structure, nonce and mining
- **Blockchain** – Previous-hash linking and validation
- **Distributed** – Multiple peers maintaining blockchain copies
- **Tokens** – Token transactions stored in blocks
- **Coinbase** – Mining rewards and Coinbase transactions

## Architecture

```text
                    Blockchain Demo
                           |
             +-------------+-------------+
             |                           |
             v                           v
      Web Implementation          Java Implementation
             |                           |
       Hash / Block / Chain       Hash / Mining / Validation
             |                           |
             +-------------+-------------+
                           |
                           v
                  Shared Test Vectors
Blockchain Flow
Transaction / Data
        |
        v
    Create Block
        |
        v
  Calculate Hash
        |
        v
       Mine
        |
        v
 Validate Block
        |
        v
Link to Previous Block
        |
        v
    Blockchain
Key Concepts
Hashing

Input data is processed using SHA-256. Any change in the input produces a different hash.

Proof-of-Work

Mining repeatedly changes the nonce until a hash satisfying the required difficulty is found.

Blockchain Linking

Each block stores the previous block's hash. Changing an earlier block therefore invalidates the following chain.

Distributed Blockchain

The Distributed module demonstrates the concept of multiple peers maintaining copies of the same blockchain.

Transactions

The Tokens and Coinbase modules demonstrate transaction data and mining rewards stored within blocks.

Project Structure
Blockchain-Demo/
├── docs/
├── java/
│   └── src/
├── shared-test-vectors/
├── web/
└── README.md
Implementation

The Java implementation includes:

HashService
ValidationService
MiningService
Blockchain

The web implementation provides the same core concepts through an interactive browser interface.

Testing

The project includes Java and JavaScript tests with shared test vectors covering:

SHA-256 hashing
Serialization
Block validation
Previous-hash validation
Proof-of-Work
Nonce generation
Expected hash values
Reference

The project was developed with reference to:

Anders Brownworth — Blockchain Demo
https://andersbrownworth.com/blockchain/

Reference modules:

Hash
Block
Blockchain
Distributed
Tokens
Coinbase
Attribution

The conceptual structure and reference behavior were studied from the Anders Brownworth Blockchain Demo. The Java implementation, JavaScript implementation, tests, project structure, documentation, and deployment were developed for this project.

The diagrams in this README are original explanatory diagrams created for this repository. Any external images or screenshots should be credited to their original source.

This repository is not affiliated with or endorsed by Anders Brownworth.

Deployment

The web application is deployed on Vercel:

https://dist-prem-479.vercel.app/#/hash

Limitations

This is an educational blockchain simulation and does not implement a production blockchain network, real peer-to-peer consensus, or a live cryptocurrency system.
