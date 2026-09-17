const assert = require('assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  newYorkMonthKey,
  filterPaperHistoryToCurrentMonth,
  buildPaperMonthStats,
  isOpenTrade,
  compactSignalHistory,
  historyForLegacyRenderer,
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
assert.strictEqual(formatTorontoTime('2026-09-14T12:00:00Z'), '2026-09-14 08:00');
assert.strictEqual(formatTorontoTime('2026-12-14T12:00:00Z'), '2026-12-14 07:00');
assert.strictEqual(compact[0].time, '2026-09-14 07:55');

const transitions = Array.from({ length: 12 }, (_, index) => ({
  timestamp: new Date(Date.UTC(2026, 8, 16, 20, index * 5)).toISOString(),
  symbol: 'EURUSD',
  signal: index % 2 ? 'BUY' : 'WAIT',
}));
const latestTen = compactSignalHistory([...transitions].reverse(), 10);
assert.strictEqual(latestTen.length, 10);
assert.deepStrictEqual(latestTen.map((item) => item.timestamp), transitions.slice(-10).reverse().map((item) => item.timestamp));
assert.strictEqual(latestTen[0].time, '2026-09-16 16:55');
assert.strictEqual(latestTen[9].time, '2026-09-16 16:10');
assert.deepStrictEqual(
  historyForLegacyRenderer([...transitions].reverse(), 10).map((item) => item.timestamp),
  transitions.slice(-10).map((item) => item.timestamp),
  'the existing dashboard renderer reverses its input, so feed it oldest-to-newest',
);

const dashboardSource = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
const formatterSource = dashboardSource.match(/function formatHistoryTime\(rawTime\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(formatterSource, 'dashboard history cell formatter exists');
const formatHistoryCell = vm.runInNewContext(`${formatterSource}; formatHistoryTime`);
assert.strictEqual(formatHistoryCell(latestTen[0].time), '2026-09-16 16:55');
assert.match(fs.readFileSync(path.join(__dirname, '../app.html'), 'utf8'), /<th>Date \/ Time \(Toronto\)<\/th>/);

const rendererSource = dashboardSource.match(/function renderHistory\(history\) \{[\s\S]*?\n\}\n\nfunction formatHistoryTime/)?.[0].replace(/\n\nfunction formatHistoryTime$/, '');
assert.ok(rendererSource, 'actual dashboard history renderer exists');
const historyBody = { innerHTML: '' };
const renderDashboardHistory = vm.runInNewContext(
  `${formatterSource}; ${rendererSource}; renderHistory`,
  {
    document: { getElementById: (id) => id === 'historyBody' ? historyBody : null },
    DISPLAY_NAMES: { EURUSD: 'EURUSD' },
    escapeHtml: (value) => String(value),
  },
);
renderDashboardHistory(historyForLegacyRenderer([...transitions].reverse(), 10));
assert.strictEqual((historyBody.innerHTML.match(/class="history-row /g) || []).length, 10);
assert.match(historyBody.innerHTML, /2026-09-16 16:55/);
assert.ok(historyBody.innerHTML.indexOf('2026-09-16 16:55') < historyBody.innerHTML.indexOf('2026-09-16 16:10'));

console.log('monthly-history-window + V3B history frontend tests: PASS');
