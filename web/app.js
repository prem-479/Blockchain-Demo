/*
 * app.js: the UI is a VIEW of chain state (docs/BLOCKCHAIN_BEHAVIOR.md).
 *
 *   edit / mine  ->  mutate state (Chain)  ->  refresh(): validate -> render -> apply class
 *
 * refresh() is the ONLY place that sets .block-valid / .block-invalid, and it asks the ONE
 * validator (BlockchainCore.validateBlockchain via Chain.validate). No button handler
 * ever "makes a block green".
 */
(function () {
  'use strict';
  var C = window.BlockchainCore;
  var INITIAL = JSON.parse(document.getElementById('initial-state').textContent);
  var main = document.getElementById('main');
  var uid = 0;

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function el(tag, props, children) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'class') n.className = props[k];
      else if (k === 'text') n.textContent = props[k];
      else n.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }

  function getPath(b, path) {
    var p = path.split('.');
    if (p.length === 1) return b[p[0]];
    if (p[0] === 'coinbase') return b.coinbase[p[1]];
    return b.tx[Number(p[1])][p[2]];
  }

  /* ------------------------------------------------------------ chain view */
  function createChainView(kind, initialBlocks, opts) {
    var chain = new C.Chain(kind, clone(initialBlocks));
    var id = 'c' + (++uid);
    var root = el('div', { class: opts.single ? '' : 'chain-row' });
    var ctx = { chain: chain, id: id, blocks: [], mineToken: [] };

    function input(path, i, extra) {
      var a = { class: 'control', type: 'text', id: id + '-' + i + '-' + path.replace(/\./g, '-'),
        autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', 'data-path': path };
      Object.keys(extra || {}).forEach(function (k) { a[k] = extra[k]; });
      return el('input', a);
    }
    function addon(text) { return el('span', { class: 'addon', text: text }); }
    function row(label, forId, control) {
      return el('div', { class: 'row' }, [
        forId ? el('label', { for: forId, text: label }) : el('span', { class: 'label', text: label }),
        control
      ]);
    }

    chain.blocks.forEach(function (blk, i) {
      var panel = el('div', { class: 'block' + (opts.single ? ' wide' : ''), role: 'group', 'data-index': String(i) });
      var fields = [];                                    // {node, path}
      var bind = function (node, path) { fields.push({ node: node, path: path }); return node; };

      var num = bind(input('number', i), 'number');
      panel.appendChild(row('Block:', num.id, el('div', { class: 'group' }, [addon('#'), num])));
      var nonce = bind(input('nonce', i), 'nonce');
      panel.appendChild(row('Nonce:', nonce.id, nonce));

      if (kind === 'data') {
        var ta = bind(el('textarea', { class: 'control', id: id + '-' + i + '-data', 'data-path': 'data',
          spellcheck: 'false' }), 'data');
        panel.appendChild(row('Data:', ta.id, ta));
      }
      if (kind === 'coinbase') {
        var ca = bind(input('coinbase.amount', i, { 'aria-label': 'Coinbase amount' }), 'coinbase.amount');
        var ct = bind(input('coinbase.to', i, { 'aria-label': 'Coinbase recipient' }), 'coinbase.to');
        panel.appendChild(row('Coinbase:', ca.id, el('div', { class: 'group' }, [addon('$'), ca, addon('->'), ct])));
      }
      if (kind === 'tokens' || kind === 'coinbase') {
        var list = el('div', { class: 'txlist' });
        blk.tx.forEach(function (_, t) {
          var n = t + 1;
          var amt = bind(input('tx.' + t + '.amount', i, { 'aria-label': 'Transaction ' + n + ' amount' }), 'tx.' + t + '.amount');
          var frm = bind(input('tx.' + t + '.from', i, { 'aria-label': 'Transaction ' + n + ' sender' }), 'tx.' + t + '.from');
          var to = bind(input('tx.' + t + '.to', i, { 'aria-label': 'Transaction ' + n + ' recipient' }), 'tx.' + t + '.to');
          list.appendChild(el('div', { class: 'group' }, [addon('$'), amt, addon('From:'), frm, addon('->'), to]));
        });
        panel.appendChild(row('Tx:', null, list));
      }
      if (blk.linked) {
        var prev = bind(input('prev', i), 'prev');
        panel.appendChild(row('Prev:', prev.id, prev));
      }
      var hash = el('input', { class: 'control', type: 'text', readonly: 'readonly', id: id + '-' + i + '-hash' });
      panel.appendChild(row('Hash:', hash.id, hash));
      var btn = el('button', { class: 'btn-mine', type: 'button', text: 'Mine' });
      panel.appendChild(row('', null, el('div', {}, [btn])));

      ctx.blocks.push({ panel: panel, fields: fields, hash: hash, button: btn });
      ctx.mineToken.push(0);
      root.appendChild(panel);
    });

    /* edits: mutate state -> recalculate hash (inside setField) -> refresh */
    root.addEventListener('input', function (e) {
      var t = e.target;
      var path = t.getAttribute && t.getAttribute('data-path');
      if (!path) return;
      var i = Number(t.closest('.block').getAttribute('data-index'));
      ctx.mineToken[i]++;                                 // an edit cancels a mining run in progress
      chain.setField(i, path, t.value);
      refresh(ctx);
    });

    /* Mine: real proof of work from nonce 0; then update state; then refresh() decides the colour */
    root.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.btn-mine');
      if (!btn || btn.disabled) return;
      mine(ctx, Number(btn.closest('.block').getAttribute('data-index')));
    });

    refresh(ctx);
    return { root: root, ctx: ctx };
  }

  /** Render state -> DOM, then colour from the central validator. Nothing else may touch the classes. */
  function refresh(ctx) {
    var validation = ctx.chain.validate();
    ctx.chain.blocks.forEach(function (b, i) {
      var v = ctx.blocks[i];
      v.fields.forEach(function (f) {
        var value = getPath(b, f.path);
        if (f.node.value !== value) f.node.value = value;
      });
      if (v.hash.value !== b.hash) v.hash.value = b.hash;
      var valid = validation.blocks[i].valid;
      v.panel.classList.toggle('block-valid', valid);
      v.panel.classList.toggle('block-invalid', !valid);
      v.panel.setAttribute('aria-label', 'Block ' + b.number + (valid ? ', valid' : ', invalid'));
    });
  }

  /** Chunked so the page stays responsive; every hash is a genuine attempt (no sleeping, no shortcuts). */
  function mine(ctx, i) {
    var v = ctx.blocks[i];
    var block = ctx.chain.blocks[i];
    var token = ++ctx.mineToken[i];
    var nonce = 0;
    v.button.disabled = true;
    (function step() {
      if (ctx.mineToken[i] !== token) { v.button.disabled = false; return; }   // edited meanwhile: abandon
      var t0 = performance.now(), r;
      do {
        r = C.mineChunk(block, nonce, 1000);
        nonce = r.next;
      } while (!r.found && performance.now() - t0 < 25);
      if (r.found) {
        ctx.chain.applyMined(i, r.nonce);
        v.button.disabled = false;
        refresh(ctx);
        return;
      }
      setTimeout(step, 0);
    })();
  }

  /* ------------------------------------------------------------ hash page */
  function buildHashPage() {
    var ta = el('textarea', { class: 'control', id: 'hash-data', spellcheck: 'false' });
    var out = el('input', { class: 'control', type: 'text', readonly: 'readonly', id: 'hash-out' });
    function update() { out.value = C.sha256(ta.value); }
    ta.addEventListener('input', update);
    update();
    var well = el('div', { class: 'well wide' }, [
      el('div', { class: 'row' }, [el('label', { for: 'hash-data', text: 'Data:' }), ta]),
      el('div', { class: 'row' }, [el('label', { for: 'hash-out', text: 'Hash:' }), out])
    ]);
    return { title: 'SHA256 Hash', narrow: true, nodes: [well] };
  }

  /* ---------------------------------------------------------------- pages */
  function buildBlockPage() {
    var view = createChainView('data', INITIAL.block, { single: true });
    return { title: 'Block', narrow: true, nodes: [view.root] };
  }
  function buildSingleChainPage(title, kind, key) {
    var view = createChainView(kind, INITIAL[key], {});
    return { title: title, narrow: false, nodes: [view.root] };
  }
  function buildPeerPage(title, kind, key) {
    var nodes = [];
    ['A', 'B', 'C'].forEach(function (name) {       // each peer owns an independent copy of the state
      nodes.push(el('h2', { class: 'peer', text: 'Peer ' + name }));
      nodes.push(createChainView(kind, INITIAL[key], {}).root);
    });
    return { title: title, narrow: false, nodes: nodes };
  }

  var builders = {
    hash: buildHashPage,
    block: buildBlockPage,
    blockchain: function () { return buildSingleChainPage('Blockchain', 'data', 'blockchain'); },
    distributed: function () { return buildPeerPage('Distributed Blockchain', 'data', 'distributed'); },
    tokens: function () { return buildPeerPage('Tokens', 'tokens', 'tokens'); },
    coinbase: function () { return buildPeerPage('Coinbase Transactions', 'coinbase', 'coinbase'); }
  };
  var built = {};

  function route() {
    var key = (location.hash.replace(/^#\/?/, '') || 'hash');
    if (!builders[key]) key = 'hash';
    if (!built[key]) {
      var page = builders[key]();
      var section = el('div', { class: 'page' + (page.narrow ? ' narrow' : '') }, [el('h1', { text: page.title })]);
      page.nodes.forEach(function (n) { section.appendChild(n); });
      built[key] = section;
    }
    main.replaceChildren(built[key]);
    document.querySelectorAll('.navbar li a').forEach(function (a) {
      if (a.getAttribute('href') === '#/' + key) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  window.addEventListener('hashchange', route);
  route();
})();
