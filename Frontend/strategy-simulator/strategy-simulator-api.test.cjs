const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const apiPath = path.join(__dirname, 'strategy-simulator-api.js');

test('Strategy Simulator loads candle history from static replay files', () => {
  const source = fs.readFileSync(apiPath, 'utf8');
  assert.match(source, /\/replay-data/);
  assert.match(source, /manifest\.json/);
  assert.match(source, /candles_5m/);
  assert.doesNotMatch(source, /strategy-simulator\/manual-history/);
});

test('Strategy Simulator still posts only to the read-only simulator endpoint', () => {
  const source = fs.readFileSync(apiPath, 'utf8');
  assert.match(source, /\/strategy-simulator\/run/);
  assert.doesNotMatch(
    source,
    /place_market_order|modify_position|close_position|live-auto-toggle/
  );
});
