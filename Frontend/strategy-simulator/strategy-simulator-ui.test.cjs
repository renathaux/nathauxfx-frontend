const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('simulator page exposes fast run, replay, metrics, trades, and replay chart', () => {
  const html = read('strategy-simulator.html');
  for (const id of [
    'fastRunBtn', 'replayRunBtn', 'metricNetPl', 'metricWinRate', 'metricDrawdown',
    'tradeTableBody', 'equityChart', 'replayChart', 'replayPrevBtn', 'replayNextBtn',
    'diagnosticSummary', 'diagCandles', 'diagSetups', 'diagSignals', 'diagTradesOpened',
    'diagnosticFunnel', 'diagnosticReasons', 'fiveYearRangeBtn', 'historyCoverage',
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /Simulator only/i);
  assert.match(html, /does not enable LIVE trading/i);
  assert.match(html, /Fast Backtest/);
  assert.match(html, /Bar Replay/);
});

test('simulator controller renders zero-trade diagnostics and rejection reasons', () => {
  const source = read('strategy-simulator/strategy-simulator.js');
  assert.match(source, /function renderDiagnostics/);
  assert.match(source, /NO TRADES FOUND/);
  assert.match(source, /stage_pass_counts/);
  assert.match(source, /rejection_reasons/);
  assert.match(source, /no_setup_reasons/);
  assert.match(source, /BOS_CHOCH_REQUIRED/);
});

test('simulator api only reads saved strategy and posts to simulator endpoint', () => {
  const source = read('strategy-simulator/strategy-simulator-api.js');
  assert.match(source, /\/strategy-studio\/strategies\//);
  assert.match(source, /\/strategy-simulator\/run/);
  for (const forbidden of [
    '/execute-live-order', '/trade/', '/strategy-studio/strategies/${encodeURIComponent(id)}/activate',
    'live-auto', 'close-position', 'modify-position',
  ]) {
    assert.equal(source.includes(forbidden), false, `forbidden API coupling: ${forbidden}`);
  }
});

test('strategy studio simulator button navigates only to a selected saved strategy', () => {
  const apiSource = read('strategy-studio/strategy-studio-api.js');
  const controllerSource = read('strategy-studio/strategy-studio.js');
  assert.match(apiSource, /strategy-simulator\.html\?strategy=/);
  assert.match(apiSource, /simulatorBtn/);
  assert.match(apiSource, /strategy-card\.selected/);
  assert.match(controllerSource, /data-strategy-id/);
});


test('controller aggregates five-year backtest chunks and reports progress', () => {
  const source = read('strategy-simulator/strategy-simulator.js');
  assert.match(source, /Model\.aggregateSimulationResults/);
  assert.match(source, /Backtesting chunk/);
  assert.match(source, /refreshHistoryCoverage/);
  assert.match(source, /useFullFiveYearHistory/);
});
