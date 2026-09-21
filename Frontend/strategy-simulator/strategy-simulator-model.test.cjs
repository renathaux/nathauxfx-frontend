const test = require('node:test');
const assert = require('node:assert/strict');

const Model = require('./strategy-simulator-model.js');

test('buildRunPayload preserves saved strategy id and FAST mode', () => {
  const payload = Model.buildRunPayload({
    strategyId: 'strat_123',
    symbol: 'EURUSD',
    start: '2026-09-01T00:00:00Z',
    end: '2026-09-02T00:00:00Z',
    mode: 'FAST',
  });
  assert.deepEqual(payload, {
    strategy_id: 'strat_123',
    symbol: 'EURUSD',
    start: '2026-09-01T00:00:00Z',
    end: '2026-09-02T00:00:00Z',
    mode: 'FAST',
    risk_override: null,
  });
});

test('buildRunPayload includes a temporary risk override without mutating source', () => {
  const source = { method: 'PERCENT_BALANCE', value: 0.5 };
  const payload = Model.buildRunPayload({
    strategyId: 'strat_123', symbol: 'XAUUSD',
    start: '2026-09-01T00:00:00Z', end: '2026-09-02T00:00:00Z',
    mode: 'REPLAY', riskOverride: source,
  });
  assert.deepEqual(payload.risk_override, source);
  assert.notEqual(payload.risk_override, source);
});

test('equityPoints maps balances into a stable svg coordinate range', () => {
  const points = Model.equityPoints([
    { trade: 0, balance: 10000 },
    { trade: 1, balance: 10100 },
    { trade: 2, balance: 9900 },
  ], 300, 120, 10);
  assert.equal(points.length, 3);
  for (const point of points) {
    assert.ok(point.x >= 10 && point.x <= 290);
    assert.ok(point.y >= 10 && point.y <= 110);
  }
});

test('replayFrame clamps index and reports progress', () => {
  const frames = [{ timestamp: 'a' }, { timestamp: 'b' }, { timestamp: 'c' }];
  assert.deepEqual(Model.replayFrame(frames, -2), { index: 0, total: 3, frame: frames[0] });
  assert.deepEqual(Model.replayFrame(frames, 99), { index: 2, total: 3, frame: frames[2] });
});

test('formatMetric handles money, percent, and unavailable values', () => {
  assert.equal(Model.formatMetric(123.456, 'money'), '$123.46');
  assert.equal(Model.formatMetric(52.345, 'percent'), '52.35%');
  assert.equal(Model.formatMetric(null, 'number'), '—');
});


test('buildRunPayload can carry the saved strategy definition without sharing references', () => {
  const definition = {
    schema_version: 1,
    symbols: ['EURUSD'],
    trading_timeframe: '5m',
  };
  const payload = Model.buildRunPayload({
    strategyId: 'strat_static',
    strategyName: 'Static Test',
    strategyDefinition: definition,
    symbol: 'EURUSD',
    start: '2026-09-01T00:00:00Z',
    end: '2026-09-02T00:00:00Z',
  });
  assert.equal(payload.strategy_name, 'Static Test');
  assert.deepEqual(payload.strategy_definition, definition);
  assert.notEqual(payload.strategy_definition, definition);
});


test('aggregateSimulationResults combines multi-chunk trades and diagnostics', () => {
  const chunks = [
    {
      starting_balance: 1000,
      symbol: 'EURUSD',
      mode: 'FAST',
      trades: [
        { resolved: true, pnl_dollars: 10, r: 1, outcome: 'TP2' },
      ],
      diagnostics: {
        candles_analyzed: 100,
        warmup_candles: 20,
        evaluations: 90,
        signals_emitted: 1,
        trades_opened: 1,
        open_trades_at_end: 0,
        no_setup_reasons: { BOS_CHOCH_REQUIRED: 80 },
        setup_details: [
          {
            setup_id: 'setup_a',
            passed_stages: ['trend', 'structure'],
            last_state: 'WAITING',
            last_reason: 'CONFIRMATION_PENDING',
            signaled: false,
          },
        ],
      },
      assumptions: { closed_candles_only: true },
    },
    {
      starting_balance: 1000,
      symbol: 'EURUSD',
      mode: 'FAST',
      trades: [
        { resolved: true, pnl_dollars: -10.1, r: -1, outcome: 'SL' },
      ],
      diagnostics: {
        candles_analyzed: 120,
        warmup_candles: 20,
        evaluations: 110,
        signals_emitted: 1,
        trades_opened: 1,
        open_trades_at_end: 0,
        no_setup_reasons: { BOS_CHOCH_REQUIRED: 100 },
        setup_details: [
          {
            setup_id: 'setup_a',
            passed_stages: ['confirmation', 'entry', 'risk'],
            last_state: null,
            last_reason: null,
            signaled: true,
          },
          {
            setup_id: 'setup_b',
            passed_stages: ['structure'],
            last_state: 'BLOCKED',
            last_reason: 'TREND_BOS_CHOCH_DISAGREES',
            signaled: false,
          },
        ],
      },
      assumptions: { closed_candles_only: true },
    },
  ];

  const result = Model.aggregateSimulationResults(chunks);
  assert.equal(result.batch_chunks, 2);
  assert.equal(result.trades.length, 2);
  assert.equal(result.metrics.total_resolved_trades, 2);
  assert.equal(result.metrics.ending_balance, 999.9);
  assert.equal(result.diagnostics.candles_analyzed, 220);
  assert.equal(result.diagnostics.warmup_candles, 20);
  assert.equal(result.diagnostics.setups_detected, 2);
  assert.equal(result.diagnostics.stage_pass_counts.structure, 2);
  assert.equal(result.diagnostics.stage_pass_counts.confirmation, 1);
  assert.equal(result.diagnostics.rejection_reasons.TREND_BOS_CHOCH_DISAGREES, 1);
  assert.equal(result.diagnostics.no_setup_reasons.BOS_CHOCH_REQUIRED, 180);
});
