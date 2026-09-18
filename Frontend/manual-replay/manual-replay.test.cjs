const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'manual-replay.html'), 'utf8');
const api = fs.readFileSync(path.join(__dirname, 'manual-replay-api.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, 'manual-replay.js'), 'utf8');

test('manual replay is standalone and does not require a strategy', () => {
  assert.match(html, /Manual Trading Replay/);
  assert.match(html, /NO STRATEGY/);
  assert.doesNotMatch(html, /strategy_id/);
  assert.match(api, /strategy-simulator\/manual-history/);
});

test('manual replay frontend contains no broker mutation endpoints', () => {
  const source = api + '\n' + app;
  for (const token of [
    'place_market_order',
    'close_position',
    'modify_position',
    '/live-handoff',
    '/set-active-ctrader-account',
    '/auto-trade',
  ]) {
    assert.equal(source.includes(token), false, token);
  }
});

test('manual replay exposes manual buy sell and close controls', () => {
  assert.match(html, /id="buyBtn"/);
  assert.match(html, /id="sellBtn"/);
  assert.match(html, /id="closeBtn"/);
  assert.match(app, /openManualTrade\('BUY'\)/);
  assert.match(app, /openManualTrade\('SELL'\)/);
});
