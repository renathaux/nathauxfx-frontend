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
    result = null,
    resultIdentity = '',
    resultLabel = '',
    storageWarning = '';
  const identity = (s) => JSON.stringify([s?.id, s?.name, s?.definition]);
  function fieldMarkup(f) {
    const id = `setting_${f.key}`;
    const label = `<span>${escape(f.label)} ${f.draft ? '<span class="draft-marker" title="Saved locally; not applied to backtests or LIVE">DRAFT</span>' : ''}</span>`;
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
        'Browser storage is unavailable. Your strategy rules were saved, but the local draft settings could not be saved.';
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
  function money(value) {
    return value == null || !Number.isFinite(Number(value))
      ? '—'
      : Number(value).toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 2,
        });
  }
  function setMetric(id, value, type = 'number', signed = false) {
    const n = $(id);
    n.textContent =
      type === 'money'
        ? money(value)
        : window.StrategySimulatorModel.formatMetric(value, type);
    n.classList.remove('positive', 'negative');
    if (
      signed &&
      value != null &&
      Number.isFinite(Number(value)) &&
      Number(value) !== 0
    )
      n.classList.add(Number(value) > 0 ? 'positive' : 'negative');
  }
  function drawCurve() {
    const rows =
      result?.equity_curve?.filter((r) => Number.isFinite(Number(r.balance))) ||
      [];
    if (!rows.length) {
      $('equityChart').innerHTML =
        '<div class="chart-empty"><strong>Your strategy, over time.</strong><span>Run a backtest to plot the balance curve.</span></div>';
      return;
    }
    const drawdown = $('curveMode').value === 'drawdown';
    let peak = Number(rows[0].balance);
    const values = rows.map((r) => {
      const balance = Number(r.balance);
      peak = Math.max(peak, balance);
      return drawdown ? balance - peak : balance;
    });
    const min = values.reduce((a, v) => Math.min(a, v), Infinity),
      max = values.reduce((a, v) => Math.max(a, v), -Infinity),
      span = max - min || Math.max(1, Math.abs(max) * 0.01);
    const points = values.map((v, i) => [
      42 + (i / Math.max(1, values.length - 1)) * 280,
      15 + ((max - v) / span) * 124,
    ]);
    const color = drawdown ? 'var(--negative)' : 'var(--positive)';
    const poly = points.map((p) => p.join(',')).join(' ');
    const labels = [max, (max + min) / 2, min]
      .map(
        (v, i) =>
          `<text x="3" y="${18 + i * 62}">${Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toFixed(0)}</text>`,
      )
      .join('');
    $('equityChart').innerHTML =
      `<svg viewBox="0 0 340 178" role="img" aria-label="${drawdown ? 'Drawdown' : 'Balance'} by trade from actual backtest"><defs><linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".25"/><stop offset="1" stop-color="${color}" stop-opacity=".01"/></linearGradient></defs>${labels}<polygon points="42,147 ${poly} 322,147" fill="url(#equityFill)"/><polyline points="${poly}" fill="none" stroke="${color}" stroke-width="1.6"/><text x="42" y="168">Start</text><text x="148" y="168">Closed trades</text><text x="310" y="168">${escape(rows.at(-1).trade ?? rows.length - 1)}</text></svg>`;
  }
  function renderResults() {
    const m = result?.metrics || {};
    setMetric('metricNetPl', m.net_pl, 'money', true);
    setMetric('metricWinRate', m.win_rate, 'percent');
    setMetric('metricTrades', m.total_resolved_trades);
    setMetric('metricProfitFactor', m.profit_factor);
    setMetric(
      'metricDrawdown',
      m.max_drawdown_dollars == null ? null : -Math.abs(m.max_drawdown_dollars),
      'money',
      true,
    );
    setMetric('metricAverageR', m.average_r, 'r', true);
    setMetric(
      'resultInitial',
      m.starting_balance ?? result?.starting_balance,
      'money',
    );
    setMetric('resultFinal', m.ending_balance, 'money');
    setMetric(
      'resultReturn',
      Number(m.starting_balance) > 0
        ? (Number(m.net_pl) / Number(m.starting_balance)) * 100
        : null,
      'percent',
      true,
    );
    $('metricsCaption').textContent = result
      ? resultLabel
      : 'Run a backtest to see performance.';
    $('actualAssumptions').classList.toggle('hidden', !result);
    const actual = result?.assumptions || {};
    $('actualAssumptionsList').innerHTML = summaryRows([
      [
        'Initial balance',
        money(m.starting_balance ?? result?.starting_balance),
      ],
      ...Object.entries(actual).map(([k, v]) => [
        k.replaceAll('_', ' '),
        typeof v === 'boolean'
          ? v
            ? 'Yes'
            : 'No'
          : typeof v === 'object'
            ? JSON.stringify(v)
            : v,
      ]),
    ]);
    if (result && !Object.keys(actual).length)
      $('actualAssumptionsList').innerHTML +=
        '<div><dt>Other assumptions</dt><dd>Not reported</dd></div>';
    drawCurve();
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
    select.disabled = next.busy;
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
    $('runBacktestBtn').disabled = $('fastTestBtn').disabled =
      next.busy || running || !next.id || !next.valid || next.coreDirty;
    if (!running)
      $('quickTestState').textContent = next.coreDirty
        ? 'Save your changes before testing.'
        : next.id
          ? 'Dates are UTC. Runs saved rules; draft settings are not applied.'
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
    const currentIdentity = identity(next);
    if (result && resultIdentity !== currentIdentity) {
      result = null;
      renderResults();
    }
    $('assumptionsSummary').innerHTML = summaryRows([
      ['Initial balance', money(values.initialBalance)],
      ['Spread mode', values.spreadMode],
      ['Commission', money(values.commission) + '/lot'],
      [
        'Slippage',
        values.slippageModel === 'None' ? 'None' : values.slippage + ' pips',
      ],
      ['Intrabar', values.intrabar],
      ['Close on opposite', values.closeOpposite ? 'Yes' : 'No'],
      ['One per symbol', values.onePerSymbol ? 'Yes' : 'No'],
      ['Data quality', values.dataQuality ? 'Yes' : 'No'],
      ['Minimum bars', values.minBars],
    ]);
  }
  function presetRange(days) {
    if (days === 'custom') return;
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end.getTime() - Number(days) * 86400000);
    $('quickEnd').value = end.toISOString().slice(0, 10);
    $('quickStart').value = start.toISOString().slice(0, 10);
  }
  async function run() {
    if (running || !snapshot?.id || snapshot.coreDirty || !snapshot.valid)
      return;
    const start = $('quickStart').value,
      end = $('quickEnd').value;
    if (!start || !end || Date.parse(end) <= Date.parse(start)) {
      $('quickTestState').textContent =
        'Choose an end date after the start date.';
      return;
    }
    const selected = JSON.parse(JSON.stringify(snapshot));
    const testIdentity = identity(selected);
    const symbol = $('quickSymbol').value || selected.definition.symbols[0];
    try {
      running = true;
      update(snapshot);
      $('quickTestState').textContent = 'Running backtest…';
      const payload = window.StrategySimulatorModel.buildRunPayload({
        strategyId: selected.id,
        strategyName: selected.name,
        strategyDefinition: selected.definition,
        symbol,
        start: start + 'T00:00:00.000Z',
        end: end + 'T00:00:00.000Z',
        mode: 'FAST',
      });
      const response = await window.StrategySimulatorApi.runSimulation(
        payload,
        {
          onProgress: (p) => {
            $('quickTestState').textContent =
              `Backtesting period ${p.current} of ${p.total}…`;
          },
        },
      );
      if (identity(snapshot) !== testIdentity) return;
      result = Array.isArray(response.batch_results)
        ? window.StrategySimulatorModel.aggregateSimulationResults(
            response.batch_results,
          )
        : response;
      resultIdentity = testIdentity;
      resultLabel = `${symbol} · ${start} → ${end} · saved rules`;
      renderResults();
      $('quickTestState').textContent =
        'Backtest complete. Metrics use the engine’s actual assumptions.';
    } catch (error) {
      if (identity(snapshot) === testIdentity)
        $('quickTestState').textContent =
          error.message || 'Backtest failed. Please try again.';
    } finally {
      running = false;
      $('runBacktestBtn').disabled = $('fastTestBtn').disabled =
        snapshot.busy || !snapshot.id || !snapshot.valid || snapshot.coreDirty;
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
    $('integrationInfoBtn').addEventListener('click', () =>
      $('integrationDialog').showModal(),
    );
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
    $('fastTestBtn').addEventListener('click', run);
    $('runBacktestBtn').addEventListener('click', run);
    $('curveMode').addEventListener('change', drawCurve);
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
    renderResults();
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
