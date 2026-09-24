const test = require('node:test');
const assert = require('node:assert/strict');
const Settings = require('../strategy-studio/strategy-studio-settings.js');
test('extension defaults are isolated and contain the requested settings', () => {
  const a = Settings.defaults(),
    b = Settings.defaults();
  a.sessions.push('Tokyo');
  assert.deepEqual(b.sessions, ['London', 'New York']);
  for (const key of [
    'slFilter',
    'slMode',
    'slMin',
    'slMax',
    'spreadMode',
    'commission',
    'slippageModel',
    'slippage',
    'intrabar',
    'dataQuality',
    'minBars',
    'biasDirection',
    'entryMin',
    'entryMax',
    'freshness',
  ])
    assert.ok(key in b, key);
});
test('normalization rejects unknown fields, invalid enums and non-finite values', () => {
  const s = Settings.normalize({
    slMode: 'bogus',
    commission: Infinity,
    notes: 'x'.repeat(600),
    sessions: ['London', 'invalid'],
    injected: true,
  });
  assert.equal(s.slMode, 'Pips');
  assert.equal(s.commission, 0);
  assert.equal(s.notes.length, 500);
  assert.deepEqual(s.sessions, ['London']);
  assert.equal(s.injected, undefined);
});
test('validation catches reversed ranges and invalid numeric values', () => {
  assert.match(
    Settings.validate({
      ...Settings.defaults(),
      slFilter: true,
      slMin: 40,
      slMax: 10,
    }).slMax,
    /minimum/,
  );
  assert.match(
    Settings.validate({ ...Settings.defaults(), commission: -1 }).commission,
    /least/,
  );
  assert.match(
    Settings.validate({ ...Settings.defaults(), entryMin: 80, entryMax: 20 })
      .entryMax,
    /minimum/,
  );
  assert.match(
    Settings.validate({
      ...Settings.defaults(),
      dataQuality: true,
      minBars: 1.5,
    }).minBars,
    /whole/,
  );
  assert.deepEqual(Settings.validate(Settings.defaults()), {});
});

test('disabled draft filters do not block saving inactive values', () => {
  assert.deepEqual(
    Settings.validate({
      ...Settings.defaults(),
      slFilter: false,
      slMin: null,
      slMax: -1,
      atrFilter: false,
      atrPeriod: null,
      dataQuality: false,
      minBars: null,
      protectedStop: false,
      breakEven: -1,
    }),
    {},
  );
});

test('custom test endpoints survive normalization without accepting arbitrary date text', () => {
  const value = Settings.normalize({
    ...Settings.defaults(),
    testPreset: 'Custom',
    customStart: '2024-01-01',
    customEnd: '2024-01-15',
  });
  assert.equal(value.customStart, '2024-01-01');
  assert.equal(value.customEnd, '2024-01-15');
  assert.equal(
    Settings.normalize({ customStart: 'not-a-date' }).customStart,
    '',
  );
});
