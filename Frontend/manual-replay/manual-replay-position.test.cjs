const test = require('node:test');
const assert = require('node:assert/strict');

const Position = require('./manual-replay-position.js');

test('creates a long draft around the fixed current close', () => {
  const draft = Position.createPositionDraft({
    side: 'BUY', entry: 100, visibleLow: 90, visibleHigh: 110, minimumDisplayDistance: 1,
  });
  assert.deepEqual(draft, { side: 'BUY', entry: 100, sl: 96, tp: 108 });
  assert.ok(draft.sl < draft.entry && draft.entry < draft.tp);
});

test('creates a short draft around the fixed current close', () => {
  const draft = Position.createPositionDraft({
    side: 'SELL', entry: 100, visibleLow: 90, visibleHigh: 110, minimumDisplayDistance: 1,
  });
  assert.deepEqual(draft, { side: 'SELL', entry: 100, sl: 104, tp: 92 });
  assert.ok(draft.tp < draft.entry && draft.entry < draft.sl);
});

test('blank levels are invalid and never interpreted as zero', () => {
  assert.equal(Position.parseOptionalPrice(''), null);
  assert.equal(Position.parseOptionalPrice('   '), null);
  assert.equal(Position.parseOptionalPrice('0'), 0);
  const metrics = Position.calculatePositionMetrics({
    draft: { side: 'BUY', entry: 100, sl: '', tp: 120 },
    riskMethod: 'PERCENT', riskValue: 1, balance: 10000,
  });
  assert.equal(metrics.valid, false);
  assert.equal(metrics.riskDistance, null);
});

test('calculates long and short reward-to-risk from literal prices', () => {
  for (const draft of [
    { side: 'BUY', entry: 100, sl: 90, tp: 120 },
    { side: 'SELL', entry: 100, sl: 110, tp: 80 },
  ]) {
    const metrics = Position.calculatePositionMetrics({
      draft, riskMethod: 'PERCENT', riskValue: 1, balance: 10000,
    });
    assert.equal(metrics.valid, true);
    assert.equal(metrics.riskDistance, 10);
    assert.equal(metrics.rewardDistance, 20);
    assert.equal(metrics.rr, 2);
    assert.equal(metrics.riskDollars, 100);
    assert.equal(metrics.rewardDollars, 200);
  }
});

test('fixed-dollar risk remains fixed', () => {
  const metrics = Position.calculatePositionMetrics({
    draft: { side: 'BUY', entry: 100, sl: 90, tp: 120 },
    riskMethod: 'FIXED', riskValue: 75, balance: 10000,
  });
  assert.equal(metrics.riskDollars, 75);
  assert.equal(metrics.rewardDollars, 150);
});

test('direction validation clamps SL and TP to the valid side of entry', () => {
  const long = { side: 'BUY', entry: 100, sl: 90, tp: 120 };
  assert.equal(Position.validatePositionLevel(long, 'sl', 105, 0.5), 99.5);
  assert.equal(Position.validatePositionLevel(long, 'tp', 95, 0.5), 100.5);
  const short = { side: 'SELL', entry: 100, sl: 110, tp: 80 };
  assert.equal(Position.validatePositionLevel(short, 'sl', 95, 0.5), 100.5);
  assert.equal(Position.validatePositionLevel(short, 'tp', 105, 0.5), 99.5);
});

test('visible candle scale ignores far-away position levels', () => {
  const candles = [
    { open: 99, high: 101, low: 98, close: 100 },
    { open: 100, high: 103, low: 99, close: 102 },
  ];
  const scale = Position.visibleCandleScale(candles);
  assert.equal(scale.rawLow, 98);
  assert.equal(scale.rawHigh, 103);
  assert.ok(scale.low > 90);
  assert.ok(scale.high < 110);
  assert.equal(Position.clampPriceToScale(0, scale), scale.low);
  assert.equal(Position.clampPriceToScale(500, scale), scale.high);
});

test('ticket edits replace the matching draft level and preserve fixed entry', () => {
  const original = { side: 'BUY', entry: 100, sl: 90, tp: 120 };
  const updated = Position.updateDraftLevel(original, 'sl', '95', 0.5);
  assert.deepEqual(updated, { side: 'BUY', entry: 100, sl: 95, tp: 120 });
  assert.deepEqual(original, { side: 'BUY', entry: 100, sl: 90, tp: 120 });
});

test('blank ticket edit stays blank instead of becoming zero', () => {
  const original = { side: 'BUY', entry: 100, sl: 90, tp: 120 };
  assert.deepEqual(Position.updateDraftLevel(original, 'sl', '', 0.5), {
    side: 'BUY', entry: 100, sl: null, tp: 120,
  });
});

test('opening a draft creates only its matching virtual side at current close', () => {
  const buy = Position.createVirtualTrade({
    draft: { side: 'BUY', entry: 100, sl: 90, tp: 120 },
    currentClose: 101,
    entryIndex: 8,
    entryTime: '2026-09-19T12:00:00.000Z',
    riskDollars: 100,
    tradeId: 'manual_test',
  });
  assert.deepEqual(buy, {
    tradeId: 'manual_test', side: 'BUY', entryIndex: 8,
    entryTime: '2026-09-19T12:00:00.000Z', entry: 101,
    sl: 90, tp: 120, riskDollars: 100,
  });
  assert.throws(() => Position.createVirtualTrade({
    draft: { side: 'SELL', entry: 100, sl: 110, tp: 80 },
    requestedSide: 'BUY', currentClose: 100, entryIndex: 8,
    entryTime: '2026-09-19T12:00:00.000Z', riskDollars: 100,
  }), /does not match/);
});
