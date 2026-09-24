const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'strategy-studio.html');
const cssPath = path.join(root, 'strategy-studio.css');
const controllerPath = path.join(root, 'strategy-studio', 'strategy-studio.js');

test('page has the approved three-column Strategy Studio shell and actions', () => {
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/\s+/g, ' ');
  for (const text of ['Saved Strategies', 'Strategy Builder', 'Strategy Summary', 'Save Strategy', 'Clone', 'Activate', 'Delete']) {
    assert.match(html, new RegExp(text));
  }
  assert.match(html, /id="savedStrategiesPanel"/);
  assert.match(html, /id="strategyBuilder"/);
  assert.match(html, /id="strategySummaryPanel"/);
  assert.equal((html.match(/class="builder-section"/g) || []).length, 8);
  assert.match(html, /id="themeToggle"/);
  assert.match(html, /id="strategySelect"/);
});

test('builder includes eight executable sections and empty real-result metrics', () => {
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/\s+/g, ' ');
  for (const text of ['Symbols', 'Trading Timeframe', 'Trend Filter', 'Break Validation', 'Confirmation Rules', 'Entry Method', 'Stop Loss', 'TP1', 'TP2', 'Risk', 'Fundamental Filter']) {
    assert.match(html, new RegExp(text));
  }
  for (const text of ['Strategy Basics', 'Market &amp; Timeframes', 'Confirmation Rules', 'Entry / Stop / Targets', 'Risk', 'Fundamentals', 'Backtest Execution Model', 'Notes / Version']) assert.ok(html.includes(text));
  assert.match(html, /id="metricNetPl">\s*—/);
  assert.match(html, /Run a backtest to see performance/);
  assert.doesNotMatch(html, /draft-marker|data-settings-group="costs"/);
});

test('controller validates before save, renders inline errors and confirms sensitive actions', () => {
  const source = fs.readFileSync(controllerPath, 'utf8');
  assert.match(source, /validateStrategy/);
  assert.match(source, /data-error-for/);
  assert.match(source, /showConfirmation/);
  assert.match(source, /does not change LIVE/);
  assert.match(source, /permanent/i);
  assert.match(source, /Workspace\.update/);
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
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/\s+/g, ' ');
  assert.match(html, /id="fundamentalMode"/);
  assert.match(html, /BLOCK_OPPOSITE/);
  assert.match(html, /REQUIRE_ALIGNMENT/);
  assert.match(html, /historical Simulator results do not model past fundamental states/);
});


test('TP1 controls support SL or TP2 percentage bases and a step ladder', () => {
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/\s+/g, ' ');
  const source = fs.readFileSync(controllerPath, 'utf8');
  assert.match(html, /id="tp1TargetBasis"/);
  assert.match(html, /Stop Loss Distance/);
  assert.match(html, /TP2 Distance \(Entry → TP2\)/);
  assert.match(html, /id="tp1ProtectionMode"/);
  assert.match(html, /Step Protection Toward TP2/);
  assert.match(html, /70% → secure 50%/);
  assert.match(html, /80% → secure 60%/);
  assert.match(html, /90% → secure 70%/);
  assert.match(source, /draft\.tp1\.target_basis/);
  assert.match(source, /draft\.tp1\.protection_steps/);
  assert.match(source, /Model\.percentToR\(toNumber\('tp1Target'\)\)/);
  assert.match(source, /Model\.rToPercent\(value\.tp1\.target_r\)/);
});


test('higher timeframe selector exposes None and clears trend filters', () => {
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/\s+/g, ' ');
  const source = fs.readFileSync(controllerPath, 'utf8');
  assert.match(html, /Higher Timeframe/);
  assert.match(html, /None — no higher timeframe filter/);
  assert.match(html, /None means the strategy will not use any higher-timeframe trend filter/);
  assert.match(source, /setCheckedValues\('trendMethodChoices', \[\]\)/);
  assert.match(source, /trendTimeframe.*addEventListener\('change'/s);
});


test('builder exposes remember BOS and LIVE off controls', () => {
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/\s+/g, ' ');
  const source = fs.readFileSync(controllerPath, 'utf8');
  assert.match(html, /id="rememberBosEntry"/);
  assert.match(html, /Remember BOS if confirmation fails/);
  assert.match(html, /id="turnOffLiveStrategyBtn"/);
  assert.match(html, /Turn Off LIVE Strategy/);
  assert.match(source, /remember_bos_on_confirmation_failure/);
  assert.match(source, /turnOffLiveCurrent/);
  assert.match(source, /Api\.setLiveHandoff\(current\.strategy_id, false\)/);
  assert.match(source, /does not close an existing broker position/);
});
