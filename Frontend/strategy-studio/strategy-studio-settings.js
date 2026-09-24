/* Browser-only extension settings. Never merge these into the schema v1 strategy
 * definition or simulator payload. Add an explicit capability adapter when the
 * backend supports a field; remove its draft marker only with execution tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StrategyStudioSettings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const fields = [];
  const field = (group, key, label, type, value, extra = {}) =>
    fields.push({ group, key, label, type, value, draft: true, ...extra });
  const number = (g, k, l, v, unit = '', min = 0, extra = {}) =>
    field(g, k, l, 'number', v, { unit, min, ...extra });
  const select = (g, k, l, v, options, extra = {}) =>
    field(g, k, l, 'select', v, { options, ...extra });
  const toggle = (g, k, l, v, extra = {}) => field(g, k, l, 'toggle', v, extra);
  field('basics', 'description', 'Description', 'text', '', {
    placeholder: 'Describe your edge…',
    maxLength: 240,
    draft: false,
  });
  select(
    'basics',
    'direction',
    'Strategy Type',
    'Long & Short',
    ['Long & Short', 'Long Only', 'Short Only'],
    { type: 'segmented' },
  );
  field('basics', 'tags', 'Tags', 'text', '', {
    placeholder: 'Structure, Liquidity, …',
    maxLength: 120,
    draft: false,
  });
  select('market', 'structureTimeframe', 'Structure Timeframe', '15m', [
    '5m',
    '15m',
    '1h',
    '4h',
  ]);
  select(
    'market',
    'biasDirection',
    'Direction Alignment',
    'Same as HTF trend',
    ['Same as HTF trend', 'Opposite HTF trend', 'Any direction'],
  );
  field(
    'market',
    'sessions',
    'Trading Sessions',
    'checks',
    ['London', 'New York'],
    { options: ['London', 'New York', 'Tokyo', 'Sydney'] },
  );
  field(
    'market',
    'days',
    'Days of Week',
    'checks',
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    { options: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  );
  select('structure', 'structureModel', 'Structure Model', 'Swing High/Low', [
    'Swing High/Low',
    'Internal structure',
  ]);
  select('structure', 'chochRule', 'CHOCH Rule', 'Wick or close', [
    'Wick or close',
    'Close beyond swing',
  ]);
  toggle('structure', 'liquiditySweep', 'Liquidity Sweep', false);
  number('structure', 'lookback', 'Structure Lookback', 50, 'bars', 1, {
    integer: true,
  });
  number(
    'confirmation',
    'confirmationCount',
    'Min. Confirmation Candles',
    1,
    '',
    1,
    { integer: true },
  );
  toggle('confirmation', 'volumeFilter', 'Volume Filter', false);
  toggle('confirmation', 'atrFilter', 'ATR Filter', false);
  number('confirmation', 'atrPeriod', 'ATR Period', 14, '', 1, {
    integer: true,
    enabledBy: 'atrFilter',
  });
  number('confirmation', 'minAtr', 'Minimum ATR', 5, 'pips', 0, {
    enabledBy: 'atrFilter',
  });
  number('confirmation', 'freshness', 'Setup Freshness', 25, 'bars', 1, {
    integer: true,
  });
  select(
    'entry',
    'entryStyle',
    'Entry Style',
    'Market',
    ['Market', 'Limit', 'Stop'],
    { type: 'segmented' },
  );
  number('entry', 'entryMin', 'Entry Distance from HTF Zone', 0, 'pips');
  number('entry', 'entryMax', 'Max Entry Distance', 50, 'pips');
  toggle('entry', 'slFilter', 'SL Distance Filter', false);
  select(
    'entry',
    'slMode',
    'SL Distance Mode',
    'Pips',
    ['Pips', '% of Entry', 'ATR Multiple'],
    { enabledBy: 'slFilter' },
  );
  number('entry', 'slMin', 'SL Distance Min', 10, '', 0, {
    enabledBy: 'slFilter',
  });
  number('entry', 'slMax', 'SL Distance Max', 200, '', 0, {
    enabledBy: 'slFilter',
  });
  number('entry', 'stopLossR', 'Stop Loss (R)', 1, 'R', 0.01);
  toggle('entry', 'closeOpposite', 'Close on Opposite Signal', false);
  number('risk', 'initialBalance', 'Initial Balance (backtest)', 10000, '$', 1);
  number('risk', 'maxOpen', 'Max Open Trades', 1, '', 1, { integer: true });
  number('risk', 'maxSimultaneous', 'Max Simultaneous Trades', 1, '', 1, {
    integer: true,
  });
  toggle('risk', 'onePerSymbol', 'One Trade Per Symbol', true);
  number('risk', 'cooldown', 'Cooldown After Trade', 0, 'min', 0, {
    integer: true,
  });
  toggle('risk', 'protectedStop', 'Protected Stop', false);
  number('risk', 'breakEven', 'Break-even Trigger', 1, 'R', 0.01, {
    enabledBy: 'protectedStop',
  });
  toggle('risk', 'trailStop', 'Trail Stop', false);
  toggle('filters', 'sessionFilter', 'Session Filter', false);
  toggle('filters', 'dayFilter', 'Day of Week Filter', false);
  toggle('filters', 'spreadFilter', 'Spread Filter', false);
  number('filters', 'maxSpread', 'Max Spread', 2, 'pips', 0, {
    enabledBy: 'spreadFilter',
  });
  toggle('filters', 'htfTrendFilter', 'Higher Timeframe Trend Filter', false);
  select(
    'filters',
    'htfTrendTimeframe',
    'Trend Timeframe',
    '4h',
    ['15m', '1h', '4h'],
    { enabledBy: 'htfTrendFilter' },
  );
  select(
    'filters',
    'trendDirection',
    'Direction Mode',
    'Same as trade',
    ['Same as trade', 'Opposite trade'],
    { enabledBy: 'htfTrendFilter' },
  );
  select('costs', 'spreadMode', 'Spread Mode', 'None', [
    'None',
    'Fixed',
    'Variable / realistic',
  ]);
  number('costs', 'spreadValue', 'Spread Value', 1.2, 'pips');
  number('costs', 'commission', 'Commission (per lot)', 0, '$');
  select('costs', 'slippageModel', 'Slippage Model', 'None', [
    'None',
    'Fixed pips',
  ]);
  number('costs', 'slippage', 'Slippage Value', 0, 'pips');
  select('costs', 'intrabar', 'Ambiguous Intrabar Handling', 'Ignore', [
    'Ignore',
    'Conservative / worst case',
    'Best case',
  ]);
  toggle('costs', 'dataQuality', 'Data Quality Filter', false);
  number('costs', 'minBars', 'Minimum Bars Required', 1000, '', 1, {
    integer: true,
    enabledBy: 'dataQuality',
  });
  field('notes', 'notes', 'Notes', 'textarea', '', {
    maxLength: 500,
    placeholder: 'Add notes about this version, changes, or observations…',
    draft: false,
  });
  field('notes', 'version', 'Version', 'text', '1.0.0', {
    maxLength: 24,
    draft: false,
  });
  select(
    'notes',
    'testPreset',
    'Test Preset',
    '30 days',
    ['30 days', '3 months', '1 year', '5 years', 'Custom'],
    { draft: false },
  );
  function defaults() {
    return {
      customStart: '',
      customEnd: '',
      ...Object.fromEntries(
        fields.map((f) => [
          f.key,
          Array.isArray(f.value) ? [...f.value] : f.value,
        ]),
      ),
    };
  }
  function normalize(raw = {}) {
    const output = defaults();
    for (const f of fields) {
      const v = raw?.[f.key];
      if (v == null) continue;
      if (f.type === 'number' && typeof v === 'number' && Number.isFinite(v))
        output[f.key] = v;
      else if (f.type === 'toggle' && typeof v === 'boolean') output[f.key] = v;
      else if (f.type === 'checks' && Array.isArray(v))
        output[f.key] = f.options.filter((x) => v.includes(x));
      else if (
        ['select', 'segmented'].includes(f.type) &&
        f.options.includes(v)
      )
        output[f.key] = v;
      else if (['text', 'textarea'].includes(f.type) && typeof v === 'string')
        output[f.key] = v.slice(0, f.maxLength);
    }
    for (const key of ['customStart', 'customEnd']) {
      const date = raw?.[key];
      if (
        typeof date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        Number.isFinite(Date.parse(date)) &&
        new Date(date).toISOString().slice(0, 10) === date
      )
        output[key] = date;
    }
    return output;
  }
  function validate(value) {
    const errors = {};
    for (const f of fields) {
      const v = value[f.key];
      if (f.type === 'number' && (!f.enabledBy || value[f.enabledBy])) {
        if (typeof v !== 'number' || !Number.isFinite(v))
          errors[f.key] = 'Enter a valid number.';
        else if (v < f.min) errors[f.key] = `Must be at least ${f.min}.`;
        else if (f.integer && !Number.isInteger(v))
          errors[f.key] = 'Use a whole number.';
      }
    }
    for (const [min, max] of [
      ['slMin', 'slMax'],
      ['entryMin', 'entryMax'],
    ])
      if ((min !== 'slMin' || value.slFilter) && value[max] < value[min])
        errors[max] = 'Maximum must be at least the minimum.';
    return errors;
  }
  return { fields, defaults, normalize, validate };
});
