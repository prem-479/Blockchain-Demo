// Acceptance + parity tests for the central blockchain logic.  Run:  node web/test/core.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const C = require('../blockchain-core.js');
const initial = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'initial-state.json'), 'utf8'));

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }
const clone = (x) => JSON.parse(JSON.stringify(x));
const chainOf = (page, kind) => new C.Chain(kind, clone(initial[page]));
const colours = (chain) => chain.validate().blocks.map((r) => (r.valid ? 'G' : 'R')).join('');

console.log('Parity vectors (shared with Java)');
const lines = fs.readFileSync(path.join(__dirname, '..', '..', 'shared-test-vectors', 'vectors.tsv'), 'utf8')
  .split('\n').filter((l) => l && !l.startsWith('#'));
for (const line of lines) {
  const [name, kind, linked, number, nonce, data, cbAmt, cbTo, txs, prev, expected] = line.split('\t');
  test('vector ' + name, () => {
    if (kind === 'raw') return assert.strictEqual(C.sha256(data), expected);
    const tx = txs ? txs.split(';').map((t) => { const [amount, from, to] = t.split(','); return { amount, from, to }; }) : [];
    const b = C.createBlock(kind, { linked: linked === 'true', number, nonce, data, prev, tx,
      coinbase: kind === 'coinbase' ? { amount: cbAmt, to: cbTo } : undefined });
    assert.strictEqual(C.calculateHash(b), expected);
  });
}

console.log('Reference-demo behaviour');
test('initial state: every chain on every page is GREEN', () => {
  for (const [page, kind] of [['block', 'data'], ['blockchain', 'data'], ['distributed', 'data'], ['tokens', 'tokens'], ['coinbase', 'coinbase']]) {
    const c = chainOf(page, kind);
    assert.ok(c.validate().valid, page);
  }
});
test('mining starts at nonce 0 and returns the FIRST valid nonce (72608 for block 1, empty data)', () => {
  const b = C.createBlock('data', { number: 1, linked: false });
  const r = C.findNonce(b);
  assert.strictEqual(r.nonce, 72608);
  for (let n = 0; n < 72608; n += 997) assert.ok(!C.sha256('1' + n).startsWith('0000'));
});
test('block -5 / nonce 8351 from the reference demo is green', () => {
  const c = new C.Chain('data', [{ number: -5, nonce: 8351, data: '', linked: false }]);
  assert.ok(c.validate().valid);
});

