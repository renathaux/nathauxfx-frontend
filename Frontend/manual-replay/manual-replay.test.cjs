const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'manual-replay.html'), 'utf8');
const api = fs.readFileSync(path.join(__dirname, 'manual-replay-api.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, 'manual-replay.js'), 'utf8');
const liveChart = fs.readFileSync(path.join(__dirname, 'manual-replay-live-chart.js'), 'utf8');
const layoutEditor = fs.readFileSync(path.join(__dirname, 'manual-replay-layout-editor.js'), 'utf8');

test('manual replay is standalone and does not require a strategy', () => {
  assert.match(html, /NathauxFX — Manual Replay/);
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
  assert.match(html, /Open Buy/);
  assert.match(html, /Open Sell/);
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
  assert.match(liveChart, /\[sl, position\.sl, slY, state\.positionLocked\]/);
  assert.match(liveChart, /\[tp, position\.tp, tpY, state\.positionLocked\]/);
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


test('manual replay uses one visible year control plus month-day-time text', () => {
  assert.match(html, /id="startYear"/);
  assert.match(html, /id="endYear"/);
  assert.match(html, /date-input-row/);
  assert.match(html, /id="startDate"[^>]+type="text"[^>]+placeholder="MM-DD HH:MM"/);
  assert.match(html, /id="endDate"[^>]+type="text"[^>]+placeholder="MM-DD HH:MM"/);
  assert.doesNotMatch(html, /id="startDate"[^>]+type="datetime-local"/);
  assert.doesNotMatch(html, /id="endDate"[^>]+type="datetime-local"/);
  assert.match(app, /function datePartWithoutYear/);
  assert.match(app, /function parseDatePartWithoutYear/);
  assert.match(app, /function applyYearJump/);
  assert.match(app, /populateYearJump\('startYear'/);
  assert.match(app, /Use MM-DD HH:MM for the replay date and time/);
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay.css'), 'utf8');
  assert.match(css, /grid-template-columns: 66px minmax\(0, 1fr\)/);
  assert.match(css, /date-without-year/);
});



test('manual replay defaults to one year, auto-loads, and keeps eleven months of prior history', () => {
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay.css'), 'utf8');
  assert.match(app, /REPLAY_CONTEXT_MONTHS = 11/);
  assert.match(app, /DEFAULT_REPLAY_MONTHS = 12/);
  assert.match(app, /subtractCalendarMonths\(end, DEFAULT_REPLAY_MONTHS\)/);
  assert.match(app, /const historyStart = subtractCalendarMonths\(replayStart, REPLAY_CONTEXT_MONTHS\)\.toISOString\(\)/);
  assert.match(app, /start: historyStart/);
  assert.match(app, /findIndex\([\s\S]*Date\.parse\(candle\.timestamp\) >= replayStartMs/);
  assert.match(app, /state\.initialIndex = replayStartIndex/);
  assert.match(app, /state\.index = replayStartIndex/);
  assert.match(app, /void loadReplay\(\)/);
  assert.match(html, /id="chartLoading"/);
  assert.match(app, /function setChartLoading/);
  assert.match(css, /manual-replay-loading-overlay/);
});

test('manual replay initial viewport shows recent context without flattening all history', () => {
  assert.match(app, /INITIAL_VISIBLE_BARS = 220/);
  assert.match(app, /focusBars: INITIAL_VISIBLE_BARS/);
  assert.match(liveChart, /focusBars = 220/);
  assert.match(liveChart, /setVisibleLogicalRange/);
  assert.match(liveChart, /candles\.length - visibleBars/);
  assert.match(liveChart, /rightPaddingBars = 18/);
});

test('manual replay progress starts at the selected replay date instead of counting context history', () => {
  assert.match(app, /replayTotal = Math\.max\(0, state\.candles\.length - state\.initialIndex\)/);
  assert.match(app, /replayCurrent = Math\.max\(0, state\.index - state\.initialIndex \+ 1\)/);
});



test('manual replay UI settings persist theme chart background candle color and grid', () => {
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay.css'), 'utf8');
  assert.match(html, /id="uiSettingsBtn"/);
  assert.match(html, /id="uiSettingsPanel"/);
  assert.match(html, /id="uiTheme"/);
  assert.match(html, /id="uiChartBackground"/);
  assert.match(html, /id="uiBullColor"/);
  assert.match(html, /id="uiGrid"/);
  assert.match(app, /UI_SETTINGS_KEY/);
  assert.match(app, /localStorage\.setItem\(UI_SETTINGS_KEY/);
  assert.match(app, /LiveChart\?\.setAppearance\?\./);
  assert.match(liveChart, /function setAppearance/);
  assert.match(liveChart, /function appearancePalette/);
  assert.match(liveChart, /blue: '#2962ff'/);
  assert.match(css, /data-replay-theme="light"/);
  assert.match(css, /data-chart-background="black"/);
});

test('manual replay time axis renders timestamps in browser local time', () => {
  assert.match(liveChart, /function chartTimeDate/);
  assert.match(liveChart, /function formatLocalChartDateTime/);
  assert.match(liveChart, /function formatLocalTickMark/);
  assert.match(liveChart, /timeFormatter: formatLocalChartDateTime/);
  assert.match(liveChart, /tickMarkFormatter: formatLocalTickMark/);
  assert.match(liveChart, /new Intl\.DateTimeFormat\(undefined/);
});

test('symbol and timeframe title change immediately while new replay data loads', () => {
  assert.match(app, /const requestedSymbol = \$\('symbol'\)\.value/);
  assert.match(app, /const requestedTimeframe = \$\('timeframe'\)\.value/);
  assert.match(app, /Loading…/);
  assert.match(app, /symbol: requestedSymbol/);
  assert.match(app, /timeframe: requestedTimeframe/);
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
  assert.doesNotMatch(liveChart, /positionAwareAutoscale/);
  assert.match(liveChart, /transformedCandleAutoscale/);
  assert.match(liveChart, /\[sl, position\.sl, slY, state\.positionLocked\]/);
  assert.match(liveChart, /\[tp, position\.tp, tpY, state\.positionLocked\]/);
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








test('manual replay fullscreen is chart-only and preserves the trade hologram layer', () => {
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay.css'), 'utf8');
    assert.match(html, /class="chart-wrap"/);
  assert.doesNotMatch(html, /id="manualReplayChartFrame"/);
  assert.match(html, /id="fullscreenBtn"/);
  assert.match(html, /⛶ Full Screen/);
  assert.match(app, /function fullscreenChartFrame/);
  assert.match(app, /document\.querySelector\('\.chart-wrap'\)/);
  assert.match(app, /frame\.requestFullscreen/);
  assert.match(app, /document\.exitFullscreen/);
  assert.match(app, /function syncFullscreenUi/);
  assert.match(css, /\.chart-wrap:fullscreen/);
  assert.match(css, /\.chart-wrap:fullscreen \.manual-replay-trade-layer/);
  assert.doesNotMatch(css, /#replayWorkspace:fullscreen/);
});


test('full layout editor can edit text lock delete move and stretch', () => {
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay-layout-editor.css'), 'utf8');
  assert.match(layoutEditor, /layoutEdit/);
  assert.match(layoutEditor, /nathauxfx_manual_replay_layout_editor_v4/);
  assert.match(layoutEditor, /data-layout-action="text"/);
  assert.match(layoutEditor, /data-layout-action="lock"/);
  assert.match(layoutEditor, /data-layout-action="delete"/);
  assert.match(layoutEditor, /function editActiveText/);
  assert.match(layoutEditor, /function toggleActiveLock/);
  assert.match(layoutEditor, /function deleteActiveItem/);
  assert.match(layoutEditor, /function startMove/);
  assert.match(layoutEditor, /function startResize/);
  assert.match(layoutEditor, /dirs = \['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'\]/);
  assert.match(layoutEditor, /UNDO DELETE/);
  assert.match(layoutEditor, /RESTORE DELETED/);
  assert.match(layoutEditor, /locked: Boolean\(state\.locked\)/);
  assert.match(layoutEditor, /deleted: Boolean\(state\.deleted\)/);
  assert.match(layoutEditor, /state\.text != null/);
  assert.match(css, /#manualLayoutHoverActions/);
  assert.match(css, /manual-layout-hover-handle\[data-dir="n"\]/);
  assert.match(css, /manual-layout-hover-handle\[data-dir="w"\]/);
  assert.match(css, /manual-layout-hover-handle\[data-dir="se"\]/);
});

test('full editor targets buttons cards blocks and individual text controls', () => {
  assert.match(layoutEditor, /prefix: 'playbackItem'/);
  assert.match(layoutEditor, /prefix: 'positionTool'/);
  assert.match(layoutEditor, /prefix: 'tradePanel'/);
  assert.match(layoutEditor, /prefix: 'ticketField'/);
  assert.match(layoutEditor, /prefix: 'draftMetricCard'/);
  assert.match(layoutEditor, /prefix: 'metricCard'/);
  assert.match(layoutEditor, /prefix: 'tradeTableHeader'/);
  assert.match(layoutEditor, /prefix: 'dateYearJump'/);
});




test('layout editor selection is click-sticky with undo and stable lock', () => {
  assert.match(layoutEditor, /Selection is click-driven, not hover-driven/);
  assert.match(layoutEditor, /Once the user clicks an/);
  assert.match(layoutEditor, /setActive\(el\)/);
  assert.match(layoutEditor, /const undoShortcut = \(event\.ctrlKey \|\| event\.metaKey\)/);
  assert.match(layoutEditor, /function undoLastEdit/);
  assert.match(layoutEditor, /MAX_UNDO_STEPS = 100/);
  assert.match(layoutEditor, /id="manualLayoutUndo"/);
  assert.match(layoutEditor, /Item locked in its current place/);
  assert.doesNotMatch(layoutEditor, /state\.locked = !state\.locked;[\s\S]{0,120}applyState\(activeElement, state\)/);
  assert.match(layoutEditor, /geometryTouched/);
  assert.match(layoutEditor, /baseStyle: el\.getAttribute\('style'\)/);
  assert.match(layoutEditor, /if \(!state\.geometryTouched\)/);
  assert.match(layoutEditor, /deleteButton\.disabled = !activeElement \|\| Boolean\(state\?\.locked\)/);
});





test('position box clicks route green to TP and red to SL with lock controls', () => {
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay.css'), 'utf8');
  assert.match(liveChart, /function positionRegionAtPoint/);
  assert.match(liveChart, /return 'tp'/);
  assert.match(liveChart, /return 'sl'/);
  assert.match(liveChart, /state\.callbacks\.onChartClick\?\.\(price, region\)/);
  assert.match(app, /const fieldId = region === 'tp' \? 'tpPrice' : 'slPrice'/);
  assert.match(app, /green target/);
  assert.match(app, /red risk/);
  assert.match(liveChart, /positionLocked/);
  assert.match(liveChart, /togglePositionLocked\('double-click'\)/);
  assert.doesNotMatch(liveChart, /setPositionLocked\(true, 'space'\)/);
  assert.match(app, /Double-click the position box to edit it again/);
  assert.match(css, /manual-replay-position-tool\.position-locked/);
});


test('manual replay keyboard shortcuts control position entry candles autoplay speed and space playback', () => {
  assert.match(app, /case 'KeyB':[\s\S]*createPositionDraft\('BUY'\)/);
  assert.match(app, /case 'KeyS':[\s\S]*createPositionDraft\('SELL'\)/);
  assert.match(app, /case 'Enter':[\s\S]*openManualTrade\(state\.positionDraft\.side\)/);
  assert.match(app, /case 'ArrowRight':[\s\S]*advanceOne\(\)/);
  assert.match(app, /case 'ArrowLeft':[\s\S]*retreatOne\(\)/);
  assert.match(app, /case 'KeyP':[\s\S]*state\.timer \? stopTimer\(\) : setPlaying\(\)/);
  assert.match(app, /case 'Digit1':[\s\S]*setReplaySpeedFromShortcut\(1\)/);
  assert.match(app, /case 'Digit2':[\s\S]*setReplaySpeedFromShortcut\(2\)/);
  assert.match(app, /case 'Digit5':[\s\S]*setReplaySpeedFromShortcut\(5\)/);
  assert.match(app, /case 'Digit6':[\s\S]*setReplaySpeedFromShortcut\(10\)/);
  assert.match(app, /function handleSpacePlaybackShortcut/);
  assert.match(app, /now - previous <= 450/);
  assert.match(app, /case 'Space':[\s\S]*handleSpacePlaybackShortcut\(\)/);
  assert.match(app, /if \(state\.timer\)[\s\S]*stopTimer\(\)/);
  assert.match(app, /setPlaying\(\)/);
  assert.match(app, /document\.addEventListener\('keydown', handleReplayKeyboard, true\)/);
});

test('double click cancels pending single-click edit before locking', () => {
  assert.match(liveChart, /state\.clickTimer = window\.setTimeout/);
  assert.match(liveChart, /220/);
  assert.match(liveChart, /if \(state\.clickTimer\)[\s\S]*window\.clearTimeout\(state\.clickTimer\)/);
  assert.match(liveChart, /interactionHost\.addEventListener\('dblclick'/);
});


test('position drawings do not flatten candles while vertical world transforms candle autoscale only', () => {
  assert.doesNotMatch(liveChart, /POSITION_VERTICAL_CONTEXT_MULTIPLIER/);
  assert.doesNotMatch(liveChart, /CANDLE_VERTICAL_CONTEXT_MULTIPLIER/);
  assert.match(liveChart, /function transformedCandleAutoscale/);
  assert.match(liveChart, /autoscaleInfoProvider/);
  assert.match(liveChart, /function visibleCandlePriceRange/);
  assert.match(liveChart, /getVisibleLogicalRange\(\)/);
  assert.match(liveChart, /state\.lastCandles\[index\]/);
  assert.match(liveChart, /baseMin = Number\(visible\?\.low\)/);
  assert.match(liveChart, /baseMax = Number\(visible\?\.high\)/);
  assert.doesNotMatch(liveChart, /transformedCandleAutoscale[\s\S]{0,800}currentPosition\(\)/);
  assert.match(liveChart, /Long\/Short is a drawing overlay, like TradingView/);
  assert.match(liveChart, /Do not reset the price scale when SL\/TP changes/);
});


test('manual replay chart behaves like a free TradingView-style world', () => {
  assert.match(liveChart, /handleScroll:[\s\S]*mouseWheel: true/);
  assert.match(liveChart, /pressedMouseMove: true/);
  assert.match(liveChart, /horzTouchDrag: true/);
  assert.match(liveChart, /vertTouchDrag: true/);
  assert.match(liveChart, /handleScale:[\s\S]*axisPressedMouseMove/);
  assert.match(liveChart, /axisPressedMouseMove:[\s\S]*time: true,[\s\S]*price: false/);
  assert.match(liveChart, /axisDoubleClickReset/);
  assert.match(liveChart, /kineticScroll:[\s\S]*mouse: true[\s\S]*touch: true/);
  assert.match(liveChart, /minBarSpacing: 0\.5/);
  assert.match(liveChart, /fixLeftEdge: false/);
  assert.match(liveChart, /fixRightEdge: false/);
  assert.match(liveChart, /rightBarStaysOnScroll: false/);
  assert.match(liveChart, /lockVisibleTimeRangeOnResize: false/);
});


test('manual replay supports true vertical world panning and custom price-axis zoom', () => {
  assert.match(liveChart, /verticalViewport:/);
  assert.match(liveChart, /offsetRatio: 0/);
  assert.match(liveChart, /function transformedCandleAutoscale/);
  assert.match(liveChart, /function refreshVerticalViewport/);
  assert.match(liveChart, /function resetVerticalViewport/);
  assert.match(liveChart, /function priceAxisStartX/);
  assert.match(liveChart, /type: isPriceAxis \? 'scale' : 'pan'/);
  assert.match(liveChart, /gesture\.startOffsetRatio \+ \(dy \/ gesture\.height\) \* gesture\.startScale/);
  assert.match(liveChart, /gesture\.startScale \* Math\.exp\(dy \/ 180\)/);
  assert.match(liveChart, /interactionHost\.addEventListener\('pointerdown', onVerticalPointerDown/);
  assert.match(liveChart, /interactionHost\.addEventListener\('wheel', onVerticalWheel/);
  assert.match(liveChart, /if \(x >= priceAxisStartX\(\)\)[\s\S]*resetVerticalViewport\(\)/);
  assert.match(liveChart, /verticalOffsetRatio: state\.verticalViewport\.offsetRatio/);
});


test('zoom buttons and trackpad zoom auto-fit visible candles like TradingView', () => {
  assert.match(liveChart, /function applyManagedZoom/);
  assert.match(liveChart, /AUTO-FITS the visible candles/);
  assert.match(liveChart, /currentSpacing \/ zoomFactor/);
  assert.match(liveChart, /state\.verticalViewport\.scale = 1/);
  assert.match(liveChart, /state\.verticalViewport\.offsetRatio = 0/);
  assert.match(liveChart, /applyManagedZoom\(direction < 0 \? \(1 \/ 1\.2\) : 1\.2\)/);
  assert.match(liveChart, /Math\.abs\(deltaX\) > Math\.abs\(deltaY\)/);
  assert.match(liveChart, /const factor = Math\.exp\(deltaY \/ 650\)/);
  assert.match(liveChart, /applyManagedZoom\(factor\)/);
  assert.doesNotMatch(liveChart, /state\.verticalViewport\.scale \* zoomFactor/);
});


test('price autoscale uses only the visible replay candles', () => {
  assert.match(liveChart, /function visibleCandlePriceRange/);
  assert.match(liveChart, /Math\.floor\(Number\(logicalRange\.from\)\)/);
  assert.match(liveChart, /Math\.ceil\(Number\(logicalRange\.to\)\)/);
  assert.match(liveChart, /Math\.min\(low, candleLow\)/);
  assert.match(liveChart, /Math\.max\(high, candleHigh\)/);
  assert.match(liveChart, /price scale follows ONLY candles currently/);
  assert.match(liveChart, /const padding = baseSpan \* 0\.08/);
  assert.match(liveChart, /subscribeVisibleLogicalRangeChange\([\s\S]*refreshVerticalViewport\(\)/);
});


test('active manual trade shows a live hologram with money pips and R', () => {
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay.css'), 'utf8');
  assert.match(liveChart, /function liveTradeSnapshot/);
  assert.match(liveChart, /initialRiskDistance/);
  assert.match(liveChart, /const pnl = r \* Number\(trade\.riskDollars/);
  assert.match(liveChart, /const pips = move \/ pipSizeForSymbol\(\)/);
  assert.match(liveChart, /manual-replay-trade-hologram/);
  assert.match(liveChart, /signedMoney\(snapshot\.pnl\)/);
  assert.match(liveChart, /signedNumber\(snapshot\.pips, 1, ' pips'\)/);
  assert.match(liveChart, /signedNumber\(snapshot\.r, 2, 'R'\)/);
  assert.match(css, /manual-replay-trade-hologram\.positive/);
  assert.match(css, /manual-replay-trade-hologram\.negative/);
});


test('chart frame has an always-visible line and support resistance drawing bar', () => {
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay.css'), 'utf8');
  assert.match(html, /id="chartDrawingBar"/);
  assert.match(html, /data-replay-chart-toolbar/);
  assert.match(html, /id="chartLineBtn"/);
  assert.match(html, /id="chartRectBtn"/);
  assert.match(app, /\$\('chartLineBtn'\)\?\.addEventListener\('click', \(\) => toggleDrawingMode\('line'\)\)/);
  assert.match(app, /\$\('chartRectBtn'\)\?\.addEventListener\('click', \(\) => toggleDrawingMode\('rect'\)\)/);
  assert.match(app, /\$\('drawLineBtn'\), \$\('chartLineBtn'\)/);
  assert.match(css, /\.chart-drawing-bar/);
  assert.match(css, /\.chart-wrap:fullscreen \.chart-drawing-bar/);
  assert.match(liveChart, /beginDrawingGesture[\s\S]*data-replay-chart-toolbar/);
  assert.match(liveChart, /onVerticalPointerDown[\s\S]*data-replay-chart-toolbar/);
});

test('manual replay has line and support resistance rectangle drawing tools', () => {
  const css = fs.readFileSync(path.join(__dirname, 'manual-replay.css'), 'utf8');
  assert.doesNotMatch(html, /id="drawLineBtn"/);
  assert.doesNotMatch(html, /id="drawRectBtn"/);
  assert.match(html, /id="chartLineBtn"/);
  assert.match(html, /id="chartRectBtn"/);
  assert.match(app, /toggleDrawingMode\('line'\)/);
  assert.match(app, /toggleDrawingMode\('rect'\)/);
  assert.match(liveChart, /function setDrawingMode/);
  assert.match(liveChart, /coordinateToLogical/);
  assert.match(liveChart, /logicalToCoordinate/);
  assert.match(liveChart, /manual-replay-drawing-layer/);
  assert.match(liveChart, /manual-drawing-line/);
  assert.match(liveChart, /manual-drawing-rect/);
  assert.match(css, /manual-drawing-line/);
  assert.match(css, /manual-drawing-rect/);
});

test('support resistance rectangle exposes all eight resize handles', () => {
  assert.match(liveChart, /\['nw','n','ne','e','se','s','sw','w'\]/);
  assert.match(liveChart, /function applyRectangleHandle/);
  assert.match(liveChart, /handle\.includes\('w'\)/);
  assert.match(liveChart, /handle\.includes\('e'\)/);
  assert.match(liveChart, /handle\.includes\('n'\)/);
  assert.match(liveChart, /handle\.includes\('s'\)/);
});

test('manual chart drawings persist by replay symbol timeframe and support undo delete', () => {
  assert.match(liveChart, /nathauxfx_manual_replay_drawings_v1/);
  assert.match(liveChart, /window\.localStorage/);
  assert.match(liveChart, /function pushDrawingUndo/);
  assert.match(liveChart, /function undoDrawingEdit/);
  assert.match(liveChart, /function deleteSelectedDrawing/);
  assert.match(liveChart, /event\.key === 'Delete'/);
  assert.match(liveChart, /String\(event\.key\)\.toLowerCase\(\) === 'z'/);
  assert.match(app, /setDrawingScope\?\.\(symbol \+ '\\|' \+ \$\('timeframe'\)\.value\)/);
});


test('symbol and timeframe auto reload with latest request protection', () => {
  assert.match(app, /\$\('symbol'\)\.addEventListener\('change', \(\) => \{ void loadReplay\(\); \}\)/);
  assert.match(app, /\$\('timeframe'\)\.addEventListener\('change', \(\) => \{ void loadReplay\(\); \}\)/);
  assert.match(app, /requestId !== state\.loadRequestId/);
});
