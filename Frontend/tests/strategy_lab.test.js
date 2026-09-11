const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('Strategy Lab page exposes only replay controls and result fields', () => {
  const html = fs.readFileSync(path.join(root, 'strategy-lab.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'strategy-lab.js'), 'utf8');
  assert.match(html, /Strategy Lab/);
  assert.match(html, /baseline_v1/);
  assert.match(html, /v2_m5_quality/);
  assert.match(html, /v2a_m5_quality_50_30/);
  assert.match(html, /v2b_m5_quality_45_35/);
  assert.match(html, /v2c_m15_quality_60_30/);
  assert.match(html, /v3_m5_two_close/);
  assert.match(html, /v3a_m5_bos_body_50/);
  assert.match(script, /\/strategy-lab\/replay/);
  assert.match(script, /credentials:\s*["']include["']/);
  assert.match(script, /FlowSignalUser/);
  assert.match(script, /Running deterministic replay/);
  assert.match(script, /Replay unavailable/);
  assert.match(script, /No simulated trades in this range/);
  assert.match(script, /negative-r/);
  assert.match(script, /positive-r/);
  assert.match(script, /result-.*ambiguous|replaceAll\(["']_["']/);
  assert.match(script, /result-.*unresolved|trade\.result/);
  assert.doesNotMatch(script, /place_market_order|execute-live-order|paper-auto-toggle|live-auto-toggle/);
  assert.match(script, /spread|broker execution/i);
});

test('Strategy Lab requests are included in the established admin authorization path', () => {
  const client = fs.readFileSync(path.join(root, 'apiClient.js'), 'utf8');
  assert.match(client, /pathname\.startsWith\(["']\/strategy-lab\/["']\)/);
  assert.match(client, /Authorization/);
  assert.doesNotMatch(client, /STRATEGY_LAB_SECRET|strategyLabSecret/);
});
