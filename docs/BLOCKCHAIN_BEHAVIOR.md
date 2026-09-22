# Blockchain behavior

These rules apply to **every** page: Block, Blockchain, Distributed, Tokens, Coinbase.
There is one implementation of hashing, validation and mining per language:

| Layer | Files |
|---|---|
| Frontend | `web/blockchain-core.js` (the only hash / validity / mining code), `web/app.js` (rendering only) |
| Backend (Java) | `blockchain.core.HashService`, `ValidationService`, `MiningService`, `Blockchain` |
| Shared proof | `shared-test-vectors/vectors.tsv`, read by both `web/test/core.test.js` and `ParityTest.java` |

No page computes its own colour. The colour of a block is the output of the validator, nothing else.

## 1. Verified against the reference demo

The serialization and mining rules below were not guessed. They were reproduced from the reference demo's screenshots:

- `SHA256("fdfdfsdsd")` and `SHA256("")` match the Hash page.
- Block page: block `1`, empty data, first valid nonce = **72608**, hash `0000f727…`; block `-5` with nonce **8351** gives `00002c0a…` (GREEN).
- Blockchain / Distributed: nonces **11316, 35230, 12937** for blocks 1–3 with empty data, each block's Prev being the previous hash.
- Tokens: nonces **139358, 39207, 13804, 20688, 33083** for blocks 1–5, hashes `00000c52…`, `000078be…`, `0000c2c9…`, `0000c030…`, `0000baa0…`. Block 5's second transaction amount is `2,760.29` — a thousands separator — and it hashes correctly with no reformatting, which is why the validator does not check amount format (section 7).
- Coinbase: nonces **16651, 215458, 146, 18292, 108899** for blocks 1–5, hashes `0000438d…`, `0000baea…`, `0000df1d…`, `0000c694…`, `0000fc76…`. Block 5's coinbase recipient (`Sophia`) differs from blocks 1–4 (`Anders`), and that alone doesn't break anything — the coinbase recipient is just another field in the canonical string.

Mining the same content from nonce 0 in both JavaScript and Java returns exactly these nonces, which confirms that mining always starts at 0 and takes the first hit. All eleven hashes above (six Tokens/Coinbase blocks beyond the first two, plus the five originally confirmed) reproduce byte-for-byte from the reference demo's own screenshots.

## 2. Hash calculation

`hash = lowercase hex SHA-256 of the UTF-8 bytes of the canonical string`.

The hash shown in a block is a **derived** field. It is recalculated after every edit and is never trusted: the validator recomputes it and compares (Condition A).

## 3. Canonical serialization

Plain string concatenation, no separators, no trimming, no reformatting. Every field is kept as the text the user typed (`25.00` stays `25.00`).

| Block kind | Canonical string |
|---|---|
| Block page (not linked) | `number + nonce + data` |
| Blockchain / Distributed | `number + nonce + data + prev` |
| Tokens | `number + nonce + Σ(amount + from + to) + prev` |
| Coinbase | `number + nonce + coinbaseAmount + coinbaseTo + Σ(amount + from + to) + prev` |

`Σ` runs over the transactions in row order. Example (Coinbase block 2): `2` `215458` `100.00` `Anders` `10.00AndersSophia20.00AndersLucas…` then the previous hash.

## 4. Nonce

A non-negative integer (as text). Any other value is structurally invalid and the block is RED with reason `Invalid nonce`. The block number must be an integer (negative numbers are allowed, as in the reference demo).

## 5. Difficulty

Difficulty is **4**: the calculated hash must start with `0000` (`REQUIRED_PREFIX`).

## 6. Mining

```
nonce = 0
loop:
    h = SHA256(number + nonce + rest)
    if h starts with "0000": stop, use this nonce and this hash
    nonce++
```

- The first valid nonce is used. Nothing is random, cached, faked or timed.
- The browser slices the loop into ~25 ms pieces so the page stays responsive. Every slice is a real batch of hash attempts.
- Editing a block while it is being mined cancels that run; the stale result is never applied.
- After a nonce is found the state is updated, the validator runs, and the renderer colours the block. The Mine handler never sets a colour.
- Nothing downstream is mined automatically.

## 7. Validation

One function per level, used by every page:

- `validateBlock(block, previousBlock)` returns the **local** result.
- `validateBlockchain(blocks)` returns the result used for colour.

A block is locally valid only when all of these hold:

