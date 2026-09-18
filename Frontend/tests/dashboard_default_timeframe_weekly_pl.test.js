const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const performance = fs.readFileSync(path.join(root, 'performance.js'), 'utf8');

// The loaded performance script must leave the real weekly total and label
// intact while displaying the separate month-to-date amount.
const weeklyLabel = {
  textContent: 'WEEKLY P/L',
  closest: () => null,
};
const monthlyLabel = {
  textContent: 'MONTHLY P/L',
  closest: () => null,
};
const payload = {
  meta: {
    live_pl_sync: {
      weekly_realized_pl: -116.32,
      weekly_total_pl: -123.75,
      monthly_realized_pl: -655.32,
      floating_live_pl: -7.43,
      history_window: 'trading_week',
    },
  },
};
const context = {
  window: {
    location: { href: 'https://www.nathauxfx.com/app.html' },
    fetch: async () => new Response(JSON.stringify(payload)),
  },
  document: {
    readyState: 'complete',
    documentElement: {},
    querySelectorAll: () => [weeklyLabel, monthlyLabel],
  },
  MutationObserver: class { observe() {} },
  Response,
  URL,
};
vm.runInNewContext(performance, context);

(async () => {
  const result = await (await context.window.fetch('/dashboard-feed')).json();
  assert.equal(weeklyLabel.textContent, 'WEEKLY P/L');
  assert.equal(monthlyLabel.textContent, 'MONTHLY P/L');
  assert.equal(result.meta.live_pl_sync.weekly_realized_pl, -116.32);
  assert.equal(result.meta.live_pl_sync.weekly_total_pl, -123.75);
  assert.equal(result.meta.live_pl_sync.monthly_realized_pl, -655.32);
  assert.equal(result.meta.live_pl_sync.history_window, 'trading_week');
  console.log('dashboard weekly/monthly P/L regression passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
