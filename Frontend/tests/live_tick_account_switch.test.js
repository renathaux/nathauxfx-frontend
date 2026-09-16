const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
(async () => {
  let scheduled, resolveFetch, updates = 0;
  const listeners = {};
  const runtime = {
    accountSelectionGeneration: 0, brokerAccountActionInProgress: false,
    CustomEvent: class {}, document: {hidden: false, addEventListener() {}},
    fetch: () => new Promise(resolve => {resolveFetch = resolve;}),
    window: {location: {hostname: 'localhost'}, clearTimeout() {}, setInterval() {},
      setTimeout(fn) {scheduled = fn;}, dispatchEvent() {},
      addEventListener(name, fn) {listeners[name] = fn;}},
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../chart/live-candles/live-candle-controller.js'), 'utf8'), runtime);
  const api = runtime.window.FlowSignalLiveCandles;
  api.mount({candleSeries: {setData() {}, update() {updates++;}}});
  api.seed({time: 100, open: 1, high: 1, low: 1, close: 1});
  const pending = scheduled();
  runtime.accountSelectionGeneration++;
  listeners['flowsignal:account-changed']?.();
  resolveFetch({ok: true, json: async () => ({live_prices: {EURUSD: {mid: 2, timestamp: 1000}}})});
  await pending;
  assert.equal(updates, 0, 'late account tick must not update chart');
  assert.equal(api.getState().candle, null, 'previous account candle must not seed a new candle');
  console.log('live-tick account-switch regression passed');
})();
