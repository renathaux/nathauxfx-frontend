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
  assert.match(api, /STATIC_ROOT = '\/replay-data'/);
  assert.doesNotMatch(api, /strategy-simulator\/manual-history/);
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

test('manual replay exposes one synchronized long or short draft ticket', () => {
  for (const id of [
    'longPositionBtn', 'shortPositionBtn', 'cancelPositionBtn',
    'draftDirection', 'draftEntry', 'draftRr', 'draftRisk', 'draftReward',
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /OPEN BUY/);
  assert.match(html, /OPEN SELL/);
  assert.match(html, /manual-replay-position\.js/);
});


test('manual replay static history does not require backend auth', () => {
  assert.doesNotMatch(api, /restoreStandaloneAuth/);
  assert.doesNotMatch(api, /flowsignal_session_token/);
  assert.doesNotMatch(api, /\/api\/proxy/);
  assert.match(api, /fetchJson/);
  assert.match(api, /STATIC_REPLAY_HISTORY/);
});
