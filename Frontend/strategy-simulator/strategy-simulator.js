(() => {
  'use strict';

  const Model = window.StrategySimulatorModel;
  const Api = window.StrategySimulatorApi;
  if (!Model || !Api) return;

  const $ = (id) => document.getElementById(id);
  const state = { strategy: null, result: null, replayIndex: 0, busy: false };

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

  function inputToIso(id) {
    const value = $(id).value;
    if (!value) throw new Error('Choose both a start and end date.');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error('Invalid simulation date.');
    return date.toISOString();
  }

  function setDefaultDates() {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    $('startDate').value = toLocalInput(start);
    $('endDate').value = toLocalInput(end);
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

  function renderEquity(curve = []) {
    const svg = $('equityChart');
    const points = Model.equityPoints(curve, 700, 260, 24);
    if (!points.length) {
      svg.innerHTML = '<text x="350" y="135" text-anchor="middle" fill="#8ea1bc">No equity data yet</text>';
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
      const result = await Api.runSimulation(payload);
      renderResult(result);
      notice(`${mode === 'REPLAY' ? 'Replay' : 'Fast Run'} complete for ${result.symbol} using static candle data.`, 'success');
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
      const risk = strategy.definition?.risk || {};
      $('strategyMeta').textContent = `${symbols.join(' + ')} • ${strategy.definition?.trading_timeframe || '—'} • saved risk ${risk.method === 'PERCENT_BALANCE' ? `${risk.value}% balance` : `${risk.value || '—'}`} • static replay candles • no Neon candle history reads • Simulator only.`;
    } catch (error) {
      notice(error.message || 'Saved strategy could not be loaded.', 'error');
    } finally {
      setBusy(false, '');
    }
  }

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
  renderEquity();
  setBusy(false);
  loadStrategy();
})();
