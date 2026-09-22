(() => {
  'use strict';

  const Api = window.ManualReplayApi;
  const Position = window.ManualReplayPosition;
  const LiveChart = window.ManualReplayLiveChart;
  const $ = (id) => document.getElementById(id);
  const state = {
    candles: [],
    index: 0,
    initialIndex: 0,
    timer: null,
    openTrade: null,
    positionDraft: null,
    trades: [],
    startingBalance: 10000,
    balance: 10000,
    peak: 10000,
    maxDrawdown: 0,
    busy: false,
    visibleCandles: 120,
    viewEnd: null,
    manualPriceCenter: null,
    manualPriceSpan: null,
    chartGesture: null,
    chartGesturePointerId: null,
    hoverPrice: null,
    hoverX: null,
    hoverY: null,
    activePriceField: 'slPrice',
    chartMetrics: null,
    draggingHandle: null,
    dragPointerId: null,
    suppressChartClick: false,
    renderFrame: null,
    chartNeedsFit: true,
  };

  function notice(message, kind = '') {
    const node = $('notice');
    node.textContent = message || '';
    node.className = `notice ${kind}`.trim();
    node.classList.toggle('hidden', !message);
  }

  function money(value) {
    return Number.isFinite(Number(value)) ? `$${Number(value).toFixed(2)}` : '—';
  }

  function num(value, digits) {
    if (!Number.isFinite(Number(value))) return '—';
    return Number(value).toFixed(digits);
  }

  function price(value) {
    if (!Number.isFinite(Number(value))) return '—';
    return Math.abs(Number(value)) >= 100 ? Number(value).toFixed(2) : Number(value).toFixed(5);
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function datePartWithoutYear(date) {
    return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }

  function parseDatePartWithoutYear(value, year) {
    const text = String(value || '').trim();
    const match = text.match(/^(\d{1,2})[-\/]?(\d{1,2})[ ,T]+(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const month = Number(match[1]);
    const day = Number(match[2]);
    const hour = Number(match[3]);
    const minute = Number(match[4]);
    const fullYear = Number(year);
    if (
      !Number.isInteger(fullYear) ||
      month < 1 || month > 12 ||
      day < 1 || day > 31 ||
      hour < 0 || hour > 23 ||
      minute < 0 || minute > 59
    ) return null;

    const date = new Date(fullYear, month - 1, day, hour, minute, 0, 0);
    if (
      date.getFullYear() !== fullYear ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date.getHours() !== hour ||
      date.getMinutes() !== minute
    ) return null;
    return date;
  }

  function yearOptions() {
    const current = new Date().getFullYear();
    const years = [];
    for (let year = current - 5; year <= current; year += 1) years.push(year);
    return years;
  }

  function populateYearJump(id, selectedYear) {
    const select = $(id);
    if (!select) return;
    const years = yearOptions();
    select.innerHTML = years
      .map((year) => `<option value="${year}">${year}</option>`)
      .join('');
    const target = Number(selectedYear);
    if (years.includes(target)) select.value = String(target);
  }

  function applyYearJump(_inputId, selectId) {
    const select = $(selectId);
    if (!select) return;
    const year = Number(select.value);
    if (!Number.isFinite(year)) return;
    // The year selector is now the only year control. Month/day/time stay
    // untouched in the neighboring field.
  }

  function setDefaultDates() {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 86400000);
    $('startDate').value = datePartWithoutYear(start);
    $('endDate').value = datePartWithoutYear(end);
    populateYearJump('startYear', start.getFullYear());
    populateYearJump('endYear', end.getFullYear());
  }

  function inputIso(id) {
    const yearId = id === 'startDate' ? 'startYear' : 'endYear';
    const year = Number($(yearId)?.value);
    const d = parseDatePartWithoutYear($(id)?.value, year);
    if (!d) throw new Error('Use MM-DD HH:MM for the replay date and time.');
    return d.toISOString();
  }

  function currentCandle() {
    return state.candles[state.index] || null;
  }

  const MIN_VISIBLE_CANDLES = 10;
  const MAX_VISIBLE_CANDLES = 1000;

  function revealedEnd() {
    return Math.max(0, Math.min(state.index + 1, state.candles.length));
  }

  function clampedVisibleCount(raw = state.visibleCandles) {
    return Math.max(
      MIN_VISIBLE_CANDLES,
      Math.min(Math.round(Number(raw) || 120), MAX_VISIBLE_CANDLES)
    );
  }

  function clampViewEnd(rawEnd) {
    const maxEnd = revealedEnd();
    if (maxEnd <= 0) return 0;
    return Math.max(1, Math.min(Math.round(Number(rawEnd) || maxEnd), maxEnd));
  }

  function viewportWindow() {
    const maxEnd = revealedEnd();
    const count = clampedVisibleCount();
    const end = state.viewEnd == null
      ? maxEnd
      : clampViewEnd(state.viewEnd);
    const viewStart = end - count;
    const start = Math.max(0, viewStart);
    return {
      start,
      viewStart,
      end,
      rows: state.candles.slice(start, end),
      count,
      followingLatest: state.viewEnd == null || end >= maxEnd,
    };
  }

  function visibleRows() {
    return viewportWindow().rows;
  }

  function resetChartViewport() {
    state.chartNeedsFit = true;
    state.visibleCandles = 120;
    state.viewEnd = null;
    state.manualPriceCenter = null;
    state.manualPriceSpan = null;
    state.chartGesture = null;
    state.chartGesturePointerId = null;
    state.hoverPrice = state.hoverX = state.hoverY = null;
  }

  function effectivePriceScale(rows) {
    const base = Position.visibleCandleScale(rows);
    if (!base) return null;
    if (
      !Number.isFinite(Number(state.manualPriceCenter)) ||
      !Number.isFinite(Number(state.manualPriceSpan)) ||
      Number(state.manualPriceSpan) <= 0
    ) {
      return base;
    }
    const span = Number(state.manualPriceSpan);
    const center = Number(state.manualPriceCenter);
    return {
      ...base,
      low: center - span / 2,
      high: center + span / 2,
      span,
    };
  }

  function minimumPriceDistance(entry) {
    return Math.abs(Number(entry)) >= 100 ? 0.01 : 0.00001;
  }

  function editablePosition() {
    return state.openTrade || state.positionDraft || null;
  }

  function syncDraftInputs() {
    const position = editablePosition();
    $('slPrice').value = position && position.sl != null && Number.isFinite(Number(position.sl)) ? price(position.sl) : '';
    $('tpPrice').value = position && position.tp != null && Number.isFinite(Number(position.tp)) ? price(position.tp) : '';
  }

  function positionSizingMode() {
    return String($('positionSizingMode')?.value || 'AUTO_RISK').toUpperCase();
  }

  function manualLotSizing() {
    return positionSizingMode() === 'MANUAL_LOT';
  }

  function updateSizingControls() {
    const manual = manualLotSizing();
    $('riskMethodField')?.classList.toggle('hidden', manual);
    $('riskValueField')?.classList.toggle('hidden', manual);
    $('lotSizeField')?.classList.toggle('hidden', !manual);
  }

  function calculateMetricsFor(draft) {
    if (!draft) return null;
    return Position.calculatePositionMetrics({
      draft,
      riskMethod: $('riskMethod').value,
      riskValue: $('riskValue').value,
      balance: state.balance,
      symbol: $('symbol').value,
      sizingMode: positionSizingMode(),
      lotSize: $('lotSize')?.value,
    });
  }

  function positionMetrics() {
    return calculateMetricsFor(state.positionDraft);
  }

  function activeTradeMetrics(trade) {
    if (!trade) return null;
    const spec = Position.symbolTradingSpec($('symbol').value);
    const riskPips = Math.abs(Number(trade.entry) - Number(trade.sl)) / spec.pipSize;
    const rewardPips = Math.abs(Number(trade.tp) - Number(trade.entry)) / spec.pipSize;
    const stopR = tradeR(trade, trade.sl);
    const targetR = tradeR(trade, trade.tp);
    return {
      lotSize: Number(trade.lotSize),
      riskPips,
      rewardPips,
      stopR,
      targetR,
      stopDollars: Number.isFinite(stopR) ? stopR * Number(trade.riskDollars) : null,
      rewardDollars: Number.isFinite(targetR) ? targetR * Number(trade.riskDollars) : null,
    };
  }

  function createPositionDraft(side) {
    if (!state.candles.length) return notice('Load a replay first.', 'error');
    if (state.openTrade) return notice('Close the active virtual position before creating another.', 'error');
    const scale = Position.visibleCandleScale(visibleRows());
    const entry = Number(currentCandle().close);
    state.positionDraft = {
      ...Position.createPositionDraft({
        side,
        entry,
        visibleLow: scale.rawLow,
        visibleHigh: scale.rawHigh,
        minimumDisplayDistance: minimumPriceDistance(entry),
      }),
      // Freeze the TradingView-style drawing to the candle/price where it was
      // created. Future replay candles must never push Entry, SL, or TP.
      entryIndex: state.index,
      entryTime: currentCandle()?.timestamp || null,
    };
    syncDraftInputs();
    setActivePriceField('slPrice');
    notice(`${side === 'BUY' ? 'Long' : 'Short'} position draft created at ${price(entry)}.`, 'success');
    renderAll();
  }

  function cancelPositionDraft() {
    if (state.openTrade) return notice('Use Close at Current Price for an active position.', 'error');
    if (!state.positionDraft) return;
    state.positionDraft = null;
    syncDraftInputs();
    notice('Position draft removed.', 'success');
    renderAll();
  }

  function updateDraftLevel(field, rawValue) {
    if (!['sl', 'tp'].includes(field)) return;

    if (state.openTrade) {
      const trade = state.openTrade;
      const current = Number(currentCandle()?.close);
      const gap = minimumPriceDistance(trade.entry);
      const value = Position.validateActivePositionLevel(
        trade,
        field,
        rawValue,
        current,
        gap,
      );
      if (value == null) return;
      state.openTrade = {
        ...trade,
        [field]: value,
      };
      return;
    }

    if (!state.positionDraft) return;
    state.positionDraft = Position.updateDraftLevel(
      state.positionDraft,
      field,
      rawValue,
      minimumPriceDistance(state.positionDraft.entry)
    );
  }

  function updateDraftFromInput(field, inputId) {
    updateDraftLevel(field, $(inputId).value);
    renderChart();
    renderPosition();
  }

  function commitDraftInputs() {
    syncDraftInputs();
    renderAll();
  }

  function setActivePriceField(id) {
    state.activePriceField = id === 'tpPrice' ? 'tpPrice' : 'slPrice';
    for (const fieldId of ['slPrice', 'tpPrice']) {
      const field = $(fieldId);
      field?.closest('label')?.classList.toggle('price-pick-active', fieldId === state.activePriceField);
    }
    const hint = $('pricePickHint');
    if (hint) {
      hint.textContent = state.activePriceField === 'tpPrice'
        ? 'TP selected • move over the chart to see a price • click the chart to set TP'
        : 'SL selected • move over the chart to see a price • click the chart to set SL';
    }
  }

  function zoomChart(direction) {
    if (!state.candles.length) return;
    LiveChart?.zoomBy?.(direction);
  }


  function syncDrawingToolButtons(mode = null) {
    const line = $('drawLineBtn');
    const rect = $('drawRectBtn');
    line?.setAttribute('aria-pressed', String(mode === 'line'));
    rect?.setAttribute('aria-pressed', String(mode === 'rect'));
    line?.classList.toggle('is-active', mode === 'line');
    rect?.classList.toggle('is-active', mode === 'rect');
  }

  function toggleDrawingMode(mode) {
    if (!LiveChart || !['line', 'rect'].includes(mode)) return;
    const current = LiveChart.getState?.().drawingMode || null;
    const next = current === mode ? null : mode;
    LiveChart.setDrawingMode?.(next);
    syncDrawingToolButtons(next);
    if (next === 'line') {
      notice('Line tool active • drag across the chart to draw. Esc cancels.', 'success');
    } else if (next === 'rect') {
      notice('S/R rectangle active • drag a zone, then resize it from all 8 handles.', 'success');
    }
  }

  function tradeR(trade, exitPrice) {
    const distance = Number(trade.initialRiskDistance) > 0
      ? Number(trade.initialRiskDistance)
      : Math.abs(Number(trade.entry) - Number(trade.initialSl ?? trade.sl));
    if (!distance) return 0;
    const sign = trade.side === 'BUY' ? 1 : -1;
    return sign * (Number(exitPrice) - trade.entry) / distance;
  }

  function stopTimer() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    $('playBtn').textContent = '▶ Play';
  }

  function setPlaying() {
    stopTimer();
    if (!state.candles.length || state.index >= state.candles.length - 1) return;
    $('playBtn').textContent = '⏸ Pause';
    const speed = Math.max(Number($('speed').value) || 1, 1);
    state.timer = setInterval(() => {
      if (!advanceOne()) stopTimer();
    }, Math.max(80, 1000 / speed));
  }

  function closeTrade(outcome, exitPrice, r, resolved = true) {
    const trade = state.openTrade;
    if (!trade) return;
    const pnl = resolved && Number.isFinite(Number(r)) ? Number(r) * trade.riskDollars : 0;
    if (resolved) state.balance += pnl;
    state.peak = Math.max(state.peak, state.balance);
    state.maxDrawdown = Math.max(state.maxDrawdown, state.peak - state.balance);
    state.trades.push({
      ...trade,
      exitIndex: state.index,
      exitTime: currentCandle()?.timestamp || null,
      exit: Number(exitPrice),
      outcome,
      r: resolved ? Number(r) : null,
      pnl,
      resolved,
    });
    state.openTrade = null;
    syncDraftInputs();
    renderAll();
  }

  function resolveOpenTrade(candle) {
    const trade = state.openTrade;
    if (!trade || state.index <= trade.entryIndex) return;
    const slHit = trade.side === 'BUY' ? Number(candle.low) <= trade.sl : Number(candle.high) >= trade.sl;
    const tpHit = trade.tp == null ? false : (trade.side === 'BUY' ? Number(candle.high) >= trade.tp : Number(candle.low) <= trade.tp);
    if (slHit && tpHit) {
      closeTrade('AMBIGUOUS', trade.entry, null, false);
      return;
    }
    if (slHit) {
      const securedR = tradeR(trade, trade.sl);
      const outcome = securedR > 0 ? 'PROTECTED_SL' : Math.abs(securedR) < 0.0001 ? 'BREAKEVEN' : 'SL';
      closeTrade(outcome, trade.sl, securedR, true);
      return;
    }
    if (tpHit) {
      closeTrade('TP', trade.tp, tradeR(trade, trade.tp), true);
    }
  }

  function advanceOne() {
    if (!state.candles.length || state.index >= state.candles.length - 1) return false;
    state.index += 1;
    resolveOpenTrade(currentCandle());
    renderAll();
    return state.index < state.candles.length - 1;
  }

  function openManualTrade(side) {
    if (!state.candles.length) return notice('Load a replay first.', 'error');
    if (state.openTrade) return notice('Close the current virtual position first.', 'error');
    if (!state.positionDraft) return notice('Create a Long or Short Position draft first.', 'error');
    if (state.positionDraft.side !== side) return notice(`This draft can only open ${state.positionDraft.side}.`, 'error');

    const candle = currentCandle();
    // Execution happens at the current replay close. Keep the user's SL/TP
    // fixed, but recalculate pips, lot/risk, and reward from the actual entry.
    const executionDraft = {
      ...state.positionDraft,
      entry: Number(candle.close),
    };
    const metrics = calculateMetricsFor(executionDraft);
    if (!metrics || !metrics.valid) {
      return notice(
        manualLotSizing()
          ? 'Enter a valid lot size, Stop Loss, and Take Profit for the current price.'
          : 'Enter valid Stop Loss, Take Profit, and risk values.',
        'error',
      );
    }

    if (manualLotSizing()) {
      const confirmed = window.confirm(
        `Open ${side} with ${Number(metrics.lotSize).toFixed(2)} lot?\n\n` +
        `SL: ${Number(metrics.riskPips).toFixed(1)} pips = ${money(metrics.riskDollars)} risk\n` +
        `TP: ${Number(metrics.rewardPips).toFixed(1)} pips = ${money(metrics.rewardDollars)} reward\n\n` +
        'Continue with this virtual trade?'
      );
      if (!confirmed) {
        notice('Virtual trade canceled. You can adjust lot, SL, or TP and try again.');
        return;
      }
    }

    try {
      state.openTrade = Position.createVirtualTrade({
        draft: executionDraft,
        requestedSide: side,
        currentClose: candle.close,
        entryIndex: state.index,
        entryTime: candle.timestamp,
        riskDollars: metrics.riskDollars,
        lotSize: metrics.lotSize,
        riskPips: metrics.riskPips,
        rewardPips: metrics.rewardPips,
        sizingMode: metrics.sizingMode,
      });
    } catch (error) {
      return notice(error.message, 'error');
    }
    state.positionDraft = null;
    syncDraftInputs();
    notice(
      `${side} opened virtually at ${price(state.openTrade.entry)} • ` +
      `${Number(metrics.lotSize).toFixed(2)} lot • ${money(metrics.riskDollars)} initial risk.`,
      'success'
    );
    renderAll();
  }

  function closeManually() {
    if (!state.openTrade) return;
    const exit = Number(currentCandle().close);
    closeTrade('MANUAL', exit, tradeR(state.openTrade, exit), true);
  }

  function metrics() {
    const resolved = state.trades.filter((t) => t.resolved);
    const wins = resolved.filter((t) => t.pnl > 0);
    const losses = resolved.filter((t) => t.pnl < 0);
    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = losses.reduce((sum, t) => sum + t.pnl, 0);
    const avgR = resolved.length ? resolved.reduce((sum, t) => sum + (Number(t.r) || 0), 0) / resolved.length : null;
    return {
      resolved: resolved.length,
      winRate: resolved.length ? wins.length / resolved.length * 100 : null,
      avgR,
      pf: grossLoss < 0 ? grossProfit / Math.abs(grossLoss) : null,
      pnl: state.balance - state.startingBalance,
    };
  }

  function renderMetrics() {
    const m = metrics();
    $('metricBalance').textContent = money(state.balance);
    $('metricPnl').textContent = money(m.pnl);
    $('metricWinRate').textContent = m.winRate == null ? '—' : `${m.winRate.toFixed(1)}%`;
    $('metricTrades').textContent = String(m.resolved);
    $('metricAvgR').textContent = m.avgR == null ? '—' : `${m.avgR.toFixed(2)}R`;
    $('metricPf').textContent = m.pf == null ? '—' : m.pf.toFixed(2);
    $('metricDd').textContent = money(state.maxDrawdown);
  }

  function renderPosition() {
    const trade = state.openTrade;
    $('positionCard').classList.toggle('hidden', !trade);
    const draft = state.positionDraft;
    const editor = trade || draft;
    const draftMetrics = positionMetrics();
    const tradeMetrics = activeTradeMetrics(trade);
    $('draftDirection').value = editor ? (editor.side === 'BUY' ? 'LONG / BUY' : 'SHORT / SELL') : '—';
    $('draftEntry').value = editor ? price(editor.entry) : '—';

    const displayMetrics = trade ? tradeMetrics : draftMetrics;
    $('draftLot').textContent = displayMetrics && Number.isFinite(Number(displayMetrics.lotSize))
      ? Number(displayMetrics.lotSize).toFixed(2)
      : '—';
    $('draftSlPips').textContent = displayMetrics && Number.isFinite(Number(displayMetrics.riskPips))
      ? Number(displayMetrics.riskPips).toFixed(1)
      : '—';
    $('draftTpPips').textContent = displayMetrics && Number.isFinite(Number(displayMetrics.rewardPips))
      ? Number(displayMetrics.rewardPips).toFixed(1)
      : '—';

    if (trade) {
      const stopMoney = Number(tradeMetrics?.stopDollars);
      $('draftRr').textContent = Number.isFinite(tradeMetrics?.targetR) ? Number(tradeMetrics.targetR).toFixed(2) : '—';
      $('draftRisk').textContent = Number.isFinite(stopMoney)
        ? (stopMoney > 0 ? `Secured ${money(stopMoney)}` : money(Math.abs(stopMoney)))
        : '—';
      $('draftReward').textContent = Number.isFinite(tradeMetrics?.rewardDollars)
        ? money(tradeMetrics.rewardDollars)
        : '—';
    } else {
      $('draftRr').textContent = draftMetrics && Number.isFinite(draftMetrics.rr) ? draftMetrics.rr.toFixed(2) : '—';
      $('draftRisk').textContent = draftMetrics && Number.isFinite(draftMetrics.riskDollars)
        ? `${money(draftMetrics.riskDollars)}${manualLotSizing() && Number.isFinite(draftMetrics.riskPercent) ? ` • ${draftMetrics.riskPercent.toFixed(2)}%` : ''}`
        : '—';
      $('draftReward').textContent = draftMetrics && Number.isFinite(draftMetrics.rewardDollars) ? money(draftMetrics.rewardDollars) : '—';
    }

    const ready = Boolean(draft && draftMetrics && draftMetrics.valid && !trade);
    $('buyBtn').disabled = !ready || draft?.side !== 'BUY';
    $('sellBtn').disabled = !ready || draft?.side !== 'SELL';
    $('longPositionBtn').disabled = !state.candles.length || Boolean(trade);
    $('shortPositionBtn').disabled = !state.candles.length || Boolean(trade);
    $('longPositionBtn').setAttribute('aria-pressed', String(Boolean(draft && draft.side === 'BUY')));
    $('shortPositionBtn').setAttribute('aria-pressed', String(Boolean(draft && draft.side === 'SELL')));
    $('longPositionBtn').classList.toggle('is-active', Boolean(draft && draft.side === 'BUY'));
    $('shortPositionBtn').classList.toggle('is-active', Boolean(draft && draft.side === 'SELL'));
    $('cancelPositionBtn').disabled = !draft || Boolean(trade);

    // Sizing is locked once the trade is open, but SL/TP stay editable.
    $('positionSizingMode').disabled = Boolean(trade);
    $('riskMethod').disabled = Boolean(trade);
    $('riskValue').disabled = Boolean(trade);
    $('lotSize').disabled = Boolean(trade) || !manualLotSizing();
    $('slPrice').disabled = !editor;
    $('tpPrice').disabled = !editor;
    updateSizingControls();

    if (!trade) return;
    const current = Number(currentCandle().close);
    $('positionSide').textContent = trade.side;
    $('positionEntry').textContent = price(trade.entry);
    $('positionSl').textContent = price(trade.sl);
    $('positionTp').textContent = trade.tp == null ? '—' : price(trade.tp);
    $('positionRisk').textContent = money(trade.riskDollars);
    $('positionR').textContent = `${tradeR(trade, current).toFixed(2)}R`;
  }

  function renderLog() {
    const body = $('tradeBody');
    if (!state.trades.length) {
      body.innerHTML = '<tr><td colspan="12" class="empty">No manual trades yet.</td></tr>';
      return;
    }
    body.innerHTML = state.trades.map((t, i) => `<tr>
      <td>${i + 1}</td><td class="${t.side === 'BUY' ? 'positive' : 'negative'}">${t.side}</td>
      <td>${Number.isFinite(Number(t.lotSize)) ? Number(t.lotSize).toFixed(2) : '—'}</td>
      <td>${new Date(t.entryTime).toLocaleString()}</td><td>${t.exitTime ? new Date(t.exitTime).toLocaleString() : '—'}</td>
      <td>${price(t.entry)}</td><td>${price(t.exit)}</td><td>${price(t.sl)}</td><td>${t.tp == null ? '—' : price(t.tp)}</td>
      <td>${t.outcome}</td><td>${t.r == null ? '—' : `${Number(t.r).toFixed(2)}R`}</td>
      <td class="${t.pnl > 0 ? 'positive' : t.pnl < 0 ? 'negative' : ''}">${money(t.pnl)}</td>
    </tr>`).join('');
  }

  function overlayMetrics(position) {
    if (!position) return null;
    if (position === state.positionDraft) return positionMetrics();
    return Position.calculatePositionMetrics({
      draft: position,
      riskMethod: 'FIXED',
      riskValue: Number(position.riskDollars) || 0,
      balance: state.balance,
      symbol: $('symbol').value,
      sizingMode: 'AUTO_RISK',
    });
  }

  function renderPositionOverlay(position, options) {
    if (!position || ![position.entry, position.sl, position.tp].every((value) => value != null && Number.isFinite(Number(value)))) {
      return { zones: '', details: '' };
    }
    const geometry = Position.positionOverlayGeometry({
      position,
      scale: options.scale,
      plot: { top: options.top, plotH: options.plotH, startX: options.startX, endX: options.endX },
    });
    const kind = options.historical ? 'position-overlay historical' : options.active ? 'position-overlay active' : 'position-overlay draft';
    const side = position.side === 'SELL' ? ' short' : ' long';
    const zoneClass = `${kind}${side}`;
    const zones = `<g class="${zoneClass}">
      <rect class="position-zone profit-zone" x="${geometry.profitRect.x}" y="${geometry.profitRect.y}" width="${geometry.profitRect.width}" height="${geometry.profitRect.height}"/>
      <rect class="position-zone risk-zone" x="${geometry.riskRect.x}" y="${geometry.riskRect.y}" width="${geometry.riskRect.width}" height="${geometry.riskRect.height}"/>
    </g>`;
    const line = (field, value, y, cls, offscreen) => {
      const arrow = offscreen ? (Number(value) > options.scale.high ? '↑ ' : '↓ ') : '';
      const handle = options.draggable && ['sl', 'tp'].includes(field)
        ? `<circle class="position-handle ${cls}" data-position-handle="${field}" cx="${options.endX - 8}" cy="${y}" r="9" aria-label="Drag ${field.toUpperCase()}"/>`
        : '';
      return `<line class="position-line ${cls}" x1="${options.startX}" y1="${y}" x2="${options.endX}" y2="${y}"/>
        <text class="position-price-label ${cls}" x="${options.endX - 14}" y="${Math.max(options.top + 13, y - 7)}" text-anchor="end">${arrow}${field.toUpperCase()} ${price(value)}</text>${handle}`;
    };
    const metrics = overlayMetrics(position);
    const status = options.historical
      ? position.outcome
      : options.active
        ? `${position.side} ACTIVE`
        : `${position.side === 'BUY' ? 'LONG' : 'SHORT'} DRAFT`;
    const labelX = Math.min(options.endX - 185, options.startX + 12);
    const labelY = Math.min(options.top + options.plotH - 52, Math.max(options.top + 58, geometry.entryY - 18));
    const reward = metrics && Number.isFinite(metrics.rewardDollars) ? money(metrics.rewardDollars) : '—';
    const risk = metrics && Number.isFinite(metrics.riskDollars) ? money(metrics.riskDollars) : '—';
    const rr = metrics && Number.isFinite(metrics.rr) ? metrics.rr.toFixed(2) : '—';
    const details = `<g class="${zoneClass}">
      ${line('entry', position.entry, geometry.entryY, 'entry', geometry.entryOffscreen)}
      ${line('sl', position.sl, geometry.slY, 'sl', geometry.slOffscreen)}
      ${line('tp', position.tp, geometry.tpY, 'tp', geometry.tpOffscreen)}
      <rect class="position-info-bg" x="${labelX}" y="${labelY - 32}" width="174" height="48" rx="7"/>
      <text class="position-status" x="${labelX + 9}" y="${labelY - 15}">${status}</text>
      <text class="position-summary" x="${labelX + 9}" y="${labelY + 4}">Risk ${risk} • Reward ${reward} • R:R ${rr}</text>
    </g>`;
    return { zones, details };
  }

  function renderChart() {
    const container = $('manualReplayChart');
    const layer = $('manualReplayTradeLayer');
    if (!container || !LiveChart) return;

    const symbol = $('symbol').value;
    const ready = LiveChart.init(container, layer, symbol);
    if (!ready) {
      container.innerHTML = '<div class="manual-replay-chart-loading">Loading chart engine…</div>';
      return;
    }

    LiveChart.setCallbacks({
      onHoverPrice(value) {
        state.hoverPrice = Number.isFinite(Number(value)) ? Number(value) : null;
      },
      onChartClick(value, region) {
        if (
          !state.candles.length ||
          !editablePosition() ||
          !Number.isFinite(Number(value)) ||
          !['sl', 'tp'].includes(region)
        ) return;

        const fieldId = region === 'tp' ? 'tpPrice' : 'slPrice';
        setActivePriceField(fieldId);
        const target = $(fieldId);
        if (!target) return;
        target.value = price(value);
        target.dispatchEvent(new Event('input', { bubbles: true }));
        const label = region === 'tp' ? 'Take Profit' : 'Stop Loss';
        notice(`${label} ${state.openTrade ? 'modified' : 'set'} to ${price(value)} from the ${region === 'tp' ? 'green target' : 'red risk'} zone.`, 'success');
      },
      onDrawingModeChange(mode) {
        syncDrawingToolButtons(mode);
      },
      onPositionLockChange(locked, reason) {
        if (locked) {
          notice(
            reason === 'space'
              ? 'Position tool locked. Double-click the position box to edit it again.'
              : 'Position tool locked. Double-click it again to unlock.',
            'success'
          );
        } else {
          notice('Position tool unlocked. Green edits TP; red edits SL.', 'success');
        }
      },
      onDraftLevel(field, value) {
        if (!editablePosition()) return;
        updateDraftLevel(field, value);
        syncDraftInputs();
        LiveChart.setPosition({
          draft: state.positionDraft,
          openTrade: state.openTrade,
          metrics: state.openTrade ? overlayMetrics(state.openTrade) : positionMetrics(),
        });
        renderPosition();
      },
    });

    LiveChart.setSymbol(symbol);
    LiveChart.setDrawingScope?.(symbol + '|' + $('timeframe').value);
    syncDrawingToolButtons(LiveChart.getState?.().drawingMode || null);

    if (!state.candles.length) {
      LiveChart.setCandles([], { fit: true });
      LiveChart.clearPosition();
      return;
    }

    // Replay safety: the LIVE chart engine only receives candles already
    // revealed by replay. Future candles never enter the chart library.
    const revealed = state.candles.slice(0, state.index + 1);
    LiveChart.setCandles(revealed, { fit: state.chartNeedsFit });
    state.chartNeedsFit = false;
    LiveChart.setPosition({
      draft: state.positionDraft,
      openTrade: state.openTrade,
      metrics: state.openTrade ? overlayMetrics(state.openTrade) : positionMetrics(),
    });
  }

  function renderCandleMeta() {
    const c = currentCandle();
    if (!c) {
      $('currentPrice').textContent = '—'; $('currentTime').textContent = 'No candle loaded'; $('ohlc').textContent = 'O — H — L — C —'; return;
    }
    $('currentPrice').textContent = price(c.close);
    $('currentTime').textContent = new Date(c.timestamp).toLocaleString();
    $('ohlc').textContent = `O ${price(c.open)}  H ${price(c.high)}  L ${price(c.low)}  C ${price(c.close)}`;
    $('progress').textContent = `${state.index + 1} / ${state.candles.length}`;
    $('prevBtn').disabled = state.index <= state.initialIndex || state.trades.length > 0 || Boolean(state.openTrade);
    $('nextBtn').disabled = state.index >= state.candles.length - 1;
  }

  function renderAll() {
    renderChart();
    renderCandleMeta();
    renderPosition();
    renderMetrics();
    renderLog();
  }

  async function loadReplay() {
    stopTimer();
    notice('');
    state.busy = true;
    $('loadBtn').disabled = true;
    try {
      const start = inputIso('startDate');
      const end = inputIso('endDate');
      if (new Date(end) <= new Date(start)) throw new Error('End must be after start.');
      const starting = Number($('startingBalance').value);
      if (!Number.isFinite(starting) || starting <= 0) throw new Error('Starting balance must be positive.');
      const result = await Api.loadHistory({
        symbol: $('symbol').value,
        timeframe: $('timeframe').value,
        start,
        end,
      });
      if (!Array.isArray(result.candles) || result.candles.length < 2) throw new Error('Not enough historical candles for replay.');
      state.candles = result.candles;
      state.initialIndex = Math.min(59, state.candles.length - 1);
      state.index = state.initialIndex;
      state.openTrade = null;
      state.positionDraft = null;
      state.trades = [];
      state.startingBalance = starting;
      state.balance = starting;
      state.peak = starting;
      state.maxDrawdown = 0;
      resetChartViewport();
      $('slPrice').value = '';
      $('tpPrice').value = '';
      setActivePriceField('slPrice');
      $('chartTitle').textContent = `${result.symbol} • ${result.timeframe} • Manual Replay`;
      $('chartMeta').textContent = `${result.candles.length.toLocaleString()} closed candles • static replay data • future candles hidden • strategy required: NO`;
      notice('Manual replay loaded. You control every trade.', 'success');
      renderAll();
    } catch (error) {
      notice(error.message || 'Manual replay could not be loaded.', 'error');
    } finally {
      state.busy = false;
      $('loadBtn').disabled = false;
    }
  }

  function resetSession() {
    stopTimer();
    if (!state.candles.length) return;
    const starting = Number($('startingBalance').value);
    if (!Number.isFinite(starting) || starting <= 0) return notice('Starting balance must be positive.', 'error');
    state.index = state.initialIndex;
    state.openTrade = null;
    state.positionDraft = null;
    state.trades = [];
    state.startingBalance = starting;
    state.balance = starting;
    state.peak = starting;
    state.maxDrawdown = 0;
    state.chartNeedsFit = true;
    resetChartViewport();
    $('slPrice').value = '';
    $('tpPrice').value = '';
    state.hoverPrice = null;
    setActivePriceField('slPrice');
    notice('Manual session reset.', 'success');
    renderAll();
  }

  function chartPoint(event) {
    const metrics = state.chartMetrics;
    if (!metrics) return null;
    const rect = $('chart').getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: (event.clientX - rect.left) * metrics.width / rect.width,
      y: (event.clientY - rect.top) * metrics.height / rect.height,
    };
  }

  function schedulePositionRender() {
    if (state.renderFrame) return;
    state.renderFrame = requestAnimationFrame(() => {
      state.renderFrame = null;
      renderChart();
      renderPosition();
    });
  }

  function beginHandleDrag(event) {
    const handle = event.target.closest?.('[data-position-handle]');
    if (!handle || !state.positionDraft || state.openTrade) return false;
    const field = handle.getAttribute('data-position-handle');
    if (!['sl', 'tp'].includes(field)) return false;
    state.draggingHandle = field;
    state.dragPointerId = event.pointerId;
    state.suppressChartClick = true;
    state.hoverPrice = state.hoverX = state.hoverY = null;
    setActivePriceField(field === 'tp' ? 'tpPrice' : 'slPrice');
    $('chart').setPointerCapture?.(event.pointerId);
    event.preventDefault();
    return true;
  }

  function updateHandleDrag(event) {
    if (!state.draggingHandle || !state.positionDraft) return false;
    const point = chartPoint(event);
    if (!point) return false;
    const metrics = state.chartMetrics;
    const candidate = Position.chartYToPrice(point.y, metrics.scale, metrics.top, metrics.plotH);
    updateDraftLevel(state.draggingHandle, candidate);
    syncDraftInputs();
    schedulePositionRender();
    event.preventDefault();
    return true;
  }

  function endHandleDrag(event) {
    if (!state.draggingHandle) return false;
    if (state.dragPointerId != null) $('chart').releasePointerCapture?.(state.dragPointerId);
    state.draggingHandle = null;
    state.dragPointerId = null;
    renderAll();
    event?.preventDefault?.();
    return true;
  }

  function beginChartGesture(event) {
    if (!state.candles.length || state.draggingHandle) return false;
    const metrics = state.chartMetrics;
    const point = chartPoint(event);
    if (!metrics || !point) return false;

    const onPriceAxis = point.x > metrics.width - metrics.right;
    const inPlot = (
      point.x >= metrics.left &&
      point.x <= metrics.width - metrics.right &&
      point.y >= metrics.top &&
      point.y <= metrics.height - metrics.bottom
    );
    if (!onPriceAxis && !inPlot) return false;

    const window = viewportWindow();
    const currentCenter = (metrics.scale.low + metrics.scale.high) / 2;
    const currentSpan = metrics.scale.span;

    state.chartGesture = {
      mode: onPriceAxis ? 'price-scale' : 'pan',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewEnd: window.end,
      startCount: window.count,
      startCenter: currentCenter,
      startSpan: currentSpan,
      moved: false,
    };
    state.chartGesturePointerId = event.pointerId;
    state.hoverPrice = state.hoverX = state.hoverY = null;
    $('chart').setPointerCapture?.(event.pointerId);
    event.preventDefault();
    return true;
  }

  function updateChartGesture(event) {
    const gesture = state.chartGesture;
    const metrics = state.chartMetrics;
    if (!gesture || !metrics) return false;

    const dx = event.clientX - gesture.startClientX;
    const dy = event.clientY - gesture.startClientY;
    if (!gesture.moved && Math.hypot(dx, dy) >= 4) gesture.moved = true;

    if (gesture.mode === 'price-scale') {
      const factor = Math.exp(dy / 180);
      state.manualPriceCenter = gesture.startCenter;
      state.manualPriceSpan = Math.max(
        gesture.startSpan * 0.08,
        Math.min(gesture.startSpan * 12, gesture.startSpan * factor)
      );
    } else {
      const barsPerPixel = gesture.startCount / Math.max(metrics.candlePlotW || metrics.plotW, 1);
      const nextEnd = clampViewEnd(
        gesture.startViewEnd - dx * barsPerPixel
      );
      state.viewEnd = nextEnd >= revealedEnd() ? null : nextEnd;
      state.manualPriceCenter = gesture.startCenter + (dy / Math.max(metrics.plotH, 1)) * gesture.startSpan;
      state.manualPriceSpan = gesture.startSpan;
    }

    renderChart();
    event.preventDefault();
    return true;
  }

  function endChartGesture(event) {
    const gesture = state.chartGesture;
    if (!gesture) return false;
    if (state.chartGesturePointerId != null) {
      $('chart').releasePointerCapture?.(state.chartGesturePointerId);
    }
    if (gesture.moved) state.suppressChartClick = true;
    state.chartGesture = null;
    state.chartGesturePointerId = null;
    renderChart();
    event?.preventDefault?.();
    return true;
  }

  async function toggleFullscreenWorkspace() {
    const workspace = $('replayWorkspace');
    if (!workspace) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
        return;
      }
      if (workspace.requestFullscreen) {
        await workspace.requestFullscreen();
      } else if (workspace.webkitRequestFullscreen) {
        workspace.webkitRequestFullscreen();
      } else {
        document.body.classList.toggle('manual-replay-fullscreen-fallback');
        window.dispatchEvent(new Event('resize'));
        syncFullscreenUi();
      }
    } catch (_error) {
      document.body.classList.toggle('manual-replay-fullscreen-fallback');
      window.dispatchEvent(new Event('resize'));
      syncFullscreenUi();
    }
  }

  function syncFullscreenUi() {
    const active = Boolean(document.fullscreenElement || document.body.classList.contains('manual-replay-fullscreen-fallback'));
    const button = $('fullscreenBtn');
    if (button) button.textContent = active ? '⤢ Exit Full Screen' : '⛶ Full Screen';
    requestAnimationFrame(() => LiveChart?.resize?.());
  }

  $('startYear')?.addEventListener('change', () => applyYearJump('startDate', 'startYear'));
  $('endYear')?.addEventListener('change', () => applyYearJump('endDate', 'endYear'));

  $('loadBtn').addEventListener('click', loadReplay);
  $('nextBtn').addEventListener('click', () => { stopTimer(); advanceOne(); });
  $('prevBtn').addEventListener('click', () => {
    stopTimer();
    if (state.trades.length || state.openTrade || state.index <= state.initialIndex) return;
    state.index -= 1; renderAll();
  });
  $('playBtn').addEventListener('click', () => state.timer ? stopTimer() : setPlaying());
  $('speed').addEventListener('change', () => { if (state.timer) setPlaying(); });
  $('zoomInBtn').addEventListener('click', () => zoomChart(-1, null));
  $('zoomOutBtn').addEventListener('click', () => zoomChart(1, null));
  $('fullscreenBtn').addEventListener('click', toggleFullscreenWorkspace);
  document.addEventListener('fullscreenchange', syncFullscreenUi);
  document.addEventListener('webkitfullscreenchange', syncFullscreenUi);

  $('slPrice').addEventListener('focus', () => setActivePriceField('slPrice'));
  $('tpPrice').addEventListener('focus', () => setActivePriceField('tpPrice'));
  $('slPrice').addEventListener('input', () => updateDraftFromInput('sl', 'slPrice'));
  $('tpPrice').addEventListener('input', () => updateDraftFromInput('tp', 'tpPrice'));
  $('slPrice').addEventListener('change', commitDraftInputs);
  $('tpPrice').addEventListener('change', commitDraftInputs);
  $('positionSizingMode').addEventListener('change', () => {
    updateSizingControls();
    renderAll();
  });
  $('riskMethod').addEventListener('change', renderAll);
  $('riskValue').addEventListener('input', renderAll);
  $('lotSize').addEventListener('input', renderAll);
  $('longPositionBtn').addEventListener('click', () => createPositionDraft('BUY'));
  $('shortPositionBtn').addEventListener('click', () => createPositionDraft('SELL'));
  $('cancelPositionBtn').addEventListener('click', cancelPositionDraft);
  $('drawLineBtn').addEventListener('click', () => toggleDrawingMode('line'));
  $('drawRectBtn').addEventListener('click', () => toggleDrawingMode('rect'));


  $('buyBtn').addEventListener('click', () => openManualTrade('BUY'));
  $('sellBtn').addEventListener('click', () => openManualTrade('SELL'));
  $('closeBtn').addEventListener('click', closeManually);
  $('resetBtn').addEventListener('click', resetSession);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('manual-replay-fullscreen-fallback')) {
      document.body.classList.remove('manual-replay-fullscreen-fallback');
      syncFullscreenUi();
    }
  });

  setDefaultDates();
  setActivePriceField('slPrice');
  updateSizingControls();
  syncDrawingToolButtons(null);
  renderMetrics();
  renderAll();
})();
