const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const apiPath = path.join(__dirname, '..', 'strategy-studio', 'strategy-studio-api.js');

test('Strategy Studio API wrapper exposes the CRUD endpoints', () => {
  const source = fs.readFileSync(apiPath, 'utf8');
  assert.match(source, /\/strategy-studio\/strategies/);
  assert.match(source, /\/strategy-studio\/validate/);
  assert.match(source, /activate/);
  assert.match(source, /deactivate/);
  assert.match(source, /clone/);
});

test('customer auth token and csrf are attached without LIVE execution endpoints', () => {
  const source = fs.readFileSync(apiPath, 'utf8');
  assert.match(source, /flowsignal_user_session_token/);
  assert.match(source, /flowsignal_csrf_token/);
  assert.match(source, /FlowSignalUser/);
  assert.doesNotMatch(source, /execute-live-order|place_market_order|live-auto-toggle/);
});
