const assert = require('assert');
const {
  newYorkMonthKey,
  filterPaperHistoryToCurrentMonth,
  buildPaperMonthStats,
  isOpenTrade,
  compactSignalHistory,
  formatTorontoTime,
  normalizeSignal,
} = require('../history.js');

const current = new Date('2026-10-15T16:00:00Z');
const history = [
  { trade_id: 'paper-win', closed_at: '2026-10-05T15:00:00Z', status: 'CLOSED', result: 'WIN', profit: 120 },
  { trade_id: 'paper-loss', closed_at: '2026-10-08T15:00:00Z', status: 'CLOSED', result: 'LOSS', profit: -50 },
  { trade_id: 'old-closed', closed_at: '2026-09-30T15:00:00Z', status: 'CLOSED', result: 'WIN', profit: 20 },
  { trade_id: 'old-open', opened_at: '2026-09-28T15:00:00Z', status: 'OPEN', result: 'RUNNING' },
];

assert.strictEqual(newYorkMonthKey(current), '2026-10');
const kept = filterPaperHistoryToCurrentMonth(history, current);
assert.deepStrictEqual(kept.map((trade) => trade.trade_id), ['paper-win', 'paper-loss', 'old-open']);
assert.strictEqual(isOpenTrade(kept[2]), true);

const stats = buildPaperMonthStats(kept, {});
assert.strictEqual(stats.strategy_identity, 'PAPER — V1');
assert.strictEqual(stats.history_window, 'calendar_month');
assert.strictEqual(stats.wins, 1);
assert.strictEqual(stats.losses, 1);
assert.strictEqual(stats.running, 1);
assert.strictEqual(stats.total, 3);
assert.strictEqual(stats.total_pl, 70);
assert.strictEqual(stats.win_rate, 50);

const signalHistory = [
  { time: '2026-09-14T12:00:00Z', symbol: 'EURUSD', signal: 'WAIT', result: 'RUNNING', pips: 0 },
  { time: '2026-09-14T11:55:00Z', symbol: 'EURUSD', signal: 'WAIT', result: 'RUNNING', pips: 0 },
  { time: '2026-09-14T11:50:00Z', symbol: 'XAUUSD', signal: 'SELL', result: 'RUNNING', pips: 0 },
  { time: '2026-09-14T11:45:00Z', symbol: 'XAUUSD', signal: 'WAIT', result: 'RUNNING', pips: 0 },
  { time: '2026-09-14T11:40:00Z', symbol: 'EURUSD', signal: 'BUY', result: 'RUNNING', pips: 0 },
  { time: '2026-09-14T11:35:00Z', symbol: 'EURUSD', signal: 'WAIT', result: 'RUNNING', pips: 0 },
];

const compact = compactSignalHistory(signalHistory, 10);
assert.deepStrictEqual(
  compact.map((item) => `${item.symbol}:${item.signal}`),
  ['EURUSD:WAIT', 'XAUUSD:SELL', 'XAUUSD:WAIT', 'EURUSD:BUY', 'EURUSD:WAIT']
);
assert.strictEqual(compact.filter((item) => item.symbol === 'EURUSD' && item.signal === 'WAIT').length, 2);
assert.strictEqual(normalizeSignal('buy setup'), 'BUY');
assert.strictEqual(normalizeSignal('sell'), 'SELL');
assert.strictEqual(normalizeSignal('anything else'), 'WAIT');
assert.strictEqual(formatTorontoTime('2026-09-14T12:00:00Z'), '08:00');
assert.strictEqual(compact[0].time, '08:00');

console.log('monthly-history-window + V3B history frontend tests: PASS');
