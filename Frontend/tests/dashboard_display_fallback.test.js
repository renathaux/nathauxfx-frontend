const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'display-data-state.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const context = { window: {} };
context.window.window = context.window;
vm.runInNewContext(source, context);

const api = context.window.NathauxDisplayDataState;
assert.ok(api, 'display-only state API is exported');

assert.deepEqual(
  { ...api.fromMeta({ stale_data: true }) },
  { displayOnly: false, analysisAvailable: true, statusLabel: 'STALE DATA' },
);

for (const displayDataSource of [
  'persisted_ctrader_closed_candles',
  'in_memory_ctrader_closed_candles',
  'closed_candle_fallback',
]) {
  assert.deepEqual(
    {
      ...api.fromMeta({
        stale_data: true,
        display_only_fallback: true,
        analysis_available: false,
        display_data_source: displayDataSource,
      }),
    },
    { displayOnly: true, analysisAvailable: false, statusLabel: 'ANALYSIS PAUSED' },
    `display-only UI must not depend on source ${displayDataSource}`,
  );
}

assert.deepEqual(
  { ...api.fromMeta({ display_only_fallback: true, analysis_available: false }) },
  { displayOnly: true, analysisAvailable: false, statusLabel: 'ANALYSIS PAUSED' },
  'display_only_fallback alone is authoritative for paused UI state',
);

assert.match(html, /display-data-state\.js\?v=1/);
assert.match(html, /script\.js\?v=130/);
assert.match(script, /NathauxDisplayDataState/);

