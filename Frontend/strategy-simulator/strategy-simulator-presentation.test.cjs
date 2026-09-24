const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('./strategy-simulator-presentation.js');
const trades = [
  {
    side: 'BUY',
    resolved: true,
    exit_time: '2025-01-01T00:30:00Z',
    entry_time: '2024-12-31T23:00:00Z',
    pnl_dollars: 100,
    r: 2,
    outcome: 'TP2',
  },
  {
    side: 'SELL',
    resolved: true,
    exit_time: '2025-02-01T00:00:00Z',
    pnl_dollars: -50,
    r: -1,
    outcome: 'SL',
  },
  {
    side: 'BUY',
    resolved: true,
    exit_time: '2026-01-01T00:00:00Z',
    pnl_dollars: 0,
    r: 0,
    outcome: 'PROTECTED_SL',
  },
  {
    side: 'SELL',
    resolved: false,
    exit_time: '2026-01-01T00:00:00Z',
    pnl_dollars: null,
    r: null,
    outcome: 'AMBIGUOUS_INTRABAR',
  },
];
test('yearly display aggregates only resolved trades by UTC exit year', () => {
  const [a, b] = P.breakdowns(trades).years;
  assert.deepEqual(a, {
    key: '2025',
    trades: 2,
    net: 50,
    winRate: 50,
    averageR: 0.5,
  });
  assert.equal(b.trades, 1);
  assert.equal(b.winRate, 0);
  assert.deepEqual(P.breakdowns([]).years, []);
});
test('direction display includes break-even in denominator and excludes unresolved', () => {
  const [a, b] = P.breakdowns(trades).directions;
  assert.deepEqual(a, {
    key: 'BUY',
    trades: 2,
    net: 100,
    winRate: 50,
    averageR: 1,
  });
  assert.equal(b.net, -50);
  assert.equal(b.trades, 1);
  assert.equal(P.breakdowns([]).directions[0].averageR, null);
});
test('trade filters preserve raw rows and unresolved rows only in All', () => {
  assert.deepEqual(P.filterTrades(trades, 'All'), trades);
  assert.equal(P.filterTrades(trades, 'Winners').length, 1);
  assert.equal(P.filterTrades(trades, 'Losses').length, 1);
  assert.equal(P.filterTrades(trades, 'Protected SL')[0].r, 0);
  assert.equal(P.filterTrades(trades, 'SL').length, 1);
});
test('drawdown view derives peak losses without changing source equity', () => {
  const rows = [
    { trade: 0, balance: 100 },
    { trade: 1, balance: 120 },
    { trade: 2, balance: 90 },
  ];
  assert.deepEqual(
    P.drawdownCurve(rows).map((r) => r.balance),
    [0, 0, -30],
  );
  assert.equal(rows[2].balance, 90);
});
