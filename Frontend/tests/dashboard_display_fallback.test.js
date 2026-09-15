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
assert.deepEqual(
  {
    ...api.fromMeta({
      stale_data: true,
      display_only_fallback: true,
      analysis_available: false,
      display_data_source: 'persisted_ctrader_closed_candles',
    }),
  },
  { displayOnly: true, analysisAvailable: false, statusLabel: 'ANALYSIS PAUSED' },
);

assert.match(html, /display-data-state\.js\?v=1/);
assert.match(script, /NathauxDisplayDataState/);
console.log('dashboard display fallback tests passed');
