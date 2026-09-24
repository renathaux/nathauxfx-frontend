const test = require('node:test');
const assert = require('node:assert/strict');
const Settings = require('../strategy-studio/strategy-studio-settings.js');
test('local settings whitelist only presentation metadata and purge all legacy rules', () => {
  const old = { description:'My strategy', tags:'Gold', notes:'Test', version:'1.0.0', testPreset:'Custom', customStart:'2024-01-01', customEnd:'2024-01-15', slFilter:true, slMin:0.4, slMax:0.6, structureTimeframe:'15m', freshness:12, commission:7, direction:'Long Only', sessions:['London'] };
  const result = Settings.normalize(old);
  assert.deepEqual(Object.keys(result).sort(), ['description','tags','notes','version','testPreset','customStart','customEnd'].sort());
  assert.equal(result.description,'My strategy');
  assert.equal(result.customStart,'2024-01-01');
  assert.deepEqual(Settings.validate(result),{});
});
test('metadata normalization bounds text and accepts only real dates', () => {
  assert.equal(Settings.normalize({notes:'x'.repeat(600)}).notes.length,500);
  assert.equal(Settings.normalize({customStart:'2024-02-30'}).customStart,'');
});
