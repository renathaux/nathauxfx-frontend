const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');

test('production never loads the retired saved geometry runtime', () => {
  const html = read('../manual-replay.html');
  assert.doesNotMatch(html, /src="[^"]*manual-replay-saved-layout/);
  assert.match(html, /class="workspace-left"/);
  assert.match(html, /class="lower-grid"/);
});

test('layout editor exits before reading storage or touching production DOM', () => {
  const forbidden = () => { throw new Error('Editor touched production state'); };
  for (const search of ['', '?layoutEdit=0', '?layoutEdit=true']) {
    vm.runInNewContext(read('manual-replay-layout-editor.js'), {
      URLSearchParams, window: {location: {search}},
      localStorage: {getItem: forbidden}, document: new Proxy({}, {get: forbidden}),
    });
  }
});

test('production stylesheet owns responsive layout without translated cards or geometry patches', () => {
  const css = read('manual-replay.css');
  assert.doesNotMatch(css, /translate3d|2000[012]|margin-top:\s*(34|66)px/);
  assert.match(css, /\.main-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.lower-grid\s*\{[^}]*display:\s*grid/);
  assert.match(css, /body\[data-replay-theme="dark"\]/);
});

test('compact replay starts with setup and omits the redundant title/status row', () => {
  const html = read('../manual-replay.html');
  assert.doesNotMatch(html, /class="page-heading"|Manual Trading Replay|Pure manual trading simulation/);
  assert.match(html, /<main class="shell">\s*<section class="panel setup-panel">/);
});

test('the synchronized pair toolbar belongs to the chart fullscreen frame', () => {
  const html = read('../manual-replay.html');
  const frame = html.indexOf('<div class="chart-wrap">');
  const title = html.indexOf('id="chartTitle"');
  const plot = html.indexOf('class="chart-plot"');
  assert.ok(frame < title && title < plot, 'pair header must be above the plot inside fullscreen');
});
