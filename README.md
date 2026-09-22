readme = r"""# Blockchain Demo

A practical implementation of core blockchain concepts using Java and JavaScript. The project provides an interactive web demonstration of hashing, block construction, Proof-of-Work, blockchain linking, distributed peers, token transactions, and Coinbase transactions.

The project was developed for learning and experimentation, with the concepts and module structure studied from the Anders Brownworth Blockchain Demo. The Java and web implementations in this repository were developed separately and validated using shared test vectors.

## Live Demo

**Web Application:**  
https://dist-prem-479.vercel.app/#/hash

**GitHub Repository:**  
https://github.com/prem-479/Blockchain-Demo

---

## Project Overview

The purpose of this project is to make the basic mechanisms behind a blockchain visible and testable through an interactive interface.

Instead of treating a blockchain as a single abstract data structure, the application breaks it into individual concepts:

1. Cryptographic hashing
2. Block structure
3. Proof-of-Work mining
4. Blockchain validation and linking
5. Distributed blockchain replication
6. Token transactions
7. Coinbase transactions and mining rewards

The application is intended as an educational blockchain simulation and is not a production blockchain network.

---

## Features

### SHA-256 Hashing

The Hash module demonstrates how input data is converted into a SHA-256 hash.

A change to even a small part of the input results in a different hash, making the relationship between data integrity and cryptographic hashing easier to observe.

```text
Input Data
    |
    v
 SHA-256
    |
    v
64-character hexadecimal hash
Block

The Block module demonstrates the basic structure of a mined blockchain block.

A block contains values such as:

Block Number
Data
Nonce
Hash

The hash is calculated from the block data and nonce.

The block can then be mined by searching for a nonce that produces a hash satisfying the required Proof-of-Work condition.

Proof of Work

Mining is demonstrated by repeatedly changing the nonce and recalculating the hash.

          Block Data
               |
               +
             Nonce
               |
               v
           SHA-256
               |
               v
        Valid difficulty?
          /          \
        No            Yes
        |              |
     Nonce++      Block mined
        |
        └───────────────┐
                        |
                        v
                     SHA-256

The implementation starts searching from nonce 0 and stops at the first value that satisfies the mining condition.

Blockchain

The Blockchain module extends a single block into a chain of blocks.

Each block stores the hash of the previous block.

+---------------+
|    Block 1    |
|               |
| Hash = H1     |
+-------+-------+
        |
        | Previous Hash = H1
        v
+---------------+
|    Block 2    |
|               |
| Hash = H2     |
+-------+-------+
        |
        | Previous Hash = H2
        v
+---------------+
|    Block 3    |
|               |
| Hash = H3     |
+---------------+

If the contents of an earlier block are changed, its hash changes. The next block then references the old hash and the chain becomes invalid.

Distributed Blockchain

The Distributed module demonstrates how multiple peers can maintain their own copies of the blockchain.

                    Blockchain
                        |
          +-------------+-------------+
          |             |             |
          v             v             v
       Peer A         Peer B        Peer C
          |             |             |
       Copy A         Copy B        Copy C

This module is used to illustrate replication and validation between multiple blockchain participants.

Token Transactions

The Tokens module demonstrates transactions stored inside blocks.

A transaction can be represented as:

Sender  ->  Receiver  ->  Amount

Multiple transactions can be included in the same block.

The block hash is then dependent on the transaction data and other block fields.

Coinbase Transactions

The Coinbase module demonstrates the special transaction associated with a block reward.

Conceptually:

        Mining
           |
           v
     Valid Block
           |
           v
   Coinbase Reward
           |
           v
         Miner

This demonstrates how mining rewards can be represented within a blockchain.

Architecture

The project contains separate Java and web implementations supported by shared test vectors.

                         Blockchain Demo
                                |
               +----------------+----------------+
               |                                 |
               v                                 v
         Web Implementation                 Java Implementation
               |                                 |
       +-------+--------+                +-------+---------+
       |       |        |                |       |         |
      Hash    Block   Blockchain        Hash   Mining   Validation
       |       |        |                |       |         |
       +-------+--------+                +-------+---------+
               |                                 |
               +----------------+----------------+
                                |
                                v
                    Shared Test Vectors

The shared test vectors are used to compare expected hashes and mining results across implementations.

Project Structure
Blockchain-Demo/
|
+-- docs/
|   +-- documentation and supporting material
|
+-- java/
|   +-- src/
|       +-- Java blockchain implementation
|
+-- shared-test-vectors/
|   +-- shared validation and mining test data
|
+-- web/
|   +-- web implementation
|
+-- README.md
Java Implementation

The Java implementation separates the main blockchain operations into dedicated components.

HashService
     |
     v
ValidationService
     |
     v
MiningService
     |
     v
Blockchain
Main responsibilities

HashService

SHA-256 calculation
block serialization and hash generation

ValidationService

block validation
hash verification
previous-hash verification

MiningService

nonce search
Proof-of-Work validation
identification of the first valid nonce

Blockchain

block management
chain linking
chain-level validation
Web Implementation

The web version provides an interactive interface for experimenting with blockchain behavior directly in a browser.

The implementation includes client-side blockchain logic for:

SHA-256 hashing
block serialization
block validation
Proof-of-Work
mining
previous-hash verification
blockchain linking

The interface contains six main sections:

Hash
Block
Blockchain
Distributed
Tokens
Coinbase
Validation Model

A block must satisfy its own hashing condition and its relationship with the previous block.

Conceptually:

Block Valid
   |
   +-- Own hash is valid
   |
   +-- Previous hash matches
   |
   +-- Previous block is valid
   |
   v
Chain remains valid

Editing a block therefore provides a direct demonstration of how tampering propagates through a blockchain.

Mining Model

The mining process follows a simple nonce-search approach:

nonce = 0

while hash does not satisfy difficulty:
    nonce++
    calculate hash

The first nonce producing a valid hash is stored as the mined nonce.

This behavior is used consistently across the project and is compared against the shared reference values.

Testing

The repository includes tests for the Java and JavaScript implementations.

Testing covers areas such as:

SHA-256 hashing
serialization
block hashing
block validation
previous-hash validation
Proof-of-Work
nonce generation
expected hash values
shared test vectors

The purpose of the shared vectors is to ensure that equivalent inputs produce equivalent results across the two implementations.

Example Blockchain Flow

The overall process demonstrated by the project can be summarized as:

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
Screenshots

Screenshots of the deployed application can be added here.

Recommended structure:

docs/
└── screenshots/
    ├── hash.png
    ├── block.png
    ├── blockchain.png
    ├── distributed.png
    ├── tokens.png
    └── coinbase.png

Example:

## Hash Module

![Hash Module](docs/screenshots/hash.png)

## Block Mining

![Block Module](docs/screenshots/block.png)

## Blockchain

![Blockchain Module](docs/screenshots/blockchain.png)

All screenshots shown in this section should be screenshots of the implementation in this repository unless explicitly credited otherwise.

Diagrams

The diagrams in this README are simplified explanatory diagrams created specifically for this repository using Markdown code blocks.

They are not copied from an external source.

The underlying concepts represented by the diagrams are based on standard blockchain concepts and were studied with reference to the Anders Brownworth Blockchain Demo.

Where an external image, screenshot, logo, or diagram is used in the repository, its original source should be credited directly below the image.

Example:

![Diagram](docs/diagram.png)

**Source:** Anders Brownworth, Blockchain Demo  
https://andersbrownworth.com/blockchain/
Reference and Inspiration

The project was developed with reference to the following resource:

Anders Brownworth — Blockchain Demo
https://andersbrownworth.com/blockchain/

Reference modules:

Hash
https://andersbrownworth.com/blockchain/hash
Block
https://andersbrownworth.com/blockchain/block
Blockchain
https://andersbrownworth.com/blockchain/blockchain
Distributed
https://andersbrownworth.com/blockchain/distributed
Tokens
https://andersbrownworth.com/blockchain/tokens
Coinbase
https://andersbrownworth.com/blockchain/coinbase
Attribution

This project is an independent educational implementation.

The conceptual structure and reference behavior were studied from the Anders Brownworth Blockchain Demo.

Original reference:
Anders Brownworth
https://andersbrownworth.com/blockchain/

This repository is not affiliated with or endorsed by Anders Brownworth.

The implementation, Java code, JavaScript code, project structure, tests, and deployment in this repository were developed for this project.

Credits
Blockchain Concepts

Blockchain concepts were studied using the Anders Brownworth Blockchain Demo:

https://andersbrownworth.com/blockchain/

Diagrams

The diagrams included directly in this README are original explanatory diagrams created for this repository using Markdown/code-block notation.

Screenshots

Screenshots under the project documentation should represent the deployed implementation in this repository unless a different source is explicitly stated.

Libraries and Tools

The project uses standard Java and web technologies as documented in the source code.

Deployment

The web implementation is deployed using Vercel.

Live Application

https://dist-prem-479.vercel.app/#/hash

Source Repository

https://github.com/prem-479/Blockchain-Demo

The deployed application is intended for demonstration and experimentation.

Limitations

This project is an educational blockchain simulation and does not attempt to implement a complete production blockchain protocol.

It does not provide:

a real peer-to-peer network
real consensus between independent nodes
production wallet management
cryptographic digital signatures for real accounts
a live cryptocurrency network
economically secure Proof-of-Work

The Distributed section represents the concept of multiple peers rather than operating a real decentralized network.

Learning Objectives

The project was developed to understand the following concepts at implementation level:

Cryptographic hashing
SHA-256
Block construction
Block serialization
Nonce generation
Proof-of-Work
Block validation
Previous-hash relationships
Blockchain integrity
Distributed replication
Token transactions
Coinbase transactions
Mining rewards
Running Locally

Clone the repository:

git clone https://github.com/prem-479/Blockchain-Demo.git
cd Blockchain-Demo

The project contains separate web and Java implementations.

Web

The frontend implementation is located in:

web/
Java

The Java implementation is located in:

java/src/

Use a Java development environment to build and run the Java implementation and its tests.

Project Status

The current repository contains:

Web-based blockchain demonstration
Java implementation
Shared test vectors
Blockchain validation logic
Proof-of-Work mining
Distributed peer demonstration
Token transaction demonstration
Coinbase transaction demonstration
Deployed web application
Author

Prem Mali

B.Tech. Robotics and Artificial Intelligence
K. J. Somaiya School of Engineering

GitHub:
https://github.com/prem-479

Links
Resource	Link
Live Demo	https://dist-prem-479.vercel.app/#/hash
GitHub Repository	https://github.com/prem-479/Blockchain-Demo
Original Reference	https://andersbrownworth.com/blockchain/
Hash Reference	https://andersbrownworth.com/blockchain/hash
Block Reference	https://andersbrownworth.com/blockchain/block
Blockchain Reference	https://andersbrownworth.com/blockchain/blockchain
Distributed Reference	https://andersbrownworth.com/blockchain/distributed
Tokens Reference	https://andersbrownworth.com/blockchain/tokens
Coinbase Reference	https://andersbrownworth.com/blockchain/coinbase
License

No separate open-source license has been specified for this repository.

Unless a license is added to the repository, the source code should not be assumed to be freely reusable, modified, or redistributed.
"""
