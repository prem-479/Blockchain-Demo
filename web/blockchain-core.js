/*
 * blockchain-core.js
 *
 * THE single source of truth for hashing, serialization, mining and validity
 * on every page (Block, Blockchain, Distributed, Tokens, Coinbase).
 * No page may implement its own hash / validity / colour logic.
 * See docs/BLOCKCHAIN_BEHAVIOR.md. The Java port (blockchain.core.*) mirrors this file.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BlockchainCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DIFFICULTY = 4;
  var REQUIRED_PREFIX = '0'.repeat(DIFFICULTY);
  var GENESIS_PREV = '0'.repeat(64);
  var KINDS = { DATA: 'data', TOKENS: 'tokens', COINBASE: 'coinbase' };

  /* ---------------------------------------------------------------- SHA-256 */
  var K = Uint32Array.from([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);
  var W = new Uint32Array(64);
  var encoder = new TextEncoder(); // UTF-8, same as Java's StandardCharsets.UTF_8

  /** Synchronous SHA-256 of a string (UTF-8) -> 64 lowercase hex chars. */
  function sha256(message) {
    var bytes = encoder.encode(String(message));
    var len = bytes.length;
    var padded = ((len + 9 + 63) >> 6) << 6;
    var buf = new Uint8Array(padded);
    buf.set(bytes);
    buf[len] = 0x80;
    var dv = new DataView(buf.buffer);
    dv.setUint32(padded - 8, Math.floor(len / 0x20000000));
    dv.setUint32(padded - 4, (len << 3) >>> 0);

    var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    var h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

    for (var off = 0; off < padded; off += 64) {
      var i;
      for (i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
      for (i = 16; i < 64; i++) {
        var x = W[i - 15], y = W[i - 2];
        var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        var s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        W[i] = W[i - 16] + s0 + W[i - 7] + s1;
      }
      var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[i] + W[i]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }
    return [h0, h1, h2, h3, h4, h5, h6, h7]
      .map(function (v) { return (v >>> 0).toString(16).padStart(8, '0'); }).join('');
  }

  /* ----------------------------------------------------------- Block model */
  /*
   * A block is a plain object; every field is a STRING exactly as typed
   * (so "25.00" stays "25.00"; it is never re-formatted).
   *   kind     'data' | 'tokens' | 'coinbase'
   *   linked   false only for the standalone Block page (no Prev field)
   *   number, nonce, data, prev, hash
   *   coinbase { amount, to }            (coinbase kind only)
   *   tx       [{ amount, from, to }]    (tokens / coinbase kinds)
   */
  function createBlock(kind, input) {
    input = input || {};
    var b = {
      kind: kind,
      linked: input.linked !== false,
      number: String(input.number === undefined ? '1' : input.number),
      nonce: String(input.nonce === undefined ? '0' : input.nonce),
      data: String(input.data === undefined ? '' : input.data),
      prev: String(input.prev === undefined ? GENESIS_PREV : input.prev),
      hash: '',
      coinbase: kind === KINDS.COINBASE
        ? { amount: String((input.coinbase || {}).amount || '0.00'), to: String((input.coinbase || {}).to || '') }
        : null,
      tx: (input.tx || []).map(function (t) {
        return { amount: String(t.amount), from: String(t.from), to: String(t.to) };
      })
    };
    b.hash = input.hash !== undefined ? String(input.hash) : calculateHash(b);
    return b;
  }

  /* ---------------------------------------------- Canonical serialization */
  /*
   *  data     : number + nonce + data                       [+ prev if linked]
   *  tokens   : number + nonce + SUM(amount+from+to)        [+ prev]
   *  coinbase : number + nonce + cbAmount + cbTo + SUM(amount+from+to) [+ prev]
   * Plain concatenation, no separators, UTF-8, exactly as the reference demo.
   * canonical = head + nonce + tail  (so mining only re-builds the nonce).
   */
  function txString(txs) {
    var s = '';
    for (var i = 0; i < txs.length; i++) s += txs[i].amount + txs[i].from + txs[i].to;
    return s;
  }

  function serializeParts(block) {
    var body;
    if (block.kind === KINDS.TOKENS) body = txString(block.tx);
    else if (block.kind === KINDS.COINBASE) body = block.coinbase.amount + block.coinbase.to + txString(block.tx);
    else body = block.data;
    return { head: String(block.number), tail: body + (block.linked ? block.prev : '') };
  }

  function canonicalBlockData(block) {
    var p = serializeParts(block);
    return p.head + block.nonce + p.tail;
  }

  function calculateHash(block) {
    return sha256(canonicalBlockData(block));
  }

  /* ------------------------------------------------------------ Validation */
  var INT_RE = /^-?\d+$/;
  var NONNEG_INT_RE = /^\d+$/;

  /*
   * The reference demo places no format restriction on amounts: block 5 of the
   * Tokens page uses "2,760.29" (a thousands separator) and hashes fine. So the
   * only structural requirements are on number/nonce (they drive mining and
   * chain position); amount/from/to are free text, exactly what's hashed.
   */
  function structureError(block) {
    if (!INT_RE.test(block.number)) return 'Invalid block number';
    if (!NONNEG_INT_RE.test(block.nonce)) return 'Invalid nonce';
    if (block.kind === KINDS.COINBASE) {
      if (block.coinbase.amount === '' || block.coinbase.to === '') return 'Invalid transaction data';
    }
    if (block.kind === KINDS.TOKENS || block.kind === KINDS.COINBASE) {
      for (var i = 0; i < block.tx.length; i++) {
        var t = block.tx[i];
        if (t.amount === '' || t.from === '' || t.to === '') return 'Invalid transaction data';
      }
    }
    return null;
  }

  /**
   * Local validity of ONE block (conditions A-D + structure).
   * previousBlock === null means "this is the genesis position".
   */
  function validateBlock(block, previousBlock) {
    var calculatedHash = calculateHash(block);
    var hashCorrect = block.hash === calculatedHash;                       // A
    var proofOfWorkValid = calculatedHash.indexOf(REQUIRED_PREFIX) === 0;  // B
    var previousHashValid = true, expectedPreviousHash = null, actualPreviousHash = null, prevReason = null;
    if (block.linked) {                                                    // C / D
      actualPreviousHash = block.prev;
      if (previousBlock) {
        expectedPreviousHash = calculateHash(previousBlock);
        prevReason = 'Previous hash mismatch';
      } else {
        expectedPreviousHash = GENESIS_PREV;
        prevReason = 'Genesis previous hash mismatch';
      }
      previousHashValid = actualPreviousHash === expectedPreviousHash;
    }
    var sErr = structureError(block);
    var reason = null;
    if (sErr) reason = sErr;
    else if (!hashCorrect) reason = 'Hash mismatch';
    else if (!proofOfWorkValid) reason = 'Proof of work not satisfied';
    else if (!previousHashValid) reason = prevReason;
    return {
      valid: reason === null,
      hashCorrect: hashCorrect,
      proofOfWorkValid: proofOfWorkValid,
      previousHashValid: previousHashValid,
      structureValid: sErr === null,
      calculatedHash: calculatedHash,
      expectedPreviousHash: expectedPreviousHash,
      actualPreviousHash: actualPreviousHash,
      reason: reason
    };
  }

  /**
   * Validity of a whole chain. THIS is what every renderer uses for colour.
   * A block is valid only if it is locally valid AND the block before it is valid
   * (an invalid block invalidates everything downstream: acceptance tests 2 and 5).
   */
  function validateBlockchain(blocks) {
    var results = [];
    for (var i = 0; i < blocks.length; i++) {
      var local = validateBlock(blocks[i], i > 0 ? blocks[i - 1] : null);
      var previousBlockValid = i === 0 ? true : results[i - 1].valid;
      var r = {};
      for (var k in local) r[k] = local[k];
      r.locallyValid = local.valid;
      r.previousBlockValid = previousBlockValid;
      r.valid = local.valid && previousBlockValid;
      r.reason = !local.valid ? local.reason : (previousBlockValid ? null : 'Previous block invalid');
      results.push(r);
    }
    return {
      valid: results.every(function (r) { return r.valid; }),
      blocks: results
    };
  }

  /* ---------------------------------------------------------------- Mining */
  /** Try `iterations` nonces starting at `startNonce`. Real proof of work. */
  function mineChunk(block, startNonce, iterations) {
    var p = serializeParts(block);
    var end = startNonce + iterations;
    for (var n = startNonce; n < end; n++) {
      var h = sha256(p.head + n + p.tail);
      if (h.indexOf(REQUIRED_PREFIX) === 0) return { found: true, nonce: n, hash: h, next: n + 1 };
    }
    return { found: false, next: end };
  }

  /** First valid nonce counting up from 0. */
  function findNonce(block) {
    var start = 0;
    for (;;) {
      var r = mineChunk(block, start, 50000);
      if (r.found) return r;
      start = r.next;
    }
  }

  /* ----------------------------------------------------------------- Chain */
  /** Mutable chain state. The DOM is only ever a view of one of these. */
  function Chain(kind, blockInputs) {
    this.kind = kind;
    this.blocks = blockInputs.map(function (b) { return createBlock(kind, b); });
  }

  Chain.prototype.validate = function () { return validateBlockchain(this.blocks); };

  /** Edit one field by path ('data', 'nonce', 'number', 'prev', 'coinbase.amount', 'tx.2.from', ...). */
  Chain.prototype.setField = function (index, path, value) {
    var b = this.blocks[index];
    var parts = path.split('.');
    if (parts.length === 1) b[parts[0]] = String(value);
    else if (parts[0] === 'coinbase') b.coinbase[parts[1]] = String(value);
    else if (parts[0] === 'tx') b.tx[Number(parts[1])][parts[2]] = String(value);
    else throw new Error('Unknown field ' + path);
    if (parts[0] !== 'hash') b.hash = calculateHash(b);   // hash is always derived, never trusted
  };

  /**
   * Store a mined nonce, then let the NEXT block follow the new hash
   * (its Prev is updated, which changes its own hash, so it stays invalid until mined).
   * Nothing downstream is mined automatically.
   */
  Chain.prototype.applyMined = function (index, nonce) {
    var b = this.blocks[index];
    b.nonce = String(nonce);
    b.hash = calculateHash(b);
    var next = this.blocks[index + 1];
    if (next && next.linked) {
      next.prev = b.hash;
      next.hash = calculateHash(next);
    }
  };

  Chain.prototype.mine = function (index) {
    var r = findNonce(this.blocks[index]);
    this.applyMined(index, r.nonce);
    return r;
  };

  return {
    DIFFICULTY: DIFFICULTY, REQUIRED_PREFIX: REQUIRED_PREFIX, GENESIS_PREV: GENESIS_PREV, KINDS: KINDS,
    sha256: sha256, createBlock: createBlock, serializeParts: serializeParts,
    canonicalBlockData: canonicalBlockData, calculateHash: calculateHash,
    validateBlock: validateBlock, validateBlockchain: validateBlockchain,
    mineChunk: mineChunk, findNonce: findNonce, Chain: Chain
  };
});
