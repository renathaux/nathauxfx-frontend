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
  assert.match(script, /\/strategy-lab\/replay/);
  assert.doesNotMatch(script, /place_market_order|execute-live-order|paper-auto-toggle|live-auto-toggle/);
  assert.match(script, /spread|broker execution/i);
});