| | Condition |
|---|---|
| A | The stored hash equals the recalculated hash. |
| B | The recalculated hash starts with `0000`. |
| C | For linked blocks that are not first: `prev` equals the recalculated hash of the block before it. |
| D | The first linked block has `prev` = 64 zeroes. |
| S | Structure: integer block number, integer nonce ≥ 0; every transaction has a numeric amount (`25`, `25.00`), a non-empty sender and a non-empty recipient; the coinbase has a numeric amount and a non-empty recipient. |

A correctly calculated hash is **not** a valid block: `hello` with nonce `123` has a perfectly correct hash that does not start with `0000`, so it is RED.

Reasons (internal / tests only, never shown as UI): `Invalid block number`, `Invalid nonce`, `Invalid transaction data`, `Hash mismatch`, `Proof of work not satisfied`, `Previous hash mismatch`, `Genesis previous hash mismatch`, `Previous block invalid`.

The Block page has no Prev field, so C and D do not apply to it.

## 8. Green and red

The panel colour comes from the validator result of that block in its chain, via exactly two classes, used on all pages:

```css
.block-valid   { background: #dff0d8; border-color: #d6e9c6; }  /* GREEN */
.block-invalid { background: #f2dede; border-color: #ebccd1; }  /* RED   */
```

`refresh()` in `app.js` is the only code that toggles them. There are no badges, icons, toasts or animations. (For screen readers the panel carries `aria-label="Block N, valid|invalid"`, which is not visible.)

## 9. Previous hash and propagation

A block is **GREEN only if it is locally valid and the block before it is GREEN**. This is what makes a change ripple down the chain:

1. Change Block 2. Its hash changes, so Block 2 is RED.
2. Block 3's stored `prev` still holds the old Block 2 hash, so Block 3 is RED (`Previous hash mismatch`).
3. Block 4 is RED because Block 3 is RED (`Previous block invalid`), and so on to the end.

The stored `prev` of downstream blocks is **not** rewritten when you edit an earlier block. The broken link stays visible.

## 10. Mining a block inside a chain

When Block *n* is mined:

1. It receives the first valid nonce and its new hash.
2. Block *n+1*'s `prev` is set to that new hash. Because `prev` is part of Block *n+1*'s canonical string, its hash changes and it is RED (proof of work no longer satisfied).
3. The user mines Block *n+1*, which in turn updates Block *n+2*'s `prev`, and so on.

Manual edits of `prev` never propagate; only mining relinks the next block.

## 11. Distributed peers

Each peer (A, B, C) owns its own chain state. Each peer is validated only against its own blocks. Editing or mining on Peer A does not touch Peer B or C.

## 12. Transactions (Tokens page)

The Tokens blocks hold a list of `amount / from / to` rows in place of Data. Editing any amount, sender or recipient changes the canonical string, so the hash changes and the block is normally RED until mined. Downstream blocks follow the rules in section 9.

## 13. Coinbase page

A Coinbase block is a Tokens block with one extra leading transaction, the coinbase (`amount -> recipient`). Editing the coinbase amount, coinbase recipient, any transaction, the nonce or Prev triggers the same validation and the same propagation.

## 14. Java / JavaScript parity

`vectors.tsv` holds inputs and the expected hash, produced with Node's built-in `crypto` (independent of our own SHA-256). Both test suites assert against it, then run the same edit / mine / propagate scenarios (acceptance tests 1–9 of the spec). Run:

```
node web/test/core.test.js
cd java && java --module jdk.compiler/com.sun.tools.javac.Main -d out $(find src -name '*.java') \
  && java -cp out blockchain.core.ParityTest ../shared-test-vectors/vectors.tsv
```

If `javac` is on your PATH, `javac -d out $(find src -name '*.java')` works the same.

## 15. Deliberate interpretation choices

The specification leaves a few points open. These are the choices made:

- **Downstream RED after an upstream edit (acceptance test 2).** The rule that a block needs a valid predecessor (section 9) is what makes Blocks 3–5 RED without silently rewriting their `prev`.
- **Prev is editable.** Acceptance test 9 requires a manual Prev change, so the field is an ordinary input on every page. Hash is read-only.
- **Prev is compared with the recalculated hash of the previous block**, not with its displayed hash, so a tampered displayed hash cannot make a link look correct.
- **Structure rule S** only requires non-empty amount/from/to and integer number/nonce. Amounts are free text (the reference demo hashes `2,760.29` as-is), so there is no numeric-format check on amount.
- **Tokens and Coinbase seed data (all 5 blocks, both pages)** is copied verbatim from the reference demo's own screenshots, not invented. Mining that exact content in this implementation reproduces the reference demo's nonces and hashes exactly (see section 1).
