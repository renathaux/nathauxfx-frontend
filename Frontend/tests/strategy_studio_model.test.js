const test = require('node:test');
const assert = require('node:assert/strict');
const StudioModel = require('../strategy-studio/strategy-studio-model.js');

test('new strategy is blank except fixed structural scaffolding', () => {
  const value = StudioModel.blankStrategy();
  assert.deepEqual(value.symbols, []);
  assert.equal(value.trading_timeframe, null);
  assert.equal(value.structure.trigger, 'BOS_CHOCH');
  assert.equal(value.entry.method, null);
  assert.equal(value.risk.method, null);
  assert.equal(value.fundamentals.mode, 'BLOCK_OPPOSITE');
});

test('trend timeframe options are strictly higher', () => {
  assert.deepEqual(StudioModel.trendTimeframeOptions('5m'), ['15m', '1h', '4h']);
  assert.deepEqual(StudioModel.trendTimeframeOptions('15m'), ['1h', '4h']);
  assert.deepEqual(StudioModel.trendTimeframeOptions('1h'), ['4h']);
  assert.deepEqual(StudioModel.trendTimeframeOptions(null), []);
});

test('conditional fields follow selected methods', () => {
  const value = StudioModel.blankStrategy();
  value.stop_loss.method = 'LAST_SWING';
  value.tp1.enabled = true;
  value.structure.break_validation = ['MIN_BODY_PERCENT', 'MIN_DISTANCE'];
  value.confirmation.rules = ['MIN_BODY_PERCENT'];
  const visible = StudioModel.visibleFields(value);
  assert.equal(visible.stopBuffer, true);
  assert.equal(visible.fixedStopDistance, false);
  assert.equal(visible.tp1, true);
  assert.equal(visible.breakBody, true);
  assert.equal(visible.breakDistance, true);
  assert.equal(visible.confirmationBody, true);
});

test('all trend methods expand before API save', () => {
  const value = StudioModel.blankStrategy();
  value.trend.methods = ['ALL'];
  const normalized = StudioModel.normalizeForApi(value);
  assert.deepEqual(normalized.trend.methods, ['BOS_CHOCH', 'EMA_50', 'EMA_200', 'SWING_STRUCTURE']);
});

test('client validation reports field-specific missing requirements', () => {
  const errors = StudioModel.clientValidation(StudioModel.blankStrategy());
  assert.ok(errors.symbols);
  assert.ok(errors.trading_timeframe);
  assert.ok(errors['entry.method']);
  assert.ok(errors['stop_loss.method']);
  assert.ok(errors['tp2.method']);
  assert.ok(errors['risk.method']);
});

test('confirmation close requires at least one confirmation rule', () => {
  const value = validDraft();
  value.entry.method = 'CONFIRMATION_CLOSE';
  value.confirmation.rules = [];
  assert.ok(StudioModel.clientValidation(value)['entry.method']);
});

test('live summary renders partial strategy without requiring save validity', () => {
  const value = StudioModel.blankStrategy();
  value.trading_timeframe = '5m';
  value.structure.break_validation = ['CLOSE_BEYOND'];
  value.entry.method = 'BOS_CHOCH_CLOSE';
  const summary = StudioModel.buildSummary(value);
  assert.match(summary, /5m BOS\/CHOCH/);
  assert.match(summary, /close beyond level/);
  assert.match(summary, /BOS\/CHOCH close/);
});

test('valid draft has no client errors', () => {
  assert.deepEqual(StudioModel.clientValidation(validDraft()), {});
});

function validDraft() {
  return {
    schema_version: 1,
    symbols: ['EURUSD'],
    trading_timeframe: '5m',
    trend: { timeframe: null, methods: [] },
    structure: {
      trigger: 'BOS_CHOCH',
      break_validation: ['CLOSE_BEYOND'],
      minimum_body_percent: null,
      minimum_distance_pips: null,
    },
    confirmation: { rules: [], minimum_body_percent: null },
    entry: { method: 'BOS_CHOCH_CLOSE' },
    stop_loss: { method: 'LAST_SWING', buffer_pips: null, fixed_distance: null },
    tp1: { enabled: false, target_r: null, close_percent: null, protection_r: null },
    tp2: { method: 'FIXED_R', value: 2 },
    risk: { method: 'PERCENT_BALANCE', value: 1 },
  };
}


test('legacy saved strategy defaults to block-opposite fundamentals', () => {
  const value = validDraft();
  delete value.fundamentals;
  const normalized = StudioModel.normalizeForApi(value);
  assert.deepEqual(normalized.fundamentals, { mode: 'BLOCK_OPPOSITE' });
});

test('fundamental policy appears in live summary', () => {
  const value = validDraft();
  value.fundamentals = { mode: 'REQUIRE_ALIGNMENT' };
  assert.match(StudioModel.buildSummary(value), /LIVE fundamentals require alignment/);
});


test('TP1 percentage helpers convert to and from stored R values', () => {
  assert.equal(StudioModel.percentToR(70), 0.7);
  assert.equal(StudioModel.percentToR(20), 0.2);
  assert.equal(StudioModel.rToPercent(0.7), 70);
  assert.equal(StudioModel.rToPercent(0.2), 20);
  assert.equal(StudioModel.percentToR(null), null);
  assert.equal(StudioModel.rToPercent(null), null);
});

test('TP1 summary uses percentages instead of R labels', () => {
  const value = validDraft();
  value.tp1 = {
    enabled: true,
    target_r: 0.7,
    close_percent: 40,
    protection_r: 0.2,
  };
  const summary = StudioModel.buildSummary(value);
  assert.match(summary, /TP1 70% of SL/);
  assert.match(summary, /close 40%/);
  assert.match(summary, /protect \+20% of SL/);
  assert.doesNotMatch(summary, /0\.7R|0\.2R/);
});
