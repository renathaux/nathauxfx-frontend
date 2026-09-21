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
  for (const text of ['Symbols', 'Trading Timeframe', 'Trend Filter', 'Break Validation', 'Entry Confirmation', 'Entry Method', 'Stop Loss', 'TP1', 'TP2', 'Risk', 'Fundamental Filter']) {
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

test('save captures the selected strategy identity before async validation', () => {
  const source = fs.readFileSync(controllerPath, 'utf8');
  assert.match(source, /const saveTargetId\s*=\s*state\.currentId/);
  assert.match(source, /const saveName\s*=\s*state\.name\.trim\(\)/);
  assert.match(source, /validateStrategy\(saveName, definition\)/);
  assert.match(source, /updateStrategy\(saveTargetId, saveName,/);
  assert.match(source, /createStrategy\(saveName,/);
});


test('fundamental LIVE policy exposes both supported modes', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.match(html, /id="fundamentalMode"/);
  assert.match(html, /BLOCK_OPPOSITE/);
  assert.match(html, /REQUIRE_ALIGNMENT/);
  assert.match(html, /historical Simulator results do not model past fundamental states/);
});


test('TP1 controls use percentage language while controller stores R values', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const source = fs.readFileSync(controllerPath, 'utf8');
  assert.match(html, /TP1 Target \(% of SL\)/);
  assert.match(html, /Close Position \(%\)/);
  assert.match(html, /Protection \(% of SL\)/);
  assert.match(html, /70% = 0\.70R/);
  assert.match(html, /20% = \+0\.20R/);
  assert.match(source, /Model\.percentToR\(toNumber\('tp1Target'\)\)/);
  assert.match(source, /Model\.percentToR\(toNumber\('tp1Protection'\)\)/);
  assert.match(source, /Model\.rToPercent\(value\.tp1\.target_r\)/);
  assert.match(source, /Model\.rToPercent\(value\.tp1\.protection_r\)/);
});
