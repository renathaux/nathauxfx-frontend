const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'manual-replay.html'), 'utf8');
const api = fs.readFileSync(path.join(__dirname, 'manual-replay-api.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, 'manual-replay.js'), 'utf8');
const liveChart = fs.readFileSync(path.join(__dirname, 'manual-replay-live-chart.js'), 'utf8');

test('manual replay is standalone and does not require a strategy', () => {
  assert.match(html, /Manual Trading Replay/);
  assert.match(html, /NO STRATEGY/);
  assert.doesNotMatch(html, /strategy_id/);
  assert.match(api, /STATIC_ROOT = '\/replay-data'/);
  assert.doesNotMatch(api, /strategy-simulator\/manual-history/);
});

test('manual replay frontend contains no broker mutation endpoints', () => {
  const source = api + '\n' + app;
  for (const token of [
    'place_market_order',
    'close_position',
    'modify_position',
    '/live-handoff',
    '/set-active-ctrader-account',
    '/auto-trade',
  ]) {
    assert.equal(source.includes(token), false, token);
  }
});

test('manual replay exposes manual buy sell and close controls', () => {
  assert.match(html, /id="buyBtn"/);
  assert.match(html, /id="sellBtn"/);
  assert.match(html, /id="closeBtn"/);
  assert.match(app, /openManualTrade\('BUY'\)/);
  assert.match(app, /openManualTrade\('SELL'\)/);
});

test('manual replay exposes one synchronized long or short draft ticket', () => {
  for (const id of [
    'longPositionBtn', 'shortPositionBtn', 'cancelPositionBtn',
    'draftDirection', 'draftEntry', 'draftRr', 'draftRisk', 'draftReward',
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /OPEN BUY/);
  assert.match(html, /OPEN SELL/);
  assert.match(html, /manual-replay-position\.js/);
});

test('manual ticket typing updates draft state without reformatting every keystroke', () => {
  assert.match(app, /function updateDraftFromInput\(field, inputId\)/);
  assert.match(app, /addEventListener\('input', \(\) => updateDraftFromInput\('sl', 'slPrice'\)\)/);
  assert.match(app, /addEventListener\('change', commitDraftInputs\)/);
});

test('manual replay chart exposes pointer handles only through the position overlay renderer', () => {
  assert.match(app, /data-position-handle/);
  assert.match(app, /options\.draggable\s*&&\s*\['sl',\s*'tp'\]\.includes\(field\)/);
  assert.match(app, /pointerdown/);
  assert.match(app, /setPointerCapture/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /position-overlay historical/);
  assert.match(app, /visibleReplayWindow/);
});

test('position overlay reserves empty right-side room without loading future candles', () => {
  assert.match(app, /const futureSlots = Math\.max\(8, Math\.ceil\(rows\.length \* 0\.18\)\)/);
  assert.match(app, /plotW \/ Math\.max\(rows\.length \+ futureSlots, 1\)/);
});

test('position tools expose pressed state and coarse-pointer touch targets', () => {
  assert.match(html, /id="longPositionBtn"[^>]+aria-pressed="false"/);
  assert.match(html, /id="shortPositionBtn"[^>]+aria-pressed="false"/);
  assert.match(app, /setAttribute\('aria-pressed'/);
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay.css'), 'utf8');
  assert.match(css, /@media\s*\(pointer:coarse\)/);
});


test('manual replay static history does not require backend auth', () => {
  assert.doesNotMatch(api, /restoreStandaloneAuth/);
  assert.doesNotMatch(api, /flowsignal_session_token/);
  assert.doesNotMatch(api, /\/api\/proxy/);
  assert.match(api, /fetchJson/);
  assert.match(api, /STATIC_REPLAY_HISTORY/);
});


test('manual replay exposes visible year jump controls', () => {
  assert.match(html, /id="startYear"/);
  assert.match(html, /id="endYear"/);
  assert.match(html, /date-input-row/);
  assert.match(app, /function applyYearJump/);
  assert.match(app, /populateYearJump\('startYear'/);
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay.css'), 'utf8');
  assert.match(css, /grid-template-columns:86px minmax\(0,1fr\)/);
  assert.match(css, /position:static!important/);
});


test('manual replay uses a real risk reward position box instead of full-width price lines', () => {
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay.css'), 'utf8');
  assert.match(liveChart, /manual-replay-position-tool/);
  assert.match(liveChart, /manual-replay-position-zone profit/);
  assert.match(liveChart, /manual-replay-position-zone risk/);
  assert.match(liveChart, /LONG.*POSITION/);
  assert.match(liveChart, /SHORT.*POSITION/);
  assert.match(liveChart, /clearPriceLines\(\);[\s\S]*positionDragLayer\(\);/);
  assert.doesNotMatch(liveChart, /createPriceLine\('entry',[\s\S]*createPriceLine\('sl',[\s\S]*createPriceLine\('tp'/);
  assert.match(css, /manual-replay-position-zone\.profit/);
  assert.match(css, /manual-replay-position-zone\.risk/);
  assert.match(app, /metrics: state\.openTrade \? overlayMetrics\(state\.openTrade\) : positionMetrics\(\)/);
});


test('TradingView-style position box starts at the active candle and uses compact risk reward labels', () => {
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay.css'), 'utf8');
  assert.match(liveChart, /state\.lastCandles\.at\(-1\)\?\.time/);
  assert.match(liveChart, /if \(!Number\.isFinite\(x\)/);
  assert.match(liveChart, /barSpacing \* 18/);
  assert.match(liveChart, /Target: \+\$\{summary\.reward\}/);
  assert.match(liveChart, /Stop: -\$\{summary\.risk\}/);
  assert.match(liveChart, /Risk\/Reward Ratio:/);
  assert.match(css, /manual-replay-position-caption\.target/);
  assert.match(css, /manual-replay-position-caption\.stop/);
  assert.match(css, /#089981/);
  assert.match(css, /#f23645/);
});


test('active manual positions stay editable and labels are hover-only', () => {
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay.css'), 'utf8');
  assert.match(app, /function editablePosition/);
  assert.match(app, /validateActivePositionLevel/);
  assert.match(app, /PROTECTED_SL/);
  assert.match(app, /initialRiskDistance/);
  assert.match(app, /\$\('slPrice'\)\.disabled = !editor/);
  assert.match(app, /\$\('tpPrice'\)\.disabled = !editor/);
  assert.match(liveChart, /hoverPoint/);
  assert.match(liveChart, /show-details/);
  assert.match(liveChart, /autoscaleInfoProvider/);
  assert.match(liveChart, /positionAwareAutoscale/);
  assert.match(liveChart, /\[sl, position\.sl, slY, false\]/);
  assert.match(liveChart, /\[tp, position\.tp, tpY, false\]/);
  assert.match(css, /manual-replay-position-tool\.show-details/);
  assert.match(css, /opacity:0/);
});
