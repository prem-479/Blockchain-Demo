// Mines the seed chains (real proof of work, first valid nonce from 0) and writes web/initial-state.json.
// Also writes shared-test-vectors/vectors.tsv using Node's built-in crypto (independent of our SHA-256).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const C = require('../blockchain-core.js');
const seed = require('./seed.js');

const kinds = { block: 'data', blockchain: 'data', distributed: 'data', tokens: 'tokens', coinbase: 'coinbase' };
const state = {};
for (const page of Object.keys(seed)) {
  const chain = new C.Chain(kinds[page], seed[page]);
  chain.blocks.forEach((b, i) => {
    if (b.linked && i > 0) { b.prev = chain.blocks[i - 1].hash; b.hash = C.calculateHash(b); }
    chain.mine(i);
  });
  const v = chain.validate();
  if (!v.valid) throw new Error('seed chain not valid: ' + page);
  state[page] = chain.blocks;
  console.log(page, chain.blocks.map((b) => b.nonce).join(' '));
}
fs.writeFileSync(path.join(__dirname, '..', 'initial-state.json'), JSON.stringify(state));

// ---- shared test vectors (JS + Java both read this file) -------------------------------
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const Z = C.GENESIS_PREV;
const enc = (txs) => txs.map((t) => [t.amount, t.from, t.to].join(',')).join(';');
const rows = [];
const add = (name, kind, linked, number, nonce, data, cbAmt, cbTo, txs, prev) => {
  const b = C.createBlock(kind, { linked, number, nonce, data, prev,
    coinbase: kind === 'coinbase' ? { amount: cbAmt, to: cbTo } : undefined, tx: txs });
  rows.push([name, kind, linked, number, nonce, data, cbAmt, cbTo, enc(txs), prev, C.calculateHash(b)].join('\t'));
};
rows.push(['raw-empty', 'raw', 'true', '', '', '', '', '', '', '', sha('')].join('\t'));
rows.push(['raw-screenshot', 'raw', 'true', '', '', 'fdfdfsdsd', '', '', '', '', sha('fdfdfsdsd')].join('\t'));
rows.push(['raw-unicode', 'raw', 'true', '', '', '\u00e9\u20ac\ud83d\ude00 hello', '', '', '', '', sha('\u00e9\u20ac\ud83d\ude00 hello')].join('\t'));
add('block-page-1', 'data', false, '1', '72608', '', '', '', [], '');
add('block-page-neg5', 'data', false, '-5', '8351', '', '', '', [], '');
const c = state.blockchain;
c.slice(0, 3).forEach((b, i) => add('chain-b' + (i + 1), 'data', true, b.number, b.nonce, b.data, '', '', [], b.prev));
add('chain-with-data', 'data', true, '2', '7', 'Hello', '', '', [], state.blockchain[0].hash);
state.tokens.slice(0, 2).forEach((b, i) => add('tokens-b' + (i + 1), 'tokens', true, b.number, b.nonce, '', '', '', b.tx, b.prev));
state.coinbase.slice(0, 3).forEach((b, i) => add('coinbase-b' + (i + 1), 'coinbase', true, b.number, b.nonce, '', b.coinbase.amount, b.coinbase.to, b.tx, b.prev));
add('unmined-nonce-0', 'data', true, '1', '0', 'Hello', '', '', [], Z);
fs.writeFileSync(path.join(__dirname, '..', '..', 'shared-test-vectors', 'vectors.tsv'),
  '# name\tkind\tlinked\tnumber\tnonce\tdata\tcbAmount\tcbTo\ttxs(amount,from,to;...)\tprev\texpectedHash\n' + rows.join('\n') + '\n');
console.log('vectors:', rows.length);
