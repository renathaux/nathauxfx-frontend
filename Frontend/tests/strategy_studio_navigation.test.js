const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const apiClient = fs.readFileSync(path.join(root, 'apiClient.js'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

test('existing app client installs Strategy Studio beside Live Trading', () => {
  assert.match(apiClient, /menuStrategyStudioBtn/);
  assert.match(apiClient, /Strategy Studio/);
  assert.match(apiClient, /\/strategy-studio\.html/);
  assert.match(apiClient, /menuPaperBtn/);
});

test('only Strategy Studio writes are owner-sensitive', () => {
  assert.match(apiClient, /writeMethod[\s\S]*\/strategy-studio\//);
});

test('Strategy Studio assets are no-store', () => {
  const bySource = new Map((vercel.headers || []).map((item) => [item.source, item.headers]));
  for (const source of [
    '/strategy-studio.html',
    '/strategy-studio/strategy-studio-model.js',
    '/strategy-studio/strategy-studio-api.js',
    '/strategy-studio/strategy-studio.js',
  ]) {
    const headers = bySource.get(source) || [];
    assert.ok(headers.some((item) => item.key === 'Cache-Control' && item.value === 'no-store, max-age=0'), source);
  }
});
