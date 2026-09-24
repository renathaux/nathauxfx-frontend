/* Presentation and browser-local configuration for Strategy Studio.
 * Executable strategies remain owned by strategy-studio.js / schema v1. */
(() => {
  'use strict';
  const Settings = window.StrategyStudioSettings;
  const $ = (id) => document.getElementById(id);
  const escape = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c],
    );
  const presetDays = {
    '30 days': '30',
    '3 months': '90',
    '1 year': '365',
    '5 years': '1825',
    Custom: 'custom',
  };
  const storageKey = (id) => `nathauxfx_studio_config_v1:${id}`;
  let snapshot = null,
    handlers = {},
    running = false,
    storageWarning = '';
  function fieldMarkup(f) {
    const id = `setting_${f.key}`;
    const label = `<span>${escape(f.label)}</span>`;
    let control;
    if (f.type === 'toggle')
      control = `<label class="toggle-control"><input id="${id}" type="checkbox" data-setting="${f.key}" aria-label="${escape(f.label)}"><i></i><span data-toggle-text="${f.key}">Off</span></label>`;
    else if (f.type === 'segmented' || f.type === 'checks')
      control = `<div class="${f.type === 'segmented' ? 'choice-row segmented' : 'check-options'}" role="group" aria-label="${escape(f.label)}">${f.options.map((v, i) => `<label class="${f.type === 'segmented' ? 'choice' : ''}"><input type="${f.type === 'segmented' ? 'radio' : 'checkbox'}" name="setting_${f.key}" data-setting="${f.key}" value="${escape(v)}" id="${id}_${i}"><span>${escape(v)}</span></label>`).join('')}</div>`;
    else if (f.type === 'select')
      control = `<select id="${id}" data-setting="${f.key}" aria-label="${escape(f.label)}">${f.options.map((v) => `<option>${escape(v)}</option>`).join('')}</select>`;
    else if (f.type === 'textarea')
      control = `<textarea id="${id}" data-setting="${f.key}" aria-label="${escape(f.label)}" maxlength="${f.maxLength}" placeholder="${escape(f.placeholder)}"></textarea>`;
    else
      control = `<input id="${id}" data-setting="${f.key}" type="${f.type}" aria-label="${escape(f.label)}" ${f.type === 'number' ? `min="${f.min}" step="${f.integer ? 1 : 'any'}"` : `maxlength="${f.maxLength}"`} placeholder="${escape(f.placeholder || '')}">`;
    if (f.unit)
      control = `<div class="unit-input">${control}<span>${escape(f.unit)}</span></div>`;
    return `<div class="field" data-setting-wrap="${f.key}">${label}${control}<small class="field-error" data-error-for="settings.${f.key}"></small></div>`;
  }
  document.querySelectorAll('[data-settings-group]').forEach(
    (node) =>
      (node.innerHTML = Settings.fields
        .filter((f) => f.group === node.dataset.settingsGroup)
        .map(fieldMarkup)
        .join('')),
  );
  function read() {
    const value = { customStart: '', customEnd: '' };
    for (const f of Settings.fields) {
      const controls = [
        ...document.querySelectorAll(`[data-setting="${f.key}"]`),
      ];
      if (f.type === 'checks')
        value[f.key] = controls.filter((n) => n.checked).map((n) => n.value);
      else if (f.type === 'segmented')
        value[f.key] = controls.find((n) => n.checked)?.value || f.value;
      else if (f.type === 'toggle') value[f.key] = controls[0].checked;
      else if (f.type === 'number')
        value[f.key] =
          controls[0].value.trim() === '' ? null : Number(controls[0].value);
      else value[f.key] = controls[0].value;
    }
    value.customStart =
      value.testPreset === 'Custom' ? $('quickStart').value : '';
    value.customEnd = value.testPreset === 'Custom' ? $('quickEnd').value : '';
    return value;
  }
  function assign(raw) {
    const value = Settings.normalize(raw);
    for (const f of Settings.fields)
      document.querySelectorAll(`[data-setting="${f.key}"]`).forEach((node) => {
        if (f.type === 'checks')
          node.checked = value[f.key].includes(node.value);
        else if (f.type === 'segmented')
          node.checked = node.value === value[f.key];
        else if (f.type === 'toggle') node.checked = value[f.key];
        else node.value = value[f.key];
      });
    $('quickPreset').value = presetDays[value.testPreset];
    if (value.testPreset === 'Custom') {
      $('quickStart').value = value.customStart;
      $('quickEnd').value = value.customEnd;
    } else presetRange(presetDays[value.testPreset]);
    return value;
  }
  function purgeLegacyRules() {
    try {
      for (const key of Object.keys(localStorage)) {
        if (!key.startsWith('nathauxfx_studio_config_v1:')) continue;
        let record;
        try { record = JSON.parse(localStorage.getItem(key)); }
        catch (_) { localStorage.removeItem(key); continue; }
        try {
          localStorage.setItem(key, JSON.stringify({
            settings: Settings.normalize(record?.settings),
            savedAt: record?.savedAt || null,
          }));
        } catch (_) {
          // Preserve valid notes when a quota/privacy restriction prevents the
          // rewrite. load() still strips all obsolete rules in memory.
        }
      }
    } catch (_) {
      /* Storage restrictions do not block canonical strategy rules. */
    }
  }
  purgeLegacyRules();
  function load(id) {
    if (!id) return Settings.defaults();
    try {
      return Settings.normalize(
        JSON.parse(localStorage.getItem(storageKey(id)) || '{}').settings,
      );
    } catch (_) {
      return Settings.defaults();
    }
  }
  function save(id, settings) {
    try {
      localStorage.setItem(
        storageKey(id),
        JSON.stringify({
          settings: Settings.normalize(settings),
          savedAt: new Date().toISOString(),
        }),
      );
      storageWarning = '';
      return true;
    } catch (_) {
      storageWarning =
        'Browser storage is unavailable. Your strategy rules were saved, but the presentation metadata could not be saved.';
      return false;
    }
  }
  function remove(id) {
    try {
      localStorage.removeItem(storageKey(id));
    } catch (_) {}
  }
  function savedAt(id) {
    try {
      return (
        JSON.parse(localStorage.getItem(storageKey(id)) || '{}').savedAt || null
      );
    } catch (_) {
      return null;
    }
  }
  function validate() {
    return Object.fromEntries(
      Object.entries(Settings.validate(read())).map(([k, v]) => [
        `settings.${k}`,
        v,
      ]),
    );
  }
  function summaryRows(rows) {
    return rows
      .map(
        ([k, v]) =>
          `<div><dt>${escape(k)}</dt><dd>${escape(v ?? '—')}</dd></div>`,
      )
      .join('');
  }
  function update(next) {
    snapshot = next;
    const values = read();
    $('toolbarSymbol').textContent =
      next.definition.symbols.join(' + ') || 'Select a symbol';
    $('summarySymbol').textContent = $('toolbarSymbol').textContent;
    const status = !next.id
      ? 'Draft strategy'
      : next.coreDirty
        ? 'Unsaved changes'
        : next.valid
          ? 'Ready to backtest'
          : 'Check settings';
    $('toolbarStatus').textContent = status;
    $('summaryStatus').textContent = next.valid
      ? next.id && !next.coreDirty
        ? 'Ready to backtest'
        : 'Ready to save'
      : 'Incomplete';
    $('summaryDescription').textContent =
      values.description ||
      'Add a description to capture the idea behind your strategy.';
    const tags = [
      ...values.tags
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      next.definition.trading_timeframe &&
        `${next.definition.trading_timeframe} entry`,
      next.definition.trend.timeframe &&
        `${next.definition.trend.timeframe} bias`,
    ].filter(Boolean);
    $('summaryTags').innerHTML = tags
      .slice(0, 8)
      .map((t) => `<span>${escape(t)}</span>`)
      .join('');
    const select = $('strategySelect');
    const options =
      '<option value="">New strategy</option>' +
      next.strategies
        .map(
          (s) =>
            `<option value="${escape(s.strategy_id)}">${escape(s.name)}</option>`,
        )
        .join('');
    if (select.innerHTML !== options) select.innerHTML = options;
    select.value = next.id || '';
    select.disabled = next.busy || running;
    $('strategyBuilder').inert = next.busy || running;
    for (const id of ['quickStart','quickEnd','quickSymbol','quickPreset']) $(id).disabled = next.busy || running;
    if (running) $('saveStrategyBtn').disabled = true;
    $('newStrategyBtn').disabled = $('newStrategyWideBtn').disabled = next.busy;
    const saved = savedAt(next.id) || next.current?.updated_at;
    $('lastSaved').textContent = storageWarning
      ? 'Local save unavailable'
      : next.dirty
        ? 'Unsaved changes'
        : saved
          ? `Saved ${new Date(saved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : next.id
            ? 'Saved strategy'
            : 'Not saved yet';
    $('lastSaved').title = storageWarning || '';
    for (const f of Settings.fields) {
      if (f.enabledBy)
        document
          .querySelectorAll(`[data-setting="${f.key}"]`)
          .forEach((n) => (n.disabled = !values[f.enabledBy]));
      if (f.type === 'toggle')
        document.querySelector(`[data-toggle-text="${f.key}"]`).textContent =
          values[f.key] ? 'On' : 'Off';
    }
    $('htfEnabled').checked = Boolean(next.definition.trend.timeframe);
    $('notesCount').textContent = `${values.notes.length} / 500`;
    $('saveVersionBtn').disabled = next.busy || !next.valid;
    $('runBacktestBtn').disabled = $('fastTestBtn').disabled = $('simulatorBtn').disabled =
      next.busy || running || !next.valid;
    if (!running)
      $('quickTestState').textContent = next.coreDirty
        ? 'Changes will be saved before opening Simulator.'
        : next.id
          ? 'Dates are UTC. Results open in Simulator.'
          : 'Save a strategy to run a backtest.';
    const symbolOptions = next.definition.symbols
      .map((s) => `<option>${escape(s)}</option>`)
      .join('');
    if ($('quickSymbol').innerHTML !== symbolOptions)
      $('quickSymbol').innerHTML = symbolOptions;
    $('quickSymbolField').classList.toggle(
      'hidden',
      next.definition.symbols.length < 2,
    );

  }
  function presetRange(days) {
    if (days === 'custom') return;
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end.getTime() - Number(days) * 86400000);
    $('quickEnd').value = end.toISOString().slice(0, 10);
    $('quickStart').value = start.toISOString().slice(0, 10);
  }
  async function run(mode = 'FAST') {
    if (running || snapshot?.busy) return;
    handlers.collect();
    if (!snapshot?.valid) return;
    const start = $('quickStart').value, end = $('quickEnd').value;
    const symbol = $('quickSymbol').value || snapshot.definition.symbols[0];
    const localSettingsAtLaunch = JSON.stringify(read());
    if (!start || !end || Date.parse(end) <= Date.parse(start)) {
      $('quickTestState').textContent = 'Choose an end date after the start date.';
      return;
    }
    let failure = '';
    running = true;
    update(snapshot);
    try {
      $('quickTestState').textContent = 'Preparing saved strategy…';
      let id = snapshot.id;
      if (!id || snapshot.coreDirty) {
        id = await handlers.save();
        if (!id) throw new Error('Strategy was not saved. Fix the highlighted settings or retry saving.');
      } else {
        if (snapshot.dirty && !save(id, read())) throw new Error(storageWarning);
        const validation = await handlers.validate();
        if (!validation.valid) throw new Error('Fix the strategy validation errors before testing.');
      }
      // Validation is asynchronous: never discard edits made while it was pending.
      handlers.collect();
      if (snapshot.id !== id || snapshot.coreDirty || JSON.stringify(read()) !== localSettingsAtLaunch) throw new Error('The strategy changed while preparing the test. Review your changes and run again.');
      const query = new URLSearchParams({ strategy: id, symbol, start, end, mode });
      if (mode === 'FAST') query.set('autostart', '1');
      location.assign(`/strategy-simulator.html?${query}`);
    } catch (error) {
      failure = error.message || 'Could not prepare the backtest.';
    } finally {
      running = false;
      handlers.collect();
      if (failure) $('quickTestState').textContent = failure;
    }
  }
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('nathauxfx_studio_theme', theme);
    } catch (_) {}
    $('themeToggle').setAttribute(
      'aria-label',
      `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`,
    );
    $('themeToggle').setAttribute('aria-pressed', String(theme === 'dark'));
  }
  function search() {
    const query = $('studioSearch').value.trim().toLowerCase();
    const matchingSections = [
      ...document.querySelectorAll('.builder-section'),
    ].filter((s) => query && s.textContent.toLowerCase().includes(query));
    document
      .querySelectorAll('.builder-section')
      .forEach((s) =>
        s.classList.toggle('search-match', matchingSections.includes(s)),
      );
    const matches = query
      ? (snapshot?.strategies || []).filter((s) =>
          s.name.toLowerCase().includes(query),
        )
      : [];
    const results = $('searchResults');
    results.classList.toggle('hidden', !query);
    results.innerHTML =
      matches
        .slice(0, 4)
        .map(
          (s) =>
            `<button type="button" data-search-strategy="${escape(s.strategy_id)}"><strong>${escape(s.name)}</strong><small>Saved strategy</small></button>`,
        )
        .join('') +
      matchingSections
        .slice(0, 5)
        .map(
          (s) =>
            `<button type="button" data-search-section="${s.id}"><strong>${escape(s.querySelector('h2').textContent)}</strong><small>Settings section</small></button>`,
        )
        .join('');
    if (query && !results.children.length)
      results.innerHTML =
        '<p class="search-empty">No matching settings or strategies.</p>';
    results.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', () => {
        if (button.dataset.searchStrategy)
          handlers.open(button.dataset.searchStrategy);
        else {
          const section = $(button.dataset.searchSection);
          section.open = true;
          section.scrollIntoView({ block: 'center', behavior: 'smooth' });
          section.querySelector('summary').focus({ preventScroll: true });
        }
        results.classList.add('hidden');
        $('studioSearch').value = '';
      }),
    );
  }
  function bind(actions) {
    handlers = actions;
    document.querySelectorAll('[data-setting]').forEach((node) =>
      node.addEventListener(
        ['number', 'text', 'textarea'].includes(node.type) ||
          node.tagName === 'TEXTAREA'
          ? 'input'
          : 'change',
        () => {
          handlers.collect();
          if (node.dataset.setting === 'testPreset') {
            const days = presetDays[node.value];
            $('quickPreset').value = days;
            presetRange(days);
          }
        },
      ),
    );
    $('htfEnabled').addEventListener('change', () => {
      const select = $('trendTimeframe');
      if ($('htfEnabled').checked) {
        const option = [...select.options].find((o) => o.value);
        if (option) {
          select.value = option.value;
          const method = document.querySelector(
            '#trendMethodChoices input[value="BOS_CHOCH"]',
          );
          method.checked = true;
        }
      } else select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    $('strategySelect').addEventListener('change', () => {
      $('strategySelect').value
        ? handlers.open($('strategySelect').value)
        : handlers.new();
    });
    $('libraryBtn').addEventListener('click', () => {
      $('studioSearch').value = '';
      document
        .querySelectorAll('.strategy-card')
        .forEach((n) => n.classList.remove('hidden'));
      $('libraryDialog').showModal();
    });
    document
      .querySelectorAll('[data-close-dialog]')
      .forEach((b) =>
        b.addEventListener('click', () => $(b.dataset.closeDialog).close()),
      );
    document.querySelectorAll('[data-edit-section]').forEach((b) =>
      b.addEventListener('click', () => {
        const section = $('section' + b.dataset.editSection);
        section.open = true;
        section.scrollIntoView({ block: 'center', behavior: 'smooth' });
        section
          .querySelector('input,select,textarea')
          ?.focus({ preventScroll: true });
      }),
    );
    $('saveVersionBtn').addEventListener('click', handlers.saveVersion);
    $('themeToggle').addEventListener('click', () =>
      setTheme(
        document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark',
      ),
    );
    $('studioSearch').addEventListener('keydown', (event) => {
      if (event.key === 'Escape') $('searchResults').classList.add('hidden');
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        $('searchResults').querySelector('button')?.focus();
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        $('searchResults').querySelector('button')?.click();
      }
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.studio-search'))
        $('searchResults').classList.add('hidden');
    });
    $('studioSearch').addEventListener('input', () => {
      clearTimeout(search.timer);
      search.timer = setTimeout(search, 250);
    });
    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        $('studioSearch').focus();
      }
    });
    $('fastTestBtn').addEventListener('click', () => run('FAST'));
    $('runBacktestBtn').addEventListener('click', () => run('FAST'));
    $('simulatorBtn').addEventListener('click', () => run('REPLAY'));
    $('quickPreset').addEventListener('change', () => {
      presetRange($('quickPreset').value);
      $('setting_testPreset').value = Object.keys(presetDays).find(
        (k) => presetDays[k] === $('quickPreset').value,
      );
      handlers.collect();
    });
    ['quickStart', 'quickEnd'].forEach((id) =>
      $(id).addEventListener('change', () => {
        $('quickPreset').value = 'custom';
        $('setting_testPreset').value = 'Custom';
        handlers.collect();
      }),
    );
    const nav = document.querySelector(
      '.app-sidebar a[href="/strategy-simulator.html"]',
    );
    nav.addEventListener('click', (event) => {
      event.preventDefault();
      if (snapshot?.id)
        location.assign(
          `/strategy-simulator.html?strategy=${encodeURIComponent(snapshot.id)}`,
        );
      else {
        $('libraryDialog').showModal();
      }
    });
    setTheme(
      document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
    );
    presetRange('30');
  }
  assign(Settings.defaults());
  window.StrategyStudioWorkspace = {
    read,
    assign,
    load,
    save,
    remove,
    validate,
    update,
    bind,
    closeLibrary: () => $('libraryDialog').close(),
    storageWarning: () => storageWarning,
  };
})();
