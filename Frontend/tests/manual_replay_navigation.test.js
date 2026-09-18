const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontend = path.join(__dirname, '..');

function element() {
  const classes = new Set();
  const attributes = new Map();
  return {
    classList: {
      add: (value) => classes.add(value),
      remove: (value) => classes.delete(value),
      contains: (value) => classes.has(value),
    },
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
    getAttribute: (name) => attributes.get(name) ?? null,
  };
}

test('Manual Replay is a real link in the shared desktop/mobile sidebar', () => {
  const html = fs.readFileSync(path.join(frontend, 'app.html'), 'utf8');
  const sidebar = html.match(/<div id="sideMenu"[\s\S]*?<div class="header-frame/);
  assert.ok(sidebar, 'shared sidebar exists');
  assert.match(sidebar[0], /<a\b[^>]*id="menuManualReplayBtn"[^>]*href="\/manual-replay"[^>]*class="menu-row"/);
  assert.ok(sidebar[0].indexOf('menuPaperBtn') < sidebar[0].indexOf('menuManualReplayBtn'));
  assert.ok(sidebar[0].indexOf('menuManualReplayBtn') < sidebar[0].indexOf('menuFeedbackBtn'));
});

test('phone drawer offers the same Manual Replay destination', () => {
  const html = fs.readFileSync(path.join(frontend, 'mobile.html'), 'utf8');
  const drawer = html.match(/<nav class="desktop-menu-list"[\s\S]*?<\/nav>/);
  assert.ok(drawer, 'phone full-menu drawer exists');
  assert.match(drawer[0], /<a\b[^>]*href="\/manual-replay"[^>]*>[^<]*<span[^>]*>↺<\/span><strong>Manual Replay<\/strong><\/a>/);
});

test('standalone replay navigation keeps Studio and Simulator links beside an active Replay link', () => {
  const html = fs.readFileSync(path.join(frontend, 'manual-replay.html'), 'utf8');
  assert.match(html, /id="manualReplayNavLink"[^>]*href="\/manual-replay"/);
  assert.match(html, /href="\/strategy-simulator\.html"/);
  assert.match(html, /href="\/strategy-studio\.html"/);
});

test('Manual Replay highlights only its own route and nested routes', () => {
  const navigation = require('../manual-replay/manual-replay-navigation.js');
  const sidebar = element();
  const replay = element();
  const nodes = { menuManualReplayBtn: sidebar, manualReplayNavLink: replay };
  const document = { getElementById: (id) => nodes[id] || null };

  for (const pathname of ['/manual-replay', '/manual-replay/', '/manual-replay/session/123']) {
    navigation.sync(document, pathname);
    for (const node of [sidebar, replay]) {
      assert.equal(node.classList.contains('is-active'), true, pathname);
      assert.equal(node.getAttribute('aria-current'), 'page', pathname);
    }
  }

  for (const pathname of ['/app.html', '/strategy-studio.html', '/strategy-simulator.html', '/manual-replay-other']) {
    navigation.sync(document, pathname);
    for (const node of [sidebar, replay]) {
      assert.equal(node.classList.contains('is-active'), false, pathname);
      assert.equal(node.getAttribute('aria-current'), null, pathname);
    }
  }
});
