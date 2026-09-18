const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const dashboard = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');

// An untouched dashboard load must show the strategy's 5-minute chart.
const chartInitialization = dashboard.match(/let currentChartSymbol = [^;]+;\s*let currentChartTimeframe = [^;]+;/)?.[0];
assert.ok(chartInitialization, 'dashboard chart initialization exists');
const initialTimeframe = vm.runInNewContext(`${chartInitialization}\ncurrentChartTimeframe`);
assert.equal(initialTimeframe, '5m');
assert.match(html, /id="chartOverlayTitle">EURUSD · 5m</);

console.log('dashboard 5m default regression passed');
