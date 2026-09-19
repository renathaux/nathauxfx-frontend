(() => {
  'use strict';

  const Api = window.ManualReplayApi;
  const $ = (id) => document.getElementById(id);
  const state = {
    candles: [],
    index: 0,
    initialIndex: 0,
    timer: null,
    openTrade: null,
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
    const candle = currentCandle();
    const entry = Number(candle.close);
    const slRaw = $('slPrice').value.trim();
    const sl = slRaw === '' ? null : Number(slRaw);
    const tpRaw = $('tpPrice').value.trim();
    const tp = tpRaw === '' ? null : Number(tpRaw);
    if (sl == null || !Number.isFinite(sl)) return notice('Enter a valid Stop Loss.', 'error');
    if (side === 'BUY' && sl >= entry) return notice('BUY stop loss must be below the entry.', 'error');
    if (side === 'SELL' && sl <= entry) return notice('SELL stop loss must be above the entry.', 'error');
    if (tp != null && !Number.isFinite(tp)) return notice('Take Profit is invalid.', 'error');
    if (side === 'BUY' && tp != null && tp <= entry) return notice('BUY take profit must be above the entry.', 'error');
    if (side === 'SELL' && tp != null && tp >= entry) return notice('SELL take profit must be below the entry.', 'error');

    let risk;
    try { risk = riskDollars(); } catch (error) { return notice(error.message, 'error'); }
    state.openTrade = {
      tradeId: `manual_${Date.now()}`,
      side,
      entryIndex: state.index,
      entryTime: candle.timestamp,
      entry,
      sl,
      tp,
      riskDollars: risk,
    };
    notice(`${side} opened virtually at ${price(entry)}.`, 'success');
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
    $('buyBtn').disabled = !state.candles.length || Boolean(trade);
    $('sellBtn').disabled = !state.candles.length || Boolean(trade);
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

  function renderChart() {
    const svg = $('chart');
    if (!state.candles.length) {
      state.chartMetrics = null;
      svg.innerHTML = '<text x="600" y="265" text-anchor="middle" class="empty-text">Load historical candles to begin manual replay</text>';
      return;
    }

    const end = state.index + 1;
    const visible = Math.max(20, Math.min(Number(state.visibleCandles) || 120, 300));
    const start = Math.max(0, end - visible);
    const rows = state.candles.slice(start, end);
    const levels = [];

    const draftSlRaw = $('slPrice').value.trim();
    const draftSl = draftSlRaw === '' ? null : Number(draftSlRaw);
    const draftTpRaw = $('tpPrice').value.trim();
    const draftTp = draftTpRaw === '' ? null : Number(draftTpRaw);

    if (state.openTrade) {
      levels.push(state.openTrade.entry, state.openTrade.sl, ...(state.openTrade.tp == null ? [] : [state.openTrade.tp]));
    } else {
      if (draftSl != null && Number.isFinite(draftSl)) levels.push(draftSl);
      if (draftTp != null && Number.isFinite(draftTp)) levels.push(draftTp);
    }

    const rawLow = Math.min(...rows.map((c) => Number(c.low)));
    const rawHigh = Math.max(...rows.map((c) => Number(c.high)));
    const rawSpan = rawHigh - rawLow || Math.max(Math.abs(rawHigh) * 0.001, 0.0001);
    const padding = rawSpan * 0.07;
    const low = rawLow - padding;
    const high = rawHigh + padding;
    const span = high - low || 1;

    const width = 1200, height = 520, left = 58, right = 92, top = 24, bottom = 42;
    const plotW = width - left - right, plotH = height - top - bottom;
    const slot = plotW / Math.max(rows.length, 1);
    const y = (v) => top + ((high - Number(v)) / span) * plotH;
    state.chartMetrics = { width, height, left, right, top, bottom, plotW, plotH, low, high, span };

    let out = '';
    for (let i = 0; i <= 6; i++) {
      const yy = top + plotH * i / 6;
      const label = high - span * i / 6;
      out += `<line class="grid" x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}"/><text class="axis price-axis" x="${width-right+8}" y="${yy+4}">${price(label)}</text>`;
    }

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

    const line = (value, cls, label) => `<line class="level ${cls}" x1="${left}" y1="${y(value)}" x2="${width-right}" y2="${y(value)}"/><text class="level-label ${cls}" x="${left+8}" y="${Math.max(top+13, y(value)-6)}">${label} ${price(value)}</text>`;
    if (state.openTrade) {
      const t = state.openTrade;
      if (t.entry >= low && t.entry <= high) out += line(t.entry, 'entry', 'ENTRY');
      if (t.sl >= low && t.sl <= high) out += line(t.sl, 'sl', 'SL');
      if (t.tp != null && t.tp >= low && t.tp <= high) out += line(t.tp, 'tp', 'TP');
    } else {
      if (draftSl != null && Number.isFinite(draftSl) && draftSl >= low && draftSl <= high) out += line(draftSl, 'sl', 'SL');
      if (draftTp != null && Number.isFinite(draftTp) && draftTp >= low && draftTp <= high) out += line(draftTp, 'tp', 'TP');
    }

    const current = Number(currentCandle().close);
    const currentY = y(current);
    const currentX = left + slot * (rows.length - 1) + slot / 2;
    out += `<line class="current-line" x1="${currentX}" y1="${top}" x2="${currentX}" y2="${height-bottom}"/>`;
    out += `<line class="current-price-line" x1="${left}" y1="${currentY}" x2="${width-right}" y2="${currentY}"/>`;
    out += `<rect class="current-price-badge" x="${width-right-70}" y="${currentY-10}" width="70" height="20" rx="4"/><text class="current-price-text" x="${width-right-35}" y="${currentY+4}" text-anchor="middle">${price(current)}</text>`;

    if (
      Number.isFinite(state.hoverPrice) &&
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
  $('slPrice').addEventListener('input', renderChart);
  $('tpPrice').addEventListener('input', renderChart);

  const chart = $('chart');
  chart.addEventListener('wheel', (event) => {
    if (!state.candles.length) return;
    event.preventDefault();
    zoomChart(event.deltaY < 0 ? -1 : 1);
  }, { passive: false });

  chart.addEventListener('pointermove', (event) => {
    const metrics = state.chartMetrics;
    if (!metrics || !state.candles.length) return;
    const rect = chart.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) * metrics.width / rect.width;
    const y = (event.clientY - rect.top) * metrics.height / rect.height;
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
    if (state.hoverPrice == null) return;
    state.hoverPrice = state.hoverX = state.hoverY = null;
    renderChart();
  });

  chart.addEventListener('click', () => {
    if (!state.candles.length || !Number.isFinite(state.hoverPrice) || state.openTrade) return;
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