console.log('Acceptance tests (spec section 20)');
test('TEST 1  Block page: GREEN -> edit data RED -> Mine GREEN', () => {
  const c = chainOf('block', 'data');
  assert.strictEqual(colours(c), 'G');
  c.setField(0, 'data', 'Hello');
  assert.strictEqual(colours(c), 'R');
  assert.strictEqual(c.validate().blocks[0].reason, 'Proof of work not satisfied');
  c.mine(0);
  assert.strictEqual(colours(c), 'G');
});
test('TEST 2  edit Block 1 data -> Block 1..5 all RED (and Prev fields are NOT silently rewritten)', () => {
  const c = chainOf('blockchain', 'data');
  const oldHash1 = c.blocks[0].hash;
  c.setField(0, 'data', 'changed');
  assert.strictEqual(colours(c), 'RRRRR');
  assert.strictEqual(c.blocks[1].prev, oldHash1);            // no silent copy
  const r = c.validate().blocks;
  assert.strictEqual(r[1].reason, 'Previous hash mismatch');
  assert.strictEqual(r[2].reason, 'Previous block invalid');
});
test('TEST 3  mine Block 1 -> Block 1 GREEN, Block 2.. stay RED, nothing downstream auto-mined', () => {
  const c = chainOf('blockchain', 'data');
  const nonces = c.blocks.map((b) => b.nonce);
  c.setField(0, 'data', 'changed');
  c.mine(0);
  assert.strictEqual(colours(c), 'GRRRR');
  assert.deepStrictEqual(c.blocks.slice(1).map((b) => b.nonce), nonces.slice(1));
});
test('TEST 4  mine Block 2 -> GREEN; downstream still RED until mined one by one', () => {
  const c = chainOf('blockchain', 'data');
  c.setField(0, 'data', 'changed');
  c.mine(0); c.mine(1);
  assert.strictEqual(colours(c), 'GGRRR');
  c.mine(2); assert.strictEqual(colours(c), 'GGGRR');
  c.mine(3); assert.strictEqual(colours(c), 'GGGGR');
  c.mine(4); assert.strictEqual(colours(c), 'GGGGG');
});
test('TEST 5  tokens: edit a transaction in Block 2 -> Block 2..5 RED, Block 1 stays GREEN', () => {
  const c = chainOf('tokens', 'tokens');
  c.setField(1, 'tx.0.amount', '97.68');
  assert.strictEqual(colours(c), 'GRRRR');
  c.mine(1); assert.strictEqual(colours(c), 'GGRRR');
});
test('TEST 5b tokens: editing sender or recipient also invalidates', () => {
  for (const f of ['tx.1.from', 'tx.1.to']) {
    const c = chainOf('tokens', 'tokens');
    c.setField(0, f, 'Mallory');
    assert.strictEqual(colours(c), 'RRRRR', f);
  }
});
test('TEST 6  coinbase: change recipient in Block 3 -> 3..5 RED, 1..2 GREEN', () => {
  const c = chainOf('coinbase', 'coinbase');
  c.setField(2, 'coinbase.to', 'Mallory');
  assert.strictEqual(colours(c), 'GGRRR');
  c.mine(2); assert.strictEqual(colours(c), 'GGGRR');
});
test('TEST 6b coinbase: amount, tx, nonce and prev edits all invalidate', () => {
  for (const [f, v] of [['coinbase.amount', '101.00'], ['tx.0.amount', '11.00'], ['nonce', '1'], ['prev', 'abc']]) {
    const c = chainOf('coinbase', 'coinbase');
    c.setField(1, f, v);
    assert.strictEqual(colours(c).slice(0, 2), 'GR', f);
  }
});
test('TEST 7  peers are independent', () => {
  const [a, b, cc] = [1, 2, 3].map(() => chainOf('distributed', 'data'));
  a.setField(1, 'data', 'only peer A');
  assert.strictEqual(colours(a), 'GRRRR');
  assert.strictEqual(colours(b), 'GGGGG');
  assert.strictEqual(colours(cc), 'GGGGG');
});
test('TEST 8  manual nonce change that misses the difficulty -> RED; non-numeric nonce -> RED', () => {
  const c = chainOf('blockchain', 'data');
  c.setField(0, 'nonce', String(Number(c.blocks[0].nonce) + 1));
  assert.ok(!c.blocks[0].hash.startsWith('0000'));
  assert.strictEqual(colours(c), 'RRRRR');
  const d = chainOf('blockchain', 'data');
  d.setField(0, 'nonce', 'abc');
  assert.strictEqual(d.validate().blocks[0].reason, 'Invalid nonce');
});
test('TEST 9  manual Prev change is RED even when the hash still has four zeroes', () => {
  const c = chainOf('blockchain', 'data');
  c.setField(1, 'prev', 'deadbeef');
  c.mine(1);                                    // hash now starts with 0000
  const r = c.validate().blocks[1];
  assert.ok(r.proofOfWorkValid && r.hashCorrect);
  assert.ok(!r.previousHashValid);
  assert.ok(!r.valid);
  assert.strictEqual(r.reason, 'Previous hash mismatch');
});

console.log('Other rules');
test('correctly calculated != successfully mined (data "hello", nonce 123)', () => {
  const c = new C.Chain('data', [{ number: 1, nonce: 123, data: 'hello' }]);
  const r = c.validate().blocks[0];
  assert.ok(r.hashCorrect && !r.proofOfWorkValid && !r.valid);
});
test('condition A: a tampered displayed hash is never trusted', () => {
  const c = chainOf('blockchain', 'data');
  c.blocks[0].hash = 'f'.repeat(64);
  const r = c.validate().blocks[0];
  assert.ok(!r.hashCorrect && !r.valid);
  assert.strictEqual(r.reason, 'Hash mismatch');
  assert.strictEqual(colours(c), 'RRRRR');
});
test('condition D: genesis Prev must be 64 zeroes', () => {
  const c = chainOf('blockchain', 'data');
  c.setField(0, 'prev', '1' + '0'.repeat(63));
  assert.strictEqual(c.validate().blocks[0].reason, 'Proof of work not satisfied');   // hash input changed
  c.mine(0);                                                                           // PoW fixed, linkage still wrong
  const r = c.validate().blocks[0];
  assert.ok(r.proofOfWorkValid && !r.previousHashValid && !r.valid);
  assert.strictEqual(r.reason, 'Genesis previous hash mismatch');
});
test('changing the block number invalidates (hash input changes)', () => {
  const c = chainOf('block', 'data');
  c.setField(0, 'number', '2');
  assert.strictEqual(colours(c), 'R');
});
test('editing back to the original mined content is GREEN again (state is derived, not remembered)', () => {
  const c = chainOf('blockchain', 'data');
  c.setField(1, 'data', 'x'); assert.strictEqual(colours(c), 'GRRRR');
  c.setField(1, 'data', '');  assert.strictEqual(colours(c), 'GGGGG');
});
test('structure: bad amount / empty recipient is RED with "Invalid transaction data"', () => {
  const c = chainOf('tokens', 'tokens');
  c.setField(0, 'tx.0.amount', 'abc');
  assert.strictEqual(c.validate().blocks[0].reason, 'Invalid transaction data');
});

console.log('\n' + passed + ' tests passed');
