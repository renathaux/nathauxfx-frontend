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


test('Strategy Simulator adds adaptive pre-roll history', () => {
  const api = require('./strategy-simulator-api.js');
  assert.equal(
    api.warmupDaysFor({
      trading_timeframe: '5m',
      trend: { timeframe: '15m', methods: ['BOS_CHOCH', 'SWING_STRUCTURE'] },
    }),
    7
  );
  assert.ok(
    api.warmupDaysFor({
      trading_timeframe: '5m',
      trend: { timeframe: '4h', methods: ['EMA_200'] },
    }) >= 50
  );
});


test('five-year Fast Backtest ranges are split into safe monthly-size chunks', () => {
  const api = require('./strategy-simulator-api.js');
  const start = new Date('2021-09-21T00:00:00Z');
  const end = new Date('2026-09-21T00:00:00Z');
  const chunks = api.splitRange(start, end);
  assert.ok(chunks.length >= 58);
  assert.ok(chunks.length <= 61);
  for (const chunk of chunks) {
    const days = (chunk.end.getTime() - chunk.start.getTime()) / 86400000;
    assert.ok(days > 0 && days <= 31);
  }
});

test('multi-year Fast Backtest carries continuation between chunks', () => {
  const source = fs.readFileSync(apiPath, 'utf8');
  assert.match(source, /MAX_FAST_RANGE_DAYS = 5 \* 366/);
  assert.match(source, /continuation: continuation \|\| null/);
  assert.match(source, /batch_results: results/);
  assert.match(source, /Bar Replay is limited/);
});
