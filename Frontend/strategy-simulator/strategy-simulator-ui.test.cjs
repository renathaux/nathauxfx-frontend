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
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /Simulator only/i);
  assert.match(html, /does not enable LIVE trading/i);
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

test('strategy studio simulator button navigates only to a saved strategy', () => {
  const html = read('strategy-studio.html');
  assert.match(html, /strategy-simulator\.html\?strategy=/);
  assert.match(html, /data-strategy-id/);
});
