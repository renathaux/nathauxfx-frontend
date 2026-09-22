(() => {
  'use strict';

  const state = {
    chart: null,
    series: null,
    container: null,
    layer: null,
    symbol: 'EURUSD',
    lastCandles: [],
    draft: null,
    openTrade: null,
    metrics: null,
    callbacks: {},
    priceLines: new Map(),
    resizeObserver: null,
    drag: null,
    hoverPoint: null,
    positionHitbox: null,
    positionLocked: false,
    positionKey: null,
    clickTimer: null,
    interactionHost: null,
    interactionHandlers: null,
    userMovedRange: false,
    initialized: false,
  };

  function precisionFor(symbol) {
    return String(symbol || '').toUpperCase() === 'EURUSD'
      ? { precision: 5, minMove: 0.00001 }
      : { precision: 2, minMove: 0.01 };
  }

  function normalizeTime(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value > 10_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
  }

  function normalizeCandle(candle) {
    const result = {
      time: normalizeTime(candle?.timestamp ?? candle?.time),
      open: Number(candle?.open),
      high: Number(candle?.high),
      low: Number(candle?.low),
      close: Number(candle?.close),
    };
    return Object.values(result).every(Number.isFinite) ? result : null;
  }

  function chartOptions(symbol) {
    const price = precisionFor(symbol);
    return {
      width: state.container?.clientWidth || 800,
      height: Math.max(state.container?.clientHeight || 420, 320),
      layout: {
        background: { color: '#0b0f1a' },
        textColor: '#9fb0c8',
        attributionLogo: false,
      },
      priceFormat: {
        type: 'price',
        precision: price.precision,
        minMove: price.minMove,
      },
      grid: {
        vertLines: { color: 'rgba(42, 51, 66, 0.45)' },
        horzLines: { color: 'rgba(42, 51, 66, 0.45)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(180, 190, 210, 0.35)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#111827',
        },
        horzLine: {
          color: 'rgba(180, 190, 210, 0.35)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#111827',
        },
      },
      rightPriceScale: {
        borderColor: '#1f2937',
        scaleMargins: {
          top: 0.08,
          bottom: 0.08,
        },
      },
      timeScale: {
        borderColor: '#1f2937',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 14,
        rightOffset: 22,
        lockVisibleTimeRangeOnResize: true,
      },
    };
  }

  // Long/Short is a drawing overlay, like TradingView. It must never expand
  // the price scale by itself; candle prices remain the authority for autoscale.

  function seriesOptions(symbol) {
    const price = precisionFor(symbol);
    return {
      upColor: '#26a69a',
      borderUpColor: '#26a69a',
      wickUpColor: '#26a69a',
      downColor: '#ef5350',
      borderDownColor: '#ef5350',
      wickDownColor: '#ef5350',
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: {
        type: 'price',
        precision: price.precision,
        minMove: price.minMove,
      },
    };
  }

  function clearPriceLines() {
    if (!state.series) return;
    for (const line of state.priceLines.values()) {
      try { state.series.removePriceLine(line); } catch (_error) {}
    }
    state.priceLines.clear();
  }

  function createPriceLine(key, price, options = {}) {
    if (!state.series || !Number.isFinite(Number(price))) return;
    const line = state.series.createPriceLine({
      price: Number(price),
      color: options.color || '#77adff',
      lineWidth: options.lineWidth || 2,
      lineStyle: options.lineStyle ?? 2,
      axisLabelVisible: true,
      title: options.title || key.toUpperCase(),
    });
    state.priceLines.set(key, line);
  }

  function currentPosition() {
    return state.openTrade || state.draft || null;
  }

  function positionIdentity(position) {
    if (!position) return null;
    return [
      position.tradeId || 'draft',
      position.side || '',
      position.entryTime || '',
      Number(position.entry),
    ].join('|');
  }

  function positionRegionAtPoint(x, y) {
    const box = state.positionHitbox;
    if (!box || !Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return null;
    if (x < box.left || x > box.right) return null;
    if (y >= box.profitTop && y <= box.profitBottom) return 'tp';
    if (y >= box.riskTop && y <= box.riskBottom) return 'sl';
    return null;
  }

  function setPositionLocked(locked, reason = 'manual') {
    if (!currentPosition()) return false;
    const next = Boolean(locked);
    if (state.positionLocked === next) return false;
    state.positionLocked = next;
    state.drag = null;
    state.callbacks.onPositionLockChange?.(next, reason);
    requestAnimationFrame(positionDragLayer);
    return true;
  }

  function togglePositionLocked(reason = 'double-click') {
    if (!currentPosition()) return;
    setPositionLocked(!state.positionLocked, reason);
  }

  function rebuildPriceLines() {
    // Do not draw infinite Lightweight Charts price lines for manual positions.
    // The manual replay uses a TradingView-style position box instead.
    clearPriceLines();
    requestAnimationFrame(positionDragLayer);
  }

  function priceToY(price) {
    if (!state.series || !Number.isFinite(Number(price))) return null;
    try {
      const y = state.series.priceToCoordinate(Number(price));
      return Number.isFinite(Number(y)) ? Number(y) : null;
    } catch (_error) {
      return null;
    }
  }

  function yToPrice(y) {
    if (!state.series || !Number.isFinite(Number(y))) return null;
    try {
      const value = state.series.coordinateToPrice(Number(y));
      return Number.isFinite(Number(value)) ? Number(value) : null;
    } catch (_error) {
      return null;
    }
  }

  function ensurePositionTool() {
    if (!state.layer) return null;
    let tool = state.layer.querySelector('.manual-replay-position-tool');
    if (!tool) {
      tool = document.createElement('div');
      tool.className = 'manual-replay-position-tool';
      tool.innerHTML = `
        <div class="manual-replay-position-zone profit"></div>
        <div class="manual-replay-position-zone risk"></div>
        <div class="manual-replay-position-caption target"></div>
        <div class="manual-replay-position-caption stop"></div>
        <div class="manual-replay-position-info"></div>
      `;
      state.layer.prepend(tool);
    }
    return tool;
  }

  function positionAnchorX(position) {
    if (!state.chart || !state.container) return null;
    const scale = state.chart.timeScale();
    let x = null;

    // TradingView-style tools stay anchored to the candle where they were
    // created/opened. Advancing replay candles must not move the drawing.
    const anchorTime = position?.entryTime
      ? normalizeTime(position.entryTime)
      : null;

    if (Number.isFinite(anchorTime) && typeof scale.timeToCoordinate === 'function') {
      try {
        x = scale.timeToCoordinate(anchorTime);
      } catch (_error) {}
    }

    // Important: null must not be coerced to 0 here. That old coercion made
    // the position box begin at the far-left edge of the chart.
    if (!Number.isFinite(x) && state.lastCandles.length && typeof scale.logicalToCoordinate === 'function') {
      try {
        const logicalIndex = Number.isFinite(Number(position?.entryIndex))
          ? Number(position.entryIndex)
          : state.lastCandles.length - 1;
        x = scale.logicalToCoordinate(logicalIndex);
      } catch (_error) {}
    }

    if (Number.isFinite(x)) return Number(x);

    // Last-resort visual fallback keeps the tool close to the current candle
    // area instead of stretching across all historical bars.
    return Math.max(80, (state.container.clientWidth || 800) * 0.66);
  }

  function positionSummary(position) {
    const sideSign = position.side === 'SELL' ? -1 : 1;
    const initialRiskDistance = Number(position.initialRiskDistance) > 0
      ? Number(position.initialRiskDistance)
      : Math.abs(Number(position.entry) - Number(position.initialSl ?? position.sl));
    const riskDollars = Number(state.metrics?.riskDollars ?? position.riskDollars);
    const targetR = initialRiskDistance > 0
      ? sideSign * (Number(position.tp) - Number(position.entry)) / initialRiskDistance
      : null;
    const stopR = initialRiskDistance > 0
      ? sideSign * (Number(position.sl) - Number(position.entry)) / initialRiskDistance
      : null;
    const money = (value) => Number.isFinite(Number(value))
      ? `$${Math.abs(Number(value)).toFixed(2)}`
      : '—';
    const signedMoney = (value) => {
      if (!Number.isFinite(Number(value))) return '—';
      const n = Number(value);
      return `${n >= 0 ? '+' : '-'}$${Math.abs(n).toFixed(2)}`;
    };
    const signedR = (value) => Number.isFinite(Number(value))
      ? `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}R`
      : '—';

    return {
      risk: money(riskDollars),
      targetMoneyText: signedMoney(Number.isFinite(targetR) ? targetR * riskDollars : NaN),
      stopMoneyText: signedMoney(Number.isFinite(stopR) ? stopR * riskDollars : NaN),
      targetRText: signedR(targetR),
      stopRText: signedR(stopR),
    };
  }

  function ensureDragLine(field, label, className) {
    if (!state.layer) return null;
    let node = state.layer.querySelector(`[data-replay-price-field="${field}"]`);
    if (!node) {
      node = document.createElement('div');
      node.className = `manual-replay-live-level ${className}`;
      node.dataset.replayPriceField = field;
      node.innerHTML = `<span>${label}</span><i></i>`;
      state.layer.appendChild(node);

      node.addEventListener('pointerdown', (event) => {
        if (!currentPosition() || field === 'entry' || state.positionLocked) return;
        event.preventDefault();
        event.stopPropagation();
        state.drag = { field, pointerId: event.pointerId };
        node.setPointerCapture?.(event.pointerId);
      });

      node.addEventListener('pointermove', (event) => {
        if (!state.drag || state.drag.field !== field || state.drag.pointerId !== event.pointerId) return;
        const rect = state.container.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const price = yToPrice(y);
        if (!Number.isFinite(price)) return;
        state.callbacks.onDraftLevel?.(field, price);
        event.preventDefault();
      });

      const end = (event) => {
        if (!state.drag || state.drag.field !== field) return;
        try { node.releasePointerCapture?.(state.drag.pointerId); } catch (_error) {}
        state.drag = null;
        event.preventDefault();
      };
      node.addEventListener('pointerup', end);
      node.addEventListener('pointercancel', end);
    }
    return node;
  }

  function positionDragLayer() {
    if (!state.layer || !state.container) return;
    const position = currentPosition();
    if (!position) {
      state.positionHitbox = null;
      state.layer.replaceChildren();
      return;
    }

    const entryY = priceToY(position.entry);
    const slY = priceToY(position.sl);
    const tpY = priceToY(position.tp);
    const anchorX = positionAnchorX(position);
    if (![entryY, slY, tpY, anchorX].every((value) => Number.isFinite(Number(value)))) {
      state.layer.replaceChildren();
      return;
    }

    const containerWidth = state.container.clientWidth || 800;
    const containerHeight = state.container.clientHeight || 460;
    const priceAxisRoom = 72;
    const chartRight = Math.max(180, containerWidth - priceAxisRoom);
    const barSpacing = Number(state.chart?.timeScale?.().options?.()?.barSpacing) || 14;
    const desiredWidth = Math.max(190, Math.min(340, barSpacing * 18));
    let startX = Math.max(10, Math.min(Number(anchorX), chartRight - 150));
    let endX = Math.min(chartRight, startX + desiredWidth);
    if (endX - startX < 150) {
      startX = Math.max(10, endX - 150);
    }
    const width = Math.max(150, endX - startX);

    const tool = ensurePositionTool();
    const side = position.side === 'SELL' ? 'short' : 'long';
    tool.className = `manual-replay-position-tool ${side} ${state.openTrade ? 'active' : 'draft'} ${state.positionLocked ? 'position-locked' : ''}`.trim();

    const profit = tool.querySelector('.manual-replay-position-zone.profit');
    const risk = tool.querySelector('.manual-replay-position-zone.risk');
    const targetCaption = tool.querySelector('.manual-replay-position-caption.target');
    const stopCaption = tool.querySelector('.manual-replay-position-caption.stop');
    const info = tool.querySelector('.manual-replay-position-info');

    const placeZone = (node, y1, y2) => {
      const top = Math.max(0, Math.min(y1, y2));
      const bottom = Math.min(containerHeight, Math.max(y1, y2));
      node.style.left = `${Math.round(startX)}px`;
      node.style.top = `${Math.round(top)}px`;
      node.style.width = `${Math.round(width)}px`;
      node.style.height = `${Math.max(1, Math.round(bottom - top))}px`;
    };
    placeZone(profit, entryY, tpY);
    placeZone(risk, entryY, slY);

    const summary = positionSummary(position);
    const profitTop = Math.min(entryY, tpY);
    const profitBottom = Math.max(entryY, tpY);
    const riskTop = Math.min(entryY, slY);
    const riskBottom = Math.max(entryY, slY);

    state.positionHitbox = {
      left: startX,
      right: endX,
      profitTop,
      profitBottom,
      riskTop,
      riskBottom,
    };

    targetCaption.textContent = `Target: ${summary.targetMoneyText} • ${summary.targetRText}`;
    targetCaption.style.left = `${Math.round(startX + width / 2)}px`;
    targetCaption.style.top = `${Math.round(Math.max(8, Math.min(containerHeight - 28, (profitTop + profitBottom) / 2 - 10)))}px`;
    targetCaption.classList.toggle('compact', profitBottom - profitTop < 38);

    stopCaption.textContent = `Stop: ${summary.stopMoneyText} • ${summary.stopRText}`;
    stopCaption.style.left = `${Math.round(startX + width / 2)}px`;
    stopCaption.style.top = `${Math.round(Math.max(8, Math.min(containerHeight - 28, (riskTop + riskBottom) / 2 - 10)))}px`;
    stopCaption.classList.toggle('compact', riskBottom - riskTop < 38);

    info.textContent = `${position.side === 'BUY' ? 'LONG POSITION' : 'SHORT POSITION'} • Initial Risk ${summary.risk}${state.positionLocked ? ' • 🔒 LOCKED' : ''}`;
    info.style.left = `${Math.round(startX + width / 2)}px`;
    const infoTop = Math.max(8, Math.min(containerHeight - 34, entryY - 14));
    info.style.top = `${Math.round(infoTop)}px`;

    const hover = state.hoverPoint;
    const minY = Math.min(slY, tpY);
    const maxY = Math.max(slY, tpY);
    const isHoveringTool = Boolean(
      hover &&
      Number(hover.x) >= startX - 8 &&
      Number(hover.x) <= endX + 8 &&
      Number(hover.y) >= minY - 8 &&
      Number(hover.y) <= maxY + 8
    );
    tool.classList.toggle('show-details', isHoveringTool || Boolean(state.drag));

    const entry = ensureDragLine('entry', 'ENTRY', 'entry');
    const sl = ensureDragLine('sl', 'STOP', 'sl');
    const tp = ensureDragLine('tp', 'TARGET', 'tp');

    const lineStates = [
      [entry, position.entry, entryY, true],
      [sl, position.sl, slY, state.positionLocked],
      [tp, position.tp, tpY, state.positionLocked],
    ];

    for (const [node, value, y, locked] of lineStates) {
      if (!node) continue;
      node.classList.remove('hidden');
      node.style.left = `${Math.round(startX)}px`;
      node.style.right = 'auto';
      node.style.width = `${Math.round(width)}px`;
      node.style.transform = `translateY(${Math.round(y)}px)`;
      node.classList.toggle('locked', Boolean(locked));
      node.querySelector('span').textContent = `${node.dataset.replayPriceField.toUpperCase()} ${formatPrice(value)}`;
    }
  }

  function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return String(state.symbol).toUpperCase() === 'EURUSD'
      ? number.toFixed(5)
      : number.toFixed(2);
  }

  function resizeChart() {
    if (!state.chart || !state.container) return;
    state.chart.applyOptions({
      width: state.container.clientWidth || 800,
      height: Math.max(state.container.clientHeight || 420, 320),
    });
    requestAnimationFrame(positionDragLayer);
  }

  function init(container, layer, symbol) {
    if (state.initialized && state.chart && state.container === container) return true;
    if (!container || !window.LightweightCharts?.createChart) return false;

    destroy();
    state.container = container;
    state.layer = layer || null;
    state.symbol = String(symbol || 'EURUSD').toUpperCase();

    state.chart = window.LightweightCharts.createChart(
      state.container,
      chartOptions(state.symbol),
    );
    state.series = state.chart.addCandlestickSeries(seriesOptions(state.symbol));

    try {
      state.chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
        state.userMovedRange = true;
        requestAnimationFrame(positionDragLayer);
      });
    } catch (_error) {}

    state.chart.subscribeCrosshairMove((param) => {
      if (!param?.point) {
        state.hoverPoint = null;
        state.callbacks.onHoverPrice?.(null);
        requestAnimationFrame(positionDragLayer);
        return;
      }
      state.hoverPoint = { x: Number(param.point.x), y: Number(param.point.y) };
      state.callbacks.onHoverPrice?.(yToPrice(param.point.y));
      requestAnimationFrame(positionDragLayer);
    });

    state.chart.subscribeClick((param) => {
      if (!param?.point || !currentPosition() || state.positionLocked) return;
      const point = { x: Number(param.point.x), y: Number(param.point.y) };
      const region = positionRegionAtPoint(point.x, point.y);
      if (!region) return;
      const price = yToPrice(point.y);
      if (!Number.isFinite(price)) return;

      // Delay the single-click action briefly so a double-click can toggle
      // lock without first moving SL/TP.
      if (state.clickTimer) window.clearTimeout(state.clickTimer);
      state.clickTimer = window.setTimeout(() => {
        state.clickTimer = null;
        if (state.positionLocked) return;
        state.callbacks.onChartClick?.(price, region);
      }, 220);
    });

    const interactionHost = state.container.parentElement || state.container;
    const onDoubleClick = (event) => {
      if (!currentPosition()) return;
      const rect = state.container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (!positionRegionAtPoint(x, y)) return;
      if (state.clickTimer) {
        window.clearTimeout(state.clickTimer);
        state.clickTimer = null;
      }
      event.preventDefault();
      event.stopPropagation();
      togglePositionLocked('double-click');
    };
    const onKeyDown = (event) => {
      if (event.code !== 'Space' || !currentPosition() || state.positionLocked) return;
      const tag = String(document.activeElement?.tagName || '').toUpperCase();
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag) || document.activeElement?.isContentEditable) return;
      event.preventDefault();
      setPositionLocked(true, 'space');
    };
    interactionHost.addEventListener('dblclick', onDoubleClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    state.interactionHost = interactionHost;
    state.interactionHandlers = { onDoubleClick, onKeyDown };

    if (window.ResizeObserver) {
      state.resizeObserver = new ResizeObserver(resizeChart);
      state.resizeObserver.observe(state.container);
    } else {
      window.addEventListener('resize', resizeChart);
    }

    state.initialized = true;
    return true;
  }

  function destroy() {
    try { state.resizeObserver?.disconnect?.(); } catch (_error) {}
    state.resizeObserver = null;
    if (state.clickTimer) {
      window.clearTimeout(state.clickTimer);
      state.clickTimer = null;
    }
    if (state.interactionHost && state.interactionHandlers?.onDoubleClick) {
      state.interactionHost.removeEventListener('dblclick', state.interactionHandlers.onDoubleClick, true);
    }
    if (state.interactionHandlers?.onKeyDown) {
      document.removeEventListener('keydown', state.interactionHandlers.onKeyDown, true);
    }
    state.interactionHost = null;
    state.interactionHandlers = null;
    if (state.chart) {
      try { state.chart.remove(); } catch (_error) {}
    }
    state.chart = null;
    state.series = null;
    state.container = null;
    state.layer = null;
    state.lastCandles = [];
    state.metrics = null;
    state.priceLines.clear();
    state.drag = null;
    state.hoverPoint = null;
    state.positionHitbox = null;
    state.positionLocked = false;
    state.positionKey = null;
    state.initialized = false;
    state.userMovedRange = false;
  }

  function setCallbacks(callbacks = {}) {
    state.callbacks = callbacks;
  }

  function setSymbol(symbol) {
    const normalized = String(symbol || 'EURUSD').toUpperCase();
    if (normalized === state.symbol) return;
    state.symbol = normalized;
    state.chart?.applyOptions(chartOptions(state.symbol));
    state.series?.applyOptions(seriesOptions(state.symbol));
  }

  function setCandles(rawCandles, { fit = false } = {}) {
    if (!state.series) return;
    const candles = (rawCandles || []).map(normalizeCandle).filter(Boolean);
    const previous = state.lastCandles;

    const isSingleAppend = (
      previous.length > 0 &&
      candles.length === previous.length + 1 &&
      previous.every((bar, index) => Number(bar.time) === Number(candles[index]?.time))
    );

    if (isSingleAppend) {
      state.series.update(candles[candles.length - 1]);
    } else {
      let visibleRange = null;
      try { visibleRange = state.chart.timeScale().getVisibleLogicalRange(); } catch (_error) {}
      state.series.setData(candles);
      if (!fit && visibleRange && state.userMovedRange) {
        try { state.chart.timeScale().setVisibleLogicalRange(visibleRange); } catch (_error) {}
      }
    }

    state.lastCandles = candles;

    if (fit || (!previous.length && candles.length)) {
      state.userMovedRange = false;
      try {
        state.chart.timeScale().fitContent();
        state.chart.timeScale().applyOptions({ rightOffset: 22 });
      } catch (_error) {}
    } else if (!state.userMovedRange && isSingleAppend) {
      try { state.chart.timeScale().scrollToRealTime(); } catch (_error) {}
    }

    requestAnimationFrame(positionDragLayer);
  }

  function setPosition({ draft = null, openTrade = null, metrics = null } = {}) {
    const nextPosition = openTrade || draft || null;
    const nextKey = positionIdentity(nextPosition);
    if (nextKey !== state.positionKey) {
      state.positionKey = nextKey;
      state.positionLocked = false;
    }
    state.draft = draft;
    state.openTrade = openTrade;
    state.metrics = metrics;
    try {
      state.chart?.priceScale('right')?.applyOptions?.({ autoScale: true });
    } catch (_error) {}
    rebuildPriceLines();
  }

  function clearPosition() {
    state.draft = null;
    state.openTrade = null;
    state.metrics = null;
    state.positionHitbox = null;
    state.positionLocked = false;
    state.positionKey = null;
    rebuildPriceLines();
  }

  function zoomBy(direction) {
    if (!state.chart) return;
    try {
      const scale = state.chart.timeScale();
      const options = scale.options();
      const current = Number(options?.barSpacing) || 14;
      const next = direction < 0
        ? Math.min(60, current * 1.2)
        : Math.max(2, current / 1.2);
      scale.applyOptions({ barSpacing: next });
    } catch (_error) {}
  }

  function resetView() {
    if (!state.chart) return;
    state.userMovedRange = false;
    try {
      state.chart.priceScale('right').applyOptions({ autoScale: true });
      state.chart.timeScale().fitContent();
      state.chart.timeScale().applyOptions({ rightOffset: 22, barSpacing: 14 });
    } catch (_error) {}
    requestAnimationFrame(positionDragLayer);
  }

  window.ManualReplayLiveChart = {
    init,
    destroy,
    setCallbacks,
    setSymbol,
    setCandles,
    setPosition,
    clearPosition,
    zoomBy,
    resetView,
    resize: resizeChart,
    getState: () => ({
      initialized: state.initialized,
      symbol: state.symbol,
      candles: state.lastCandles.length,
      userMovedRange: state.userMovedRange,
      positionLocked: state.positionLocked,
    }),
  };
})();