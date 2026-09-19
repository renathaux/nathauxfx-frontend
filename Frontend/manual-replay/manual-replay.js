(() => {
  'use strict';

  const Api = window.ManualReplayApi;
  const Position = window.ManualReplayPosition;
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
    hoverPrice: null,
    hoverX: null,
    hoverY: null,
    activePriceField: 'slPrice',
    chartMetrics: null,
    draggingHandle: null,
    dragPointerId: null,
    suppressChartClick: false,
    renderFrame: null,
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

  function localInput(date) {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  }

  function setDefaultDates() {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 86400000);
    $('startDate').value = localInput(start);
    $('endDate').value = localInput(end);
  }

  function inputIso(id) {
    const d = new Date($(id).value);
    if (Number.isNaN(d.getTime())) throw new Error('Choose a valid start and end.');
    return d.toISOString();
  }

  function currentCandle() {
    return state.candles[state.index] || null;
  }

  function visibleRows() {
    const count = Math.max(20, Math.min(Number(state.visibleCandles) || 120, 300));
    return Position.visibleReplayWindow(state.candles, state.index, count).rows;
  }

  function minimumPriceDistance(entry) {
    return Math.abs(Number(entry)) >= 100 ? 0.01 : 0.00001;
  }

  function syncDraftInputs() {
    const draft = state.positionDraft;
    $('slPrice').value = draft && draft.sl != null && Number.isFinite(Number(draft.sl)) ? price(draft.sl) : '';
    $('tpPrice').value = draft && draft.tp != null && Number.isFinite(Number(draft.tp)) ? price(draft.tp) : '';
  }

  function positionMetrics() {
    if (!state.positionDraft) return null;
    return Position.calculatePositionMetrics({
      draft: state.positionDraft,
      riskMethod: $('riskMethod').value,
      riskValue: $('riskValue').value,
      balance: state.balance,
    });
  }

  function refreshDraftEntry() {
    if (!state.positionDraft || state.openTrade || !currentCandle()) return;
    const entry = Number(currentCandle().close);
    const draft = { ...state.positionDraft, entry };
    const gap = minimumPriceDistance(entry);
    state.positionDraft = {
      ...draft,
      sl: Position.validatePositionLevel(draft, 'sl', draft.sl, gap),
      tp: Position.validatePositionLevel(draft, 'tp', draft.tp, gap),
    };
    syncDraftInputs();
  }

  function createPositionDraft(side) {
    if (!state.candles.length) return notice('Load a replay first.', 'error');
    if (state.openTrade) return notice('Close the active virtual position before creating another.', 'error');
    const scale = Position.visibleCandleScale(visibleRows());
    const entry = Number(currentCandle().close);
    state.positionDraft = Position.createPositionDraft({
      side,
      entry,
      visibleLow: scale.rawLow,
      visibleHigh: scale.rawHigh,
      minimumDisplayDistance: minimumPriceDistance(entry),
    });
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
    if (!state.positionDraft || state.openTrade) return;
    state.positionDraft = Position.updateDraftLevel(
      state.positionDraft,
      field,
      rawValue,
      minimumPriceDistance(state.positionDraft.entry)
    );
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
    const current = Math.max(20, Math.min(Number(state.visibleCandles) || 120, 300));
    const next = direction < 0
      ? Math.max(20, Math.round(current * 0.8))
      : Math.min(300, Math.round(current * 1.25));
    if (next === current) return;
    state.visibleCandles = next;
    state.hoverPrice = null;
    renderChart();
  }

  function riskDollars() {
    const value = Number($('riskValue').value);
    if (!Number.isFinite(value) || value <= 0) throw new Error('Risk value must be greater than zero.');
    if ($('riskMethod').value === 'FIXED') return value;
    return state.balance * value / 100;
  }

  function tradeR(trade, exitPrice) {
    const distance = Math.abs(trade.entry - trade.sl);
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
      closeTrade('SL', trade.sl, -1, true);
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
    refreshDraftEntry();
    const candle = currentCandle();
    const metrics = positionMetrics();
    if (!metrics || !metrics.valid) return notice('Enter valid Stop Loss, Take Profit, and risk values.', 'error');
    try {
      state.openTrade = Position.createVirtualTrade({
        draft: state.positionDraft,
        requestedSide: side,
        currentClose: candle.close,
        entryIndex: state.index,
        entryTime: candle.timestamp,
        riskDollars: metrics.riskDollars,
      });
    } catch (error) {
      return notice(error.message, 'error');
    }
    state.positionDraft = null;
    syncDraftInputs();
    notice(`${side} opened virtually at ${price(state.openTrade.entry)}.`, 'success');
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
    const draftMetrics = positionMetrics();
    $('draftDirection').value = draft ? (draft.side === 'BUY' ? 'LONG / BUY' : 'SHORT / SELL') : '—';
    $('draftEntry').value = draft ? price(draft.entry) : '—';
    $('draftRr').textContent = draftMetrics && Number.isFinite(draftMetrics.rr) ? draftMetrics.rr.toFixed(2) : '—';
    $('draftRisk').textContent = draftMetrics && Number.isFinite(draftMetrics.riskDollars) ? money(draftMetrics.riskDollars) : '—';
    $('draftReward').textContent = draftMetrics && Number.isFinite(draftMetrics.rewardDollars) ? money(draftMetrics.rewardDollars) : '—';
    const ready = Boolean(draft && draftMetrics && draftMetrics.valid && !trade);
    $('buyBtn').disabled = !ready || draft.side !== 'BUY';
    $('sellBtn').disabled = !ready || draft.side !== 'SELL';
    $('longPositionBtn').disabled = !state.candles.length || Boolean(trade);
    $('shortPositionBtn').disabled = !state.candles.length || Boolean(trade);
    $('longPositionBtn').setAttribute('aria-pressed', String(Boolean(draft && draft.side === 'BUY')));
    $('shortPositionBtn').setAttribute('aria-pressed', String(Boolean(draft && draft.side === 'SELL')));
    $('longPositionBtn').classList.toggle('is-active', Boolean(draft && draft.side === 'BUY'));
    $('shortPositionBtn').classList.toggle('is-active', Boolean(draft && draft.side === 'SELL'));
    $('cancelPositionBtn').disabled = !draft || Boolean(trade);
    $('slPrice').disabled = !draft || Boolean(trade);
    $('tpPrice').disabled = !draft || Boolean(trade);
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
      body.innerHTML = '<tr><td colspan="11" class="empty">No manual trades yet.</td></tr>';
      return;
    }
    body.innerHTML = state.trades.map((t, i) => `<tr>
      <td>${i + 1}</td><td class="${t.side === 'BUY' ? 'positive' : 'negative'}">${t.side}</td>
      <td>${new Date(t.entryTime).toLocaleString()}</td><td>${t.exitTime ? new Date(t.exitTime).toLocaleString() : '—'}</td>
      <td>${price(t.entry)}</td><td>${price(t.exit)}</td><td>${price(t.sl)}</td><td>${t.tp == null ? '—' : price(t.tp)}</td>
      <td>${t.outcome}</td><td>${t.r == null ? '—' : `${Number(t.r).toFixed(2)}R`}</td>
      <td class="${t.pnl > 0 ? 'positive' : t.pnl < 0 ? 'negative' : ''}">${money(t.pnl)}</td>
    </tr>`).join('');
  }

  function overlayMetrics(position) {
    if (!position) return null;
    return Position.calculatePositionMetrics({
      draft: position,
      riskMethod: 'FIXED',
      riskValue: Number(position.riskDollars) || (position === state.positionDraft ? positionMetrics()?.riskDollars : 0),
      balance: state.balance,
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
    const svg = $('chart');
    if (!state.candles.length) {
      state.chartMetrics = null;
      svg.innerHTML = '<text x="600" y="265" text-anchor="middle" class="empty-text">Load historical candles to begin manual replay</text>';
      return;
    }

    const visible = Math.max(20, Math.min(Number(state.visibleCandles) || 120, 300));
    const window = Position.visibleReplayWindow(state.candles, state.index, visible);
    const { start, rows } = window;
    const scale = Position.visibleCandleScale(rows);
    const { low, high, span } = scale;

    const width = 1200, height = 520, left = 58, right = 92, top = 24, bottom = 42;
    const plotW = width - left - right, plotH = height - top - bottom;
    const slot = plotW / Math.max(rows.length, 1);
    const y = (value) => Position.priceToChartY(value, scale, top, plotH);
    const xForIndex = (index) => Math.min(width - right, Math.max(left, left + slot * (Number(index) - start) + slot / 2));
    state.chartMetrics = { width, height, left, right, top, bottom, plotW, plotH, low, high, span, scale, start, rows: rows.length };

    let out = '';
    for (let i = 0; i <= 6; i++) {
      const yy = top + plotH * i / 6;
      const label = high - span * i / 6;
      out += `<line class="grid" x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}"/><text class="axis price-axis" x="${width-right+8}" y="${yy+4}">${price(label)}</text>`;
    }

    const overlays = [];
    for (const trade of state.trades.slice(-5)) {
      if (Number(trade.exitIndex) < start || Number(trade.entryIndex) > state.index) continue;
      const tradeStartX = xForIndex(Math.max(start, Number(trade.entryIndex)));
      const tradeEndX = Math.max(tradeStartX + 28, xForIndex(Math.min(state.index, Number(trade.exitIndex))));
      overlays.push(renderPositionOverlay(trade, {
        scale, top, plotH, startX: tradeStartX, endX: tradeEndX,
        historical: true, active: false, draggable: false,
      }));
    }
    if (state.openTrade) {
      overlays.push(renderPositionOverlay(state.openTrade, {
        scale, top, plotH, startX: xForIndex(state.openTrade.entryIndex), endX: width - right,
        historical: false, active: true, draggable: false,
      }));
    } else if (state.positionDraft) {
      overlays.push(renderPositionOverlay(state.positionDraft, {
        scale, top, plotH, startX: xForIndex(state.index), endX: width - right,
        historical: false, active: false, draggable: true,
      }));
    }
    out += overlays.map((overlay) => overlay.zones).join('');

    rows.forEach((c, i) => {
      const x = left + slot * i + slot / 2;
      const openY = y(c.open), closeY = y(c.close), highY = y(c.high), lowY = y(c.low);
      const down = Number(c.close) < Number(c.open);
      const bodyY = Math.min(openY, closeY), bodyH = Math.max(Math.abs(closeY - openY), 2);
      out += `<line class="wick" x1="${x}" y1="${highY}" x2="${x}" y2="${lowY}"/><rect class="body ${down ? 'down' : 'up'}" x="${x-Math.max(2,slot*.28)}" y="${bodyY}" width="${Math.max(4,slot*.56)}" height="${bodyH}" rx="1"/>`;
      const timeEvery = rows.length <= 40 ? 8 : rows.length <= 80 ? 12 : 20;
      if (i % timeEvery === 0 || i === rows.length - 1) {
        out += `<text class="axis time" x="${x}" y="${height-14}" text-anchor="middle">${new Date(c.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</text>`;
      }
    });

    out += overlays.map((overlay) => overlay.details).join('');

    const current = Number(currentCandle().close);
    const currentY = y(current);
    const currentX = xForIndex(state.index);
    out += `<line class="current-line" x1="${currentX}" y1="${top}" x2="${currentX}" y2="${height-bottom}"/>`;
    out += `<line class="current-price-line" x1="${left}" y1="${currentY}" x2="${width-right}" y2="${currentY}"/>`;
    out += `<rect class="current-price-badge" x="${width-right-70}" y="${currentY-10}" width="70" height="20" rx="4"/><text class="current-price-text" x="${width-right-35}" y="${currentY+4}" text-anchor="middle">${price(current)}</text>`;

    if (
      !state.draggingHandle && Number.isFinite(state.hoverPrice) &&
      Number.isFinite(state.hoverX) &&
      Number.isFinite(state.hoverY)
    ) {
      const hx = Math.min(width-right, Math.max(left, state.hoverX));
      const hy = Math.min(height-bottom, Math.max(top, state.hoverY));
      out += `<line class="crosshair" x1="${left}" y1="${hy}" x2="${width-right}" y2="${hy}"/>`;
      out += `<line class="crosshair" x1="${hx}" y1="${top}" x2="${hx}" y2="${height-bottom}"/>`;
      out += `<rect class="crosshair-price-badge" x="${width-right-76}" y="${hy-11}" width="76" height="22" rx="4"/><text class="crosshair-price-text" x="${width-right-38}" y="${hy+4}" text-anchor="middle">${price(state.hoverPrice)}</text>`;
    }

    svg.innerHTML = out;
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
    refreshDraftEntry();
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
      state.visibleCandles = 120;
      state.hoverPrice = null;
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

  $('loadBtn').addEventListener('click', loadReplay);
  $('nextBtn').addEventListener('click', () => { stopTimer(); advanceOne(); });
  $('prevBtn').addEventListener('click', () => {
    stopTimer();
    if (state.trades.length || state.openTrade || state.index <= state.initialIndex) return;
    state.index -= 1; renderAll();
  });
  $('playBtn').addEventListener('click', () => state.timer ? stopTimer() : setPlaying());
  $('speed').addEventListener('change', () => { if (state.timer) setPlaying(); });
  $('zoomInBtn').addEventListener('click', () => zoomChart(-1));
  $('zoomOutBtn').addEventListener('click', () => zoomChart(1));

  $('slPrice').addEventListener('focus', () => setActivePriceField('slPrice'));
  $('tpPrice').addEventListener('focus', () => setActivePriceField('tpPrice'));
  $('slPrice').addEventListener('input', () => { updateDraftLevel('sl', $('slPrice').value); renderAll(); });
  $('tpPrice').addEventListener('input', () => { updateDraftLevel('tp', $('tpPrice').value); renderAll(); });
  $('riskMethod').addEventListener('change', renderAll);
  $('riskValue').addEventListener('input', renderAll);
  $('longPositionBtn').addEventListener('click', () => createPositionDraft('BUY'));
  $('shortPositionBtn').addEventListener('click', () => createPositionDraft('SELL'));
  $('cancelPositionBtn').addEventListener('click', cancelPositionDraft);

  const chart = $('chart');
  chart.addEventListener('wheel', (event) => {
    if (!state.candles.length) return;
    event.preventDefault();
    zoomChart(event.deltaY < 0 ? -1 : 1);
  }, { passive: false });

  chart.addEventListener('pointerdown', beginHandleDrag);

  chart.addEventListener('pointermove', (event) => {
    if (updateHandleDrag(event)) return;
    const metrics = state.chartMetrics;
    if (!metrics || !state.candles.length) return;
    const point = chartPoint(event);
    if (!point) return;
    const { x, y } = point;
    if (
      x < metrics.left || x > metrics.width - metrics.right ||
      y < metrics.top || y > metrics.height - metrics.bottom
    ) {
      if (state.hoverPrice != null) {
        state.hoverPrice = state.hoverX = state.hoverY = null;
        renderChart();
      }
      return;
    }
    state.hoverX = x;
    state.hoverY = y;
    state.hoverPrice = metrics.high - ((y - metrics.top) / metrics.plotH) * metrics.span;
    renderChart();
  });

  chart.addEventListener('pointerleave', () => {
    if (state.draggingHandle) return;
    if (state.hoverPrice == null) return;
    state.hoverPrice = state.hoverX = state.hoverY = null;
    renderChart();
  });

  chart.addEventListener('pointerup', endHandleDrag);
  chart.addEventListener('pointercancel', endHandleDrag);

  chart.addEventListener('click', () => {
    if (state.suppressChartClick) {
      state.suppressChartClick = false;
      return;
    }
    if (!state.candles.length || !state.positionDraft || !Number.isFinite(state.hoverPrice) || state.openTrade) return;
    const target = $(state.activePriceField || 'slPrice');
    if (!target) return;
    target.value = price(state.hoverPrice);
    target.dispatchEvent(new Event('input', { bubbles: true }));
    const label = state.activePriceField === 'tpPrice' ? 'Take Profit' : 'Stop Loss';
    notice(`${label} set to ${price(state.hoverPrice)} from the chart.`, 'success');
  });

  $('buyBtn').addEventListener('click', () => openManualTrade('BUY'));
  $('sellBtn').addEventListener('click', () => openManualTrade('SELL'));
  $('closeBtn').addEventListener('click', closeManually);
  $('resetBtn').addEventListener('click', resetSession);

  setDefaultDates();
  setActivePriceField('slPrice');
  renderMetrics();
  renderAll();
})();
