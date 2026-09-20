const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const moduleUrl = pathToFileURL(
  path.join(__dirname, '..', '..', 'scripts', 'update-replay-data.mjs')
).href;

test('replay updater canonicalizes, deduplicates, and sorts candles', async () => {
  const mod = await import(moduleUrl);
  const rows = [
    { timestamp: '2026-09-01T00:05:00Z', open: 2, high: 3, low: 1, close: 2.5, volume: 5 },
    { timestamp: '2026-09-01T00:00:00Z', open: 1, high: 2, low: 0.5, close: 1.5, volume: 4 },
    { timestamp: '2026-09-01T00:05:00Z', open: 2.1, high: 3.1, low: 1.1, close: 2.6, volume: 6 },
  ];
  const candles = mod.canonicalCandles(rows);
  assert.equal(candles.length, 2);
  assert.equal(candles[0].timestamp, '2026-09-01T00:00:00.000Z');
  assert.equal(candles[1].open, 2.1);
});

test('replay updater rejects malformed OHLC rows', async () => {
  const mod = await import(moduleUrl);
  const candles = mod.canonicalCandles([
    { timestamp: '2026-09-01T00:00:00Z', open: 2, high: 1, low: 0.5, close: 2 },
  ]);
  assert.equal(candles.length, 0);
});

test('five-year month sequence is deterministic and monthly', async () => {
  const mod = await import(moduleUrl);
  const months = mod.monthSequence(
    new Date('2021-09-01T00:00:00Z'),
    new Date('2026-09-20T00:00:00Z'),
  );
  assert.equal(mod.monthKey(months[0]), '2021-09');
  assert.equal(mod.monthKey(months.at(-1)), '2026-09');
  assert.equal(months.length, 61);
});

test('history requests stay inside backend 62-day safety bound', async () => {
  const mod = await import(moduleUrl);
  assert.equal(
    mod.requestedDays(
      new Date('2026-08-01T00:00:00Z'),
      new Date('2026-09-01T00:00:00Z'),
    ),
    31,
  );
  assert.equal(
    mod.requestedDays(
      new Date('2026-01-01T00:00:00Z'),
      new Date('2026-04-01T00:00:00Z'),
    ),
    62,
  );
});
