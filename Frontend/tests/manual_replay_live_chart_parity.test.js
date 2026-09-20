const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontend = path.join(__dirname, '..');
const live = fs.readFileSync(path.join(frontend, 'script.js'), 'utf8');
const replay = fs.readFileSync(path.join(frontend, 'manual-replay', 'manual-replay-live-chart.js'), 'utf8');
const replayPage = fs.readFileSync(path.join(frontend, 'manual-replay.html'), 'utf8');
const replayController = fs.readFileSync(path.join(frontend, 'manual-replay', 'manual-replay.js'), 'utf8');

for (const expected of [
  "background: { color: '#0b0f1a' }",
  "textColor: '#9fb0c8'",
  "vertLines: { color: 'rgba(42, 51, 66, 0.45)' }",
  "borderColor: '#1f2937'",
  "barSpacing: 14",
  "rightOffset: 10",
  "upColor: '#26a69a'",
  "downColor: '#ef5350'",
]) {
  assert.ok(replay.includes(expected), `replay adapter keeps LIVE chart option: ${expected}`);
}

assert.ok(live.includes('LightweightCharts.createChart(container'));
assert.ok(replay.includes('window.LightweightCharts.createChart'));
assert.ok(replayPage.includes('lightweight-charts@4.2.0'));
assert.ok(replayPage.includes('id="manualReplayChart"'));
assert.ok(!replayPage.includes('<svg id="chart"'));
assert.ok(
  replayController.includes('state.candles.slice(0, state.index + 1)'),
  'future replay candles never enter Lightweight Charts',
);
assert.ok(
  !replayController.includes("chart.addEventListener('wheel'"),
  'Manual Replay no longer owns custom wheel zoom math',
);

console.log('manual replay LIVE chart parity checks passed');
