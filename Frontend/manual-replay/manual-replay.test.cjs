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

test('manual replay chart exposes draggable SL and TP handles through the live position overlay', () => {
  assert.match(liveChart, /data-replay-price-field/);
  assert.match(liveChart, /pointerdown/);
  assert.match(liveChart, /setPointerCapture/);
  assert.match(liveChart, /onDraftLevel/);
  assert.match(liveChart, /\[sl, position\.sl, slY, false\]/);
  assert.match(liveChart, /\[tp, position\.tp, tpY, false\]/);
  assert.match(liveChart, /requestAnimationFrame\(positionDragLayer\)/);
});

test('position tool reserves right-side room without loading future candles', () => {
  assert.match(liveChart, /rightOffset:\s*22/);
  assert.match(liveChart, /desiredWidth = Math\.max\(190, Math\.min\(340, barSpacing \* 18\)\)/);
  assert.match(app, /const revealed = state\.candles\.slice\(0, state\.index \+ 1\)/);
  assert.match(app, /LiveChart\.setCandles\(revealed/);
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
  assert.match(liveChart, /clearPriceLines\(\);[\s\S]*requestAnimationFrame\(positionDragLayer\)/);
  assert.doesNotMatch(liveChart, /createPriceLine\('entry',[\s\S]*createPriceLine\('sl',[\s\S]*createPriceLine\('tp'/);
  assert.match(css, /manual-replay-position-zone\.profit/);
  assert.match(css, /manual-replay-position-zone\.risk/);
  assert.match(app, /metrics: state\.openTrade \? overlayMetrics\(state\.openTrade\) : positionMetrics\(\)/);
});


test('TradingView-style position box starts at the active candle and uses compact risk reward labels', () => {
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay.css'), 'utf8');
  assert.match(liveChart, /const anchorTime = position\?\.entryTime/);
  assert.match(liveChart, /if \(!Number\.isFinite\(x\)/);
  assert.match(liveChart, /barSpacing \* 18/);
  assert.match(liveChart, /Target: \$\{summary\.targetMoneyText\}/);
  assert.match(liveChart, /Stop: \$\{summary\.stopMoneyText\}/);
  assert.match(liveChart, /Initial Risk/);
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


test('replay candles never push a pending position draft', () => {
  assert.doesNotMatch(app, /function refreshDraftEntry/);
  assert.doesNotMatch(app, /refreshDraftEntry\(\)/);
  assert.match(app, /entryIndex: state\.index/);
  assert.match(app, /entryTime: currentCandle\(\)\?\.timestamp/);
  assert.match(app, /Future replay candles must never push Entry, SL, or TP/);
  assert.match(liveChart, /const anchorTime = position\?\.entryTime/);
  assert.match(liveChart, /const logicalIndex = Number\.isFinite\(Number\(position\?\.entryIndex\)\)/);
});


test('manual replay can switch off auto risk and use fixed lot sizing', () => {
  for (const id of [
    'positionSizingMode', 'lotSize', 'lotSizeField',
    'draftLot', 'draftSlPips', 'draftTpPips',
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /Manual Lot Size/);
  assert.match(app, /MANUAL_LOT/);
  assert.match(app, /calculateMetricsFor/);
  assert.match(app, /lotSize: \$\('lotSize'\)\?\.value/);
  assert.match(app, /SL: \$\{Number\(metrics\.riskPips\)\.toFixed\(1\)\} pips/);
  assert.match(app, /Continue with this virtual trade\?/);
  assert.match(app, /lotSize: metrics\.lotSize/);
  assert.match(app, /riskPips: metrics\.riskPips/);
  assert.match(app, /rewardPips: metrics\.rewardPips/);
  assert.match(app, /\$\('lotSize'\)\.disabled = Boolean\(trade\)/);
  assert.match(html, /<th>Lot<\/th>/);
});


test('modern sizing ticket is protected from the legacy saved layout', () => {
  const savedLayout = fs.readFileSync(path.join(__dirname, 'manual-replay-saved-layout.js'), 'utf8');
  assert.match(savedLayout, /modernTicketLayoutEnabled/);
  assert.match(savedLayout, /document\.getElementById\('positionSizingMode'\)/);
  assert.match(savedLayout, /modernTicketPrefixes/);
  assert.match(savedLayout, /'ticketFieldControl'/);
  assert.match(savedLayout, /'draftMetrics'/);
  assert.match(savedLayout, /if \(modernTicket && modernTicketPrefixes\.has\(prefix\)\) continue/);
  assert.match(savedLayout, /sizing\.style\.setProperty\('display', 'block', 'important'\)/);
  assert.match(savedLayout, /tradePanel\.style\.setProperty\('height', 'auto', 'important'\)/);
});
