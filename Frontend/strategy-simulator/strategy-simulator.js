(() => {
  'use strict';

  const Model = window.StrategySimulatorModel;
  const Api = window.StrategySimulatorApi;
  if (!Model || !Api) return;

  const $ = (id) => document.getElementById(id);
  const state = { strategy: null, result: null, replayIndex: 0, busy: false, coverage: null };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[char]);
  }

  function notice(message, kind = '') {
    const node = $('simNotice');
    node.textContent = message || '';
    node.className = `notice ${kind}`.trim();
    node.classList.toggle('hidden', !message);
  }

  function toLocalInput(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function availableYearRange() {
    const earliest = state.coverage?.earliest ? new Date(state.coverage.earliest) : null;
    const latest = state.coverage?.latest ? new Date(state.coverage.latest) : null;
    const current = new Date().getFullYear();
    const first = earliest && !Number.isNaN(earliest.getTime())
      ? earliest.getFullYear()
      : current - 5;
    const last = latest && !Number.isNaN(latest.getTime())
      ? latest.getFullYear()
      : current;
    const years = [];
    for (let year = first; year <= last; year += 1) years.push(year);
    return years;
  }

  function populateYearJump(id, selectedYear) {
    const select = $(id);
    if (!select) return;
    const years = availableYearRange();
    select.innerHTML = years
      .map((year) => `<option value="${year}">${year}</option>`)
      .join('');
    const target = Number(selectedYear);
    if (years.includes(target)) select.value = String(target);
  }

  function syncYearJump(inputId, selectId) {
    const input = $(inputId);
    const select = $(selectId);
    if (!input || !select || !input.value) return;
    const value = new Date(input.value);
    if (!Number.isNaN(value.getTime())) {
      const year = value.getFullYear();
      if (![...select.options].some((option) => Number(option.value) === year)) {
        populateYearJump(selectId, year);
      }
      select.value = String(year);
    }
  }

  function syncAllYearJumps() {
    populateYearJump('startYear', new Date($('startDate').value || Date.now()).getFullYear());
    populateYearJump('endYear', new Date($('endDate').value || Date.now()).getFullYear());
    syncYearJump('startDate', 'startYear');
    syncYearJump('endDate', 'endYear');
  }

  function applyYearJump(inputId, selectId) {
    const input = $(inputId);
    const select = $(selectId);
    if (!input || !select || !input.value) return;
    const nextYear = Number(select.value);
    const current = new Date(input.value);
    if (!Number.isFinite(nextYear) || Number.isNaN(current.getTime())) return;

    const month = current.getMonth();
    const date = current.getDate();
    current.setDate(1);
    current.setFullYear(nextYear);
    current.setMonth(month);
    const lastDay = new Date(nextYear, month + 1, 0).getDate();
    current.setDate(Math.min(date, lastDay));
    input.value = toLocalInput(current);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function inputToIso(id) {
    const value = $(id).value;
    if (!value) throw new Error('Choose both a start and end date.');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error('Invalid simulation date.');
    return date.toISOString();
  }

  function coverageDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  async function refreshHistoryCoverage() {
    const symbol = $('symbolSelect').value;
    if (!symbol) return;
    $('historyCoverage').textContent = 'Checking available history…';
    try {
      const coverage = await Api.historyCoverage(symbol);
      state.coverage = coverage;
      syncAllYearJumps();
      if (!coverage.earliest || !coverage.latest) {
        $('historyCoverage').textContent = `No static history available for ${symbol}.`;
        return;
      }
      const backfill = coverage.backfill;
      const backfillText = backfill?.complete && Number(backfill?.requested_years || 0) >= 5
        ? ' • 5Y backfill complete'
        : backfill?.complete === false
          ? ' • 5Y backfill in progress'
          : '';
      $('historyCoverage').textContent =
        `Available: ${coverageDate(coverage.earliest)} → ${coverageDate(coverage.latest)}${backfillText}`;
    } catch (error) {
      state.coverage = null;
      $('historyCoverage').textContent = error.message || 'History coverage unavailable.';
    }
  }

  async function useFullFiveYearHistory() {
    if (!state.coverage?.earliest || !state.coverage?.latest) {
      await refreshHistoryCoverage();
    }
    const coverage = state.coverage;
    if (!coverage?.earliest || !coverage?.latest) {
      notice('Five-year static history is not available yet.', 'error');
      return;
    }
    const earliest = new Date(coverage.earliest);
    const latest = new Date(coverage.latest);
    const spanDays = (latest.getTime() - earliest.getTime()) / (24 * 60 * 60 * 1000);
    const hasFiveYears = Number(coverage.months || 0) >= 59 && spanDays >= 5 * 365 - 45;
    if (!hasFiveYears) {
      notice('The five-year candle backfill is still running. Try again after the history update completes.', 'error');
      return;
    }
    const fiveYearsAgo = new Date(latest);
    fiveYearsAgo.setUTCFullYear(fiveYearsAgo.getUTCFullYear() - 5);
    const start = earliest > fiveYearsAgo ? earliest : fiveYearsAgo;
    const end = new Date(latest.getTime() + 5 * 60 * 1000);
    $('startDate').value = toLocalInput(start);
    $('endDate').value = toLocalInput(end);
    syncAllYearJumps();
    notice('');
  }

  function setDefaultDates() {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    $('startDate').value = toLocalInput(start);
    $('endDate').value = toLocalInput(end);
    syncAllYearJumps();
  }

  function setBusy(value, label = '') {
    state.busy = Boolean(value);
    $('fastRunBtn').disabled = state.busy || !state.strategy;
    $('replayRunBtn').disabled = state.busy || !state.strategy;
    $('runState').textContent = label;
  }

  function riskOverride() {
    if (!$('riskOverrideEnabled').checked) return null;
    const value = Number($('riskValue').value);
    if (!Number.isFinite(value) || value <= 0) throw new Error('Risk override must be greater than zero.');
    return { method: $('riskMethod').value, value };
  }

  function renderMetrics(metrics = {}) {
    $('metricNetPl').textContent = Model.formatMetric(metrics.net_pl, 'money');
    $('metricEndingBalance').textContent = Model.formatMetric(metrics.ending_balance, 'money');
    $('metricWinRate').textContent = Model.formatMetric(metrics.win_rate, 'percent');
    $('metricTrades').textContent = Model.formatMetric(metrics.total_resolved_trades);
    $('metricAverageR').textContent = Model.formatMetric(metrics.average_r, 'r');
    $('metricDrawdown').textContent = `${Model.formatMetric(metrics.max_drawdown_dollars, 'money')} • ${Model.formatMetric(metrics.max_drawdown_percent, 'percent')}`;
    $('metricProfitFactor').textContent = Model.formatMetric(metrics.profit_factor);
    $('metricAmbiguous').textContent = Model.formatMetric(metrics.ambiguous_trades);
  }

  const DIAGNOSTIC_STAGES = [
    ['trend', 'Trend passed'],
    ['structure', 'Structure found'],
    ['break_validation', 'Break rules passed'],
    ['confirmation', 'Confirmation passed'],
    ['entry', 'Entry available'],
    ['stop_loss', 'Stop loss available'],
    ['tp2', 'TP2 available'],
    ['risk', 'Risk passed'],
  ];

  const DIAGNOSTIC_REASON_LABELS = {
    BOS_CHOCH_REQUIRED: 'No BOS/CHOCH setup on candle',
    TREND_BOS_CHOCH_DISAGREES: 'Higher-timeframe BOS/CHOCH disagreed',
    TREND_EMA_50_DISAGREES: 'EMA 50 trend disagreed',
    TREND_EMA_200_DISAGREES: 'EMA 200 trend disagreed',
    TREND_SWING_STRUCTURE_DISAGREES: 'Swing-structure trend disagreed',
    TREND_BOS_CHOCH_UNAVAILABLE: 'Higher-timeframe BOS/CHOCH was unavailable',
    TREND_EMA_50_UNAVAILABLE: 'EMA 50 trend was unavailable',
    TREND_EMA_200_UNAVAILABLE: 'EMA 200 trend was unavailable',
    TREND_SWING_STRUCTURE_UNAVAILABLE: 'Swing-structure trend was unavailable',
    BREAK_CLOSE_NOT_BEYOND: 'Break candle did not close beyond level',
    BREAK_BODY_TOO_SMALL: 'Break candle body was too small',
    BREAK_DISTANCE_TOO_SMALL: 'Break distance was too small',
    CONFIRMATION_PENDING: 'Confirmation was still pending',
    IMMEDIATE_CONFIRMATION_MISSED: 'Immediate confirmation was missed',
    NEXT_CANDLE_WRONG_DIRECTION: 'Next candle was the wrong direction',
    SECOND_CLOSE_NOT_BEYOND: 'Second close did not stay beyond the level',
    RETEST_PENDING: 'Retest never completed in the tested range',
    CONFIRMATION_BODY_TOO_SMALL: 'Confirmation candle body was too small',
    ENTRY_UNAVAILABLE: 'Entry price was unavailable',
    STOP_LOSS_UNAVAILABLE: 'Stop loss could not be built',
    TP2_OPPOSITE_SWING_UNAVAILABLE: 'Opposite-swing TP2 was unavailable',
    RISK_BUDGET_INVALID: 'Risk budget was invalid',
    NO_VALID_ENTRY: 'Setup never reached a valid entry',
  };

  function diagnosticReasonLabel(reason) {
    if (DIAGNOSTIC_REASON_LABELS[reason]) return DIAGNOSTIC_REASON_LABELS[reason];
    return String(reason || 'Unknown reason').toLowerCase().replaceAll('_', ' ').replace(/^./, (char) => char.toUpperCase());
  }

  function renderDiagnostics(diagnostics) {
    const hasData = diagnostics && Number.isFinite(Number(diagnostics.candles_analyzed));
    if (!hasData) {
      $('diagCandles').textContent = '—';
      $('diagSetups').textContent = '—';
      $('diagSignals').textContent = '—';
      $('diagTradesOpened').textContent = '—';
      $('diagnosticSummary').textContent = 'Run Fast Backtest to see where setups passed, waited, or were blocked.';
      $('diagnosticFunnel').innerHTML = '<div class="muted">No backtest diagnostics yet.</div>';
      $('diagnosticReasons').innerHTML = '<div class="muted">No rejection reasons yet.</div>';
      return;
    }

    const candles = Number(diagnostics.candles_analyzed || 0);
    const setups = Number(diagnostics.setups_detected || 0);
    const signals = Number(diagnostics.signals_emitted || 0);
    const opened = Number(diagnostics.trades_opened || 0);
    $('diagCandles').textContent = candles.toLocaleString();
    $('diagSetups').textContent = setups.toLocaleString();
    $('diagSignals').textContent = signals.toLocaleString();
    $('diagTradesOpened').textContent = opened.toLocaleString();

    if (opened === 0 && setups === 0) {
      $('diagnosticSummary').innerHTML = `<strong>NO TRADES FOUND.</strong> ${candles.toLocaleString()} candles were checked, but no BOS/CHOCH setup reached the evaluator.`;
    } else if (opened === 0) {
      $('diagnosticSummary').innerHTML = `<strong>NO TRADES FOUND.</strong> ${setups.toLocaleString()} setup${setups === 1 ? '' : 's'} were detected, but none reached a valid trade entry.`;
    } else {
      $('diagnosticSummary').innerHTML = `<strong>${opened.toLocaleString()} trade${opened === 1 ? '' : 's'} opened.</strong> The evaluator detected ${setups.toLocaleString()} setup${setups === 1 ? '' : 's'} across ${candles.toLocaleString()} candles.`;
    }
    const warmup = Number(diagnostics.warmup_candles || 0);
    if (warmup > 0) {
      $('diagnosticSummary').innerHTML += ` <span class="muted">Indicators were warmed with ${warmup.toLocaleString()} earlier candles.</span>`;
    }

    const passed = diagnostics.stage_pass_counts || {};
    const denominator = Math.max(setups, 1);
    $('diagnosticFunnel').innerHTML = DIAGNOSTIC_STAGES.map(([key, label]) => {
      const count = Number(passed[key] || 0);
      const width = Math.max(0, Math.min(100, (count / denominator) * 100));
      return `<div class="diagnostic-row">
        <div class="diagnostic-row-head"><span>${escapeHtml(label)}</span><strong>${count.toLocaleString()}</strong></div>
        <div class="diagnostic-track"><span style="width:${width.toFixed(1)}%"></span></div>
      </div>`;
    }).join('');

    const rejectionEntries = Object.entries(diagnostics.rejection_reasons || {})
      .sort((a, b) => Number(b[1]) - Number(a[1]));
    const noSetupEntries = Object.entries(diagnostics.no_setup_reasons || {})
      .sort((a, b) => Number(b[1]) - Number(a[1]));
    const reasonRows = rejectionEntries.length ? rejectionEntries : noSetupEntries;
    if (!reasonRows.length) {
      $('diagnosticReasons').innerHTML = '<div class="diagnostic-good">No blocked or unfinished setups in this run.</div>';
    } else {
      $('diagnosticReasons').innerHTML = reasonRows.map(([reason, count]) => `<div class="diagnostic-reason">
        <span>${escapeHtml(diagnosticReasonLabel(reason))}</span><strong>${Number(count).toLocaleString()}</strong>
      </div>`).join('');
      if (rejectionEntries.length && noSetupEntries.length) {
        const noSetupCount = noSetupEntries.reduce((sum, [, count]) => sum + Number(count || 0), 0);
        $('diagnosticReasons').innerHTML += `<div class="diagnostic-note">${noSetupCount.toLocaleString()} other evaluated candles had no active BOS/CHOCH setup.</div>`;
      }
    }
  }

  function renderEquity(curve = []) {
    const svg = $('equityChart');
    const points = Model.equityPoints(curve, 700, 260, 24);
    if (!points.length) {
      svg.innerHTML = '<text x="350" y="135" text-anchor="middle" fill="#8ea1bc">No equity data yet</text>';
      return;
    }
    if (points.length === 1) {
      const balance = curve[0]?.balance;
      const label = Number.isFinite(Number(balance))
        ? `No resolved trades — equity stayed at ${Model.formatMetric(balance, 'money')}`
        : 'No resolved trades — equity did not change';
      svg.innerHTML = `<text x="350" y="135" text-anchor="middle" fill="#8ea1bc">${escapeHtml(label)}</text>`;
      return;
    }
    const grid = [55, 105, 155, 205].map((y) => `<line class="grid-line" x1="24" y1="${y}" x2="676" y2="${y}"/>`).join('');
    const path = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
    svg.innerHTML = `${grid}<polyline class="equity-line" points="${path}"/>`;
  }

  function price(value) {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    const number = Number(value);
    return Math.abs(number) >= 100 ? number.toFixed(2) : number.toFixed(5);
  }

  function renderTrades(trades = []) {
    const body = $('tradeTableBody');
    if (!trades.length) {
      body.innerHTML = '<tr><td colspan="9" class="empty">No virtual trades were produced in this range.</td></tr>';
      return;
    }
    body.innerHTML = trades.map((trade) => {
      const pnl = Number(trade.pnl_dollars || 0);
      const pnlClass = trade.resolved ? (pnl >= 0 ? 'trade-positive' : 'trade-negative') : '';
      return `<tr>
        <td>${escapeHtml(trade.side)}</td>
        <td>${escapeHtml(trade.entry_time || '—')}</td>
        <td>${price(trade.entry)}</td><td>${price(trade.sl)}</td><td>${price(trade.tp1)}</td><td>${price(trade.tp2)}</td>
        <td>${escapeHtml(trade.outcome || '—')}</td>
        <td>${trade.r == null ? '—' : Model.formatMetric(trade.r, 'r')}</td>
        <td class="${pnlClass}">${Model.formatMetric(trade.pnl_dollars, 'money')}</td>
      </tr>`;
    }).join('');
  }

  function renderAssumptions(assumptions = {}) {
    const rows = [
      ['Closed candles only', assumptions.closed_candles_only],
      ['Spread modeled', assumptions.spread],
      ['Commission modeled', assumptions.commission],
      ['Slippage modeled', assumptions.slippage],
      ['Ambiguous intrabar excluded', assumptions.ambiguous_intrabar_excluded],
      ['LIVE trading enabled', assumptions.live_trading_enabled],
    ];
    $('assumptionList').innerHTML = rows.map(([label, value]) => `<li>${escapeHtml(label)}: <strong>${value ? 'YES' : 'NO'}</strong></li>`).join('');
  }

  function renderReplay() {
    const frames = state.result?.replay || [];
    const current = Model.replayFrame(frames, state.replayIndex);
    state.replayIndex = current.index;
    $('replaySlider').max = Math.max(current.total - 1, 0);
    $('replaySlider').value = current.index;
    $('replayProgress').textContent = current.total ? `${current.index + 1} / ${current.total}` : '0 / 0';
    $('replayPrevBtn').disabled = current.index <= 0;
    $('replayNextBtn').disabled = current.total === 0 || current.index >= current.total - 1;
    if (!current.frame) {
      $('replayChart').innerHTML = '<text x="450" y="185" text-anchor="middle" fill="#8ea1bc">No replay frames</text>';
      $('replayFacts').textContent = 'No replay frames were returned.';
      return;
    }

    const visible = frames.slice(Math.max(0, current.index - 59), current.index + 1);
    const candles = visible.map((frame) => frame.candle).filter(Boolean);
    const lows = candles.map((candle) => Number(candle.low));
    const highs = candles.map((candle) => Number(candle.high));
    const minimum = Math.min(...lows);
    const maximum = Math.max(...highs);
    const span = maximum - minimum || 1;
    const width = 900; const height = 360; const pad = 28;
    const slot = (width - pad * 2) / Math.max(candles.length, 1);
    let svg = [70, 140, 210, 280].map((y) => `<line class="grid-line" x1="${pad}" y1="${y}" x2="${width - pad}" y2="${y}"/>`).join('');
    visible.forEach((frame, index) => {
      const candle = frame.candle; if (!candle) return;
      const x = pad + slot * index + slot / 2;
      const y = (value) => pad + ((maximum - Number(value)) / span) * (height - pad * 2);
      const openY = y(candle.open); const closeY = y(candle.close);
      const highY = y(candle.high); const lowY = y(candle.low);
      const down = Number(candle.close) < Number(candle.open);
      const bodyY = Math.min(openY, closeY); const bodyH = Math.max(Math.abs(closeY - openY), 2);
      svg += `<line class="candle-wick" x1="${x}" y1="${highY}" x2="${x}" y2="${lowY}"/>`;
      svg += `<rect class="candle-body ${down ? 'down' : ''}" x="${x - Math.max(slot * .25, 2)}" y="${bodyY}" width="${Math.max(slot * .5, 4)}" height="${bodyH}" rx="1"/>`;
      if (frame.signal && frame.signal !== 'WAIT') svg += `<text class="signal-label" x="${x}" y="${Math.max(highY - 7, 12)}" text-anchor="middle">${escapeHtml(frame.signal)}</text>`;
    });
    $('replayChart').innerHTML = svg;
    const frame = current.frame;
    const stepText = Object.entries(frame.steps || {}).map(([name, detail]) => `${name}: ${detail?.state || '—'}`).join(' • ');
    $('replayFacts').textContent = `${frame.timestamp} • signal ${frame.signal || 'WAIT'}${frame.outcome ? ` • ${frame.outcome}` : ''}${stepText ? ` • ${stepText}` : ''}`;
  }

  function renderResult(result) {
    state.result = result;
    renderMetrics(result.metrics || {});
    renderDiagnostics(result.diagnostics || {});
    renderEquity(result.equity_curve || []);
    renderTrades(result.trades || []);
    renderAssumptions(result.assumptions || {});
    const hasReplay = Array.isArray(result.replay);
    $('replayPanel').classList.toggle('hidden', !hasReplay);
    state.replayIndex = 0;
    if (hasReplay) renderReplay();
  }

  async function run(mode) {
    if (!state.strategy || state.busy) return;
    notice('');
    try {
      const start = inputToIso('startDate');
      const end = inputToIso('endDate');
      if (new Date(end) <= new Date(start)) throw new Error('End must be after start.');
      const payload = Model.buildRunPayload({
        strategyId: state.strategy.strategy_id,
        strategyName: state.strategy.name || null,
        strategyDefinition: state.strategy.definition,
        symbol: $('symbolSelect').value,
        start, end, mode,
        riskOverride: riskOverride(),
      });
      setBusy(true, mode === 'REPLAY' ? 'Building replay…' : 'Running backtest…');
      const response = await Api.runSimulation(payload, {
        onProgress: ({ current, total }) => {
          $('runState').textContent = `Backtesting chunk ${current} / ${total}…`;
        },
      });
      const result = Array.isArray(response?.batch_results)
        ? Model.aggregateSimulationResults(response.batch_results)
        : response;
      renderResult(result);
      const chunkText = result.batch_chunks > 1 ? ` across ${result.batch_chunks} chunks` : '';
      notice(`${mode === 'REPLAY' ? 'Bar Replay' : 'Fast Backtest'} complete for ${result.symbol}${chunkText} using static candle data.`, 'success');
    } catch (error) {
      notice(error.message || 'Simulation failed.', 'error');
    } finally {
      setBusy(false, '');
    }
  }

  async function loadStrategy() {
    const strategyId = new URLSearchParams(window.location.search).get('strategy');
    if (!strategyId) {
      notice('Open Simulator from a saved Strategy Studio strategy.', 'error');
      setBusy(false);
      return;
    }
    setBusy(true, 'Loading saved strategy…');
    try {
      const payload = await Api.getStrategy(strategyId);
      const strategy = payload.strategy || payload;
      if (!strategy?.strategy_id) throw new Error('Saved strategy could not be loaded.');
      state.strategy = strategy;
      $('strategyTitle').textContent = strategy.name || 'Saved Strategy';
      const symbols = strategy.definition?.symbols || [];
      $('symbolSelect').innerHTML = symbols.map((symbol) => `<option value="${escapeHtml(symbol)}">${escapeHtml(symbol)}</option>`).join('');
      await refreshHistoryCoverage();
      const risk = strategy.definition?.risk || {};
      $('strategyMeta').textContent = `${symbols.join(' + ')} • ${strategy.definition?.trading_timeframe || '—'} • saved risk ${risk.method === 'PERCENT_BALANCE' ? `${risk.value}% balance` : `${risk.value || '—'}`} • Fast Backtest up to 5 years • Bar Replay up to 31 days • no Neon candle history reads • Simulator only.`;
    } catch (error) {
      notice(error.message || 'Saved strategy could not be loaded.', 'error');
    } finally {
      setBusy(false, '');
    }
  }

  $('symbolSelect').addEventListener('change', refreshHistoryCoverage);
  $('fiveYearRangeBtn').addEventListener('click', useFullFiveYearHistory);
  $('startYear').addEventListener('change', () => applyYearJump('startDate', 'startYear'));
  $('endYear').addEventListener('change', () => applyYearJump('endDate', 'endYear'));
  $('startDate').addEventListener('change', () => syncYearJump('startDate', 'startYear'));
  $('endDate').addEventListener('change', () => syncYearJump('endDate', 'endYear'));
  $('riskOverrideEnabled').addEventListener('change', () => {
    const enabled = $('riskOverrideEnabled').checked;
    $('riskMethodField').classList.toggle('hidden', !enabled);
    $('riskValueField').classList.toggle('hidden', !enabled);
  });
  $('fastRunBtn').addEventListener('click', () => run('FAST'));
  $('replayRunBtn').addEventListener('click', () => run('REPLAY'));
  $('replayPrevBtn').addEventListener('click', () => { state.replayIndex -= 1; renderReplay(); });
  $('replayNextBtn').addEventListener('click', () => { state.replayIndex += 1; renderReplay(); });
  $('replaySlider').addEventListener('input', () => { state.replayIndex = Number($('replaySlider').value); renderReplay(); });

  setDefaultDates();
  renderMetrics();
  renderDiagnostics();
  renderEquity();
  setBusy(false);
  loadStrategy();
})();
