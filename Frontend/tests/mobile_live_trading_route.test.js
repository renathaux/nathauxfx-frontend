const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const mobile = fs.readFileSync(path.join(root, 'mobile.html'), 'utf8');
const startup = fs.readFileSync(path.join(root, 'startup.js'), 'utf8');

test('explicit desktop mode is not redirected back to mobile dashboard', () => {
  assert.match(app, /params\.get\(["']desktop["']\)\s*!==\s*["']1["']/);
  assert.match(app, /window\.innerWidth\s*<=\s*700/);
});

test('mobile Live Trading routes directly to authenticated app desktop mode', () => {
  assert.match(mobile, /href="\/app\?desktop=1&open=menuPaperBtn"[^>]*><span>↗<\/span><strong>Live Trading<\/strong>/);
  assert.doesNotMatch(mobile, /href="index\.html\?desktop=1&open=menuPaperBtn"/);
});

test('startup supports requested desktop panel and Live Trading target', () => {
  assert.match(startup, /params\.get\(["']desktop["']\)\s*===\s*["']1["']/);
  assert.match(startup, /menuPaperBtn/);
  assert.match(startup, /openRequestedDesktopPanel/);
});