function extractFunction(name) {
  const patterns = [`async function ${name}(`, `function ${name}(`];
  const start = patterns.map((pattern) => script.indexOf(pattern)).find((index) => index >= 0);
  assert.ok(start >= 0, `${name} exists in the dashboard bundle`);
  const open = script.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = open; index < script.length; index += 1) {
    const char = script[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return script.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

const elements = {
  chartOverlayTitle: { textContent: '' },
  chartOverlayOhlc: { textContent: '', innerHTML: '' },
  mainLive: { textContent: '' },
};
const previousPanel = {
  EURUSD: { signal: 'BUY', market_condition: 'TRENDING' },
  XAUUSD: { signal: 'SELL', market_condition: 'TRENDING' },
};
const payload = {
  _meta: {
    stale_data: true,
    display_only_fallback: true,
    analysis_available: false,
    display_data_source: 'closed_candle_fallback',
    display_stream_sources: {
      EURUSD: {
        '5m': {
          source: 'in_memory_ctrader_closed_candles',
          latest_candle_time: '2026-09-15T12:10:00Z',
        },
      },
      XAUUSD: {
        '5m': {
          source: 'persisted_ctrader_closed_candles',
          latest_candle_time: '2026-09-15T12:10:00Z',
        },
      },
    },
  },
  EURUSD: {
    signal: 'WAIT',
    market_condition: 'DISPLAY_ONLY',
    buy_pct: 0,
    sell_pct: 0,
    confidence: 0,
    signal_data_source: { available: false },
  },
  XAUUSD: {
    signal: 'WAIT',
    market_condition: 'DISPLAY_ONLY',
    buy_pct: 0,
    sell_pct: 0,
    confidence: 0,
    signal_data_source: { available: false },
  },
  candles: {
    EURUSD: { '5m': [{ time: 1789474200, open: 1.17, high: 1.18, low: 1.16, close: 1.175 }] },
    XAUUSD: { '5m': [{ time: 1789474200, open: 3650, high: 3660, low: 3640, close: 3655 }] },
  },
};
const renderedSignals = {};
const chartInputs = [];
const executionCalls = [];
const runtime = {
  window: {
    FlowSignalStartup: { record() {} },
    NathauxDisplayDataState: api,
  },
  console: { log() {}, warn() {}, error() {} },
  Date,
  Math,
  Number,
  Array,
  Object,
  JSON,
  API_URL: 'https://api.nathauxfx.com/panel-data',
  fetch: async () => ({ ok: true, status: 200, json: async () => structuredClone(payload) }),
  panelRefreshInProgress: false,
  accountSelectionGeneration: 0,
  brokerAccountActionInProgress: false,
  lastGoodPanelData: previousPanel,
  latestRawPanelData: null,
  latestPanelData: null,
  latestPanelMeta: null,
  latestPanelFetchedAt: 0,
  currentChartSymbol: 'EURUSD',
  currentChartTimeframe: '5m',
  MARKET_IS_CLOSED: false,
  _CHART_IDLE_ENABLED: true,
  frozenCandlesCache: null,
  frozenChart: {},
  lastChartData: { EURUSD: { '5m': [] }, XAUUSD: { '5m': [] } },
  paperModal: null,
  paperAutoEnabled: false,
  liveAutoEnabled: false,
  localStorage: { setItem() {} },
  DISPLAY_NAMES: { EURUSD: 'EURUSD', XAUUSD: 'XAUUSD' },
  document: {
    getElementById(id) { return elements[id] || null; },
    querySelector(selector) { return selector === '.main-live' ? elements.mainLive : null; },
  },
  isForexWeekendClosed: () => false,
  isPanelMarketClosed: () => false,
  normalizePanelData: (raw) => ({ EURUSD: { ...raw.EURUSD }, XAUUSD: { ...raw.XAUUSD } }),
  refreshAllNewsImpact() {},
  updatePaperToggleUI() {},
  isAdminAccount: () => false,
  fetchCtraderStatus: async () => null,
  fetchMarketDataSourceStatus: () => executionCalls.push('fetchMarketDataSourceStatus'),
  fetchAutoTradeStatus: () => executionCalls.push('fetchAutoTradeStatus'),
  updateCard(symbol, data) { renderedSignals[symbol] = data.signal; },
  updateMainPanel(symbol) {
    const state = api.fromMeta(runtime.latestPanelMeta);
    elements.mainLive.textContent = `• ${state.statusLabel}`;
    renderedSignals.main = runtime.latestPanelData[symbol].signal;
  },
  renderHistory() {},
  updatePaperPanel() {},
  updateLivePanel() {},
  processVoiceAnnouncements() {},
  renderChartFromPanel(raw, symbol, timeframe) {
    const candles = raw.candles[symbol][timeframe];
    chartInputs.push(...candles);
    runtime.updateChartOverlay(symbol, timeframe, candles);
  },
  ensureTwoMonthChartHistory: async () => [],
  updateUTC() {},
  setConnectionBadge(_state, message) { runtime.connectionMessage = message; },
  executeTrade: () => executionCalls.push('executeTrade'),
  executeLiveOrder: () => executionCalls.push('executeLiveOrder'),
  applyDraggedTradeLevelChange: () => executionCalls.push('applyDraggedTradeLevelChange'),
};
vm.runInNewContext(
  [
    extractFunction('stabilizePanelSignals'),
    extractFunction('formatLivePrice'),
    extractFunction('updateChartOverlay'),
    extractFunction('refreshPanel'),
  ].join('\n'),
  runtime,
);

(async () => {
  assert.equal(await runtime.refreshPanel(), true, 'actual refreshPanel accepts mixed display payload');
  assert.equal(chartInputs.length, 1, 'EURUSD display candles reach renderChartFromPanel');
  assert.match(elements.chartOverlayOhlc.innerHTML, /O <span>1\.17000<\/span>/);
  assert.match(elements.chartOverlayOhlc.innerHTML, /C <span>1\.17500<\/span>/);
  assert.equal(elements.mainLive.textContent, '• ANALYSIS PAUSED');
  runtime.currentChartSymbol = 'XAUUSD';
  assert.equal(await runtime.refreshPanel(), true, 'display refresh also supports XAUUSD');
  assert.equal(chartInputs.length, 2, 'XAUUSD display candles also reach renderChartFromPanel');
  assert.match(elements.chartOverlayOhlc.innerHTML, /O <span>3650\.00<\/span>/);
  assert.match(elements.chartOverlayOhlc.innerHTML, /C <span>3655\.00<\/span>/);
  assert.deepEqual(renderedSignals, { EURUSD: 'WAIT', XAUUSD: 'WAIT', main: 'WAIT' });
  assert.notEqual(renderedSignals.EURUSD, previousPanel.EURUSD.signal);
  assert.notEqual(renderedSignals.XAUUSD, previousPanel.XAUUSD.signal);
  assert.deepEqual(executionCalls, [], 'refresh/render never enters trading or execution paths');
  console.log('dashboard display fallback tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
