const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');
// Execute the actual dashboard refresh function, with only external UI effects stubbed.
const start = script.indexOf('async function refreshPanel()');
const end = script.indexOf('\nfunction ', start);
const nextAsync = script.indexOf('\nasync function ', start + 1);
const functionSource = script.slice(start, Math.min(...[end, nextAsync].filter(n => n >= 0)));

async function checkLateResponse() {
  let resolveFetch;
  let rendered = false;
  const runtime = {
    window: {}, console: {log() {}, warn() {}, error() {}},
    panelRefreshInProgress: false, accountSelectionGeneration: 0,
    brokerAccountActionInProgress: false, lastGoodPanelData: null,
    API_URL: '/panel-data', isForexWeekendClosed: () => false,
    fetch: () => new Promise(resolve => {resolveFetch = resolve;}),
    stabilizePanelSignals: () => {rendered = true; throw Error('old panel reached renderer');},
    setConnectionBadge() {}, updateUTC() {},
  };
  vm.runInNewContext(functionSource, runtime);
  const pending = runtime.refreshPanel();
  runtime.accountSelectionGeneration++;
  resolveFetch({ok: true, status: 200, json: async () => ({EURUSD: {signal: 'BUY'}})});
  await pending;
  assert.equal(rendered, false, 'response started before switch must be discarded before signal stabilization');
  assert.equal(runtime.panelRefreshInProgress, false);
}
checkLateResponse().then(() => console.log('account-switch late-response regression passed'));
