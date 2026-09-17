const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'strategy-studio.html');
const cssPath = path.join(root, 'strategy-studio.css');
const controllerPath = path.join(root, 'strategy-studio', 'strategy-studio.js');

test('page has the approved three-column Strategy Studio shell and actions', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  for (const text of ['Saved Strategies', 'Strategy Builder', 'Strategy Summary', 'Save Strategy', 'Clone', 'Activate', 'Delete']) {
    assert.match(html, new RegExp(text));
  }
  assert.match(html, /id="savedStrategiesPanel"/);
  assert.match(html, /id="strategyBuilder"/);
  assert.match(html, /id="strategySummaryPanel"/);
  assert.doesNotMatch(html, /Session Filter/);
  assert.doesNotMatch(html, /Extra Filters/);
});

test('builder includes all approved sections and no fake metrics', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  for (const text of ['Symbols', 'Trading Timeframe', 'Trend Filter', 'Break Validation', 'Entry Confirmation', 'Entry Method', 'Stop Loss', 'TP1', 'TP2', 'Risk']) {
    assert.match(html, new RegExp(text));
  }
  assert.doesNotMatch(html, /Win Rate|Profit Factor|Net Profit|Max Drawdown/);
});

test('controller validates before save, renders inline errors and confirms sensitive actions', () => {
  const source = fs.readFileSync(controllerPath, 'utf8');
  assert.match(source, /validateStrategy/);
  assert.match(source, /data-error-for/);
  assert.match(source, /showConfirmation/);
  assert.match(source, /does not change LIVE/);
  assert.match(source, /permanent/i);
  assert.match(source, /Simulator becomes available after the shared evaluator is installed\./);
});

test('premium layout has responsive three-column grid and sticky summary', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /grid-template-columns/);
  assert.match(css, /position:\s*sticky/);
  assert.match(css, /@media\s*\(max-width:\s*1000px\)/);
});
