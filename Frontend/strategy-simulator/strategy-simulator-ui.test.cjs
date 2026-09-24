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
  assert.doesNotMatch(html, /STAGE 2|LIVE trading remains OFF/);
  assert.match(html, /id="emptyState"/);
  assert.match(html, /strategy-studio.css/);
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

test('Studio routes saved strategy and exact range through one navigation flow', () => {
 const source=read('strategy-studio/strategy-studio-workspace.js');
 assert.match(source,/new URLSearchParams\(\{ strategy: id, symbol, start, end, mode \}\)/);
 assert.match(source,/await handlers.save\(\)/);
 assert.match(source,/run\('REPLAY'\)/);
 assert.match(source,/query.set\('autostart', '1'\)/);
});


test('controller aggregates five-year backtest chunks and reports progress', () => {
  const source = read('strategy-simulator/strategy-simulator.js');
  assert.match(source, /Model\.aggregateSimulationResults/);
  assert.match(source, /Period \$\{current\} of \$\{total\}/);
  assert.match(source, /refreshHistoryCoverage/);
  assert.match(source, /useFullFiveYearHistory/);
});


test('simulator exposes direct year jump controls', () => {
  const html = read('strategy-simulator.html');
  const source = read('strategy-simulator/strategy-simulator.js');
  const css = read('strategy-simulator/strategy-simulator.css');
  assert.match(html, /id="startYear"/);
  assert.match(html, /id="endYear"/);
  assert.match(html, /date-input-row/);
  assert.match(source, /function applyYearJump/);
  assert.match(source, /function syncAllYearJumps/);
  assert.match(source, /startYear.*applyYearJump/);
  assert.match(css, /date-year-jump/);
});


test('year jump clamps to the valid five-year coverage window', () => {
  const source = read('strategy-simulator/strategy-simulator.js');
  assert.match(source, /function clampSimulationRange/);
  assert.match(source, /fiveYearsBeforeEnd\.setUTCFullYear\(fiveYearsBeforeEnd\.getUTCFullYear\(\) - 5\)/);
  assert.match(source, /if \(start < fiveYearsBeforeEnd\) start = fiveYearsBeforeEnd/);
  assert.doesNotMatch(source, /if \(mode === 'FAST'\) clampSimulationRange\(\)/);
  assert.match(source, /coverageLatest\.getTime\(\) \+ 5 \* 60 \* 1000/);
});
