const assert = require('assert');
const {
  newYorkMonthKey,
  filterPaperHistoryToCurrentMonth,
  buildPaperMonthStats,
  isOpenTrade,
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

console.log('monthly-history-window frontend tests: PASS');
