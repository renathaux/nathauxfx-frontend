const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

(async () => {
  let scheduled, scheduledDelay, resolveFetch, renders = 0;
  const listeners = {};
  const runtime = {
    accountSelectionGeneration: 0, brokerAccountActionInProgress: false,
    URL, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    localStorage: {getItem: () => null},
    fetch: () => new Promise(resolve => { resolveFetch = resolve; }),
    window: {
      location: {hostname: 'localhost'}, clearTimeout() {},
      setTimeout(fn, delay) { scheduled = fn; scheduledDelay = delay; },
      addEventListener(name, fn) { listeners[name] = fn; },
      dispatchEvent() {},
      FlowSignalSmcRenderer: {mount: () => true, setEnabled() {}, clear() {}, render() { renders++; }},
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../indicators/smc/smc-indicator.js'), 'utf8'), runtime);
  runtime.window.FlowSignalSMC.mount();
  const pending = scheduled();
  runtime.accountSelectionGeneration += 2; // Includes A -> B -> A.
  listeners['flowsignal:account-changed']?.({});
  resolveFetch({ok: true, json: async () => ({bias: 'BULLISH'})});
  await pending;
  assert.equal(renders, 0, 'old-account structure must not redraw the new chart');
  assert.equal(runtime.window.FlowSignalSMC.getState().bias, 'NEUTRAL');
  runtime.brokerAccountActionInProgress = true;
  scheduled();
  assert.ok(scheduledDelay <= 1000, 'SMC retries promptly after account activation');
  console.log('SMC account-switch regression passed');
})();
