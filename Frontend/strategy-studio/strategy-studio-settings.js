/* Presentation metadata only. Executable rules belong to StrategyDefinition. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StrategyStudioSettings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const fields = [];
  const field = (group, key, label, type, value, extra = {}) =>
    fields.push({ group, key, label, type, value, ...extra });
  const select = (g, k, l, v, options, extra = {}) =>
    field(g, k, l, 'select', v, { options, ...extra });

  field('basics', 'description', 'Description', 'text', '', {
    placeholder: 'Describe your edge…',
    maxLength: 240,
  });
  field('basics', 'tags', 'Tags', 'text', '', {
    placeholder: 'Structure, Liquidity, …',
    maxLength: 120,
  });
  field('notes', 'notes', 'Notes', 'textarea', '', {
    maxLength: 500,
    placeholder: 'Add notes about this version, changes, or observations…',
  });
  field('notes', 'version', 'Version', 'text', '1.0.0', {
    maxLength: 24,
  });
  select(
    'notes',
    'testPreset',
    'Test Preset',
    '30 days',
    ['30 days', '3 months', '1 year', '5 years', 'Custom'],
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
      if (f.type === 'select' && f.options.includes(v))
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
  function validate() { return {}; }
  return { fields, defaults, normalize, validate };
});
