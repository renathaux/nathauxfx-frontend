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
    verticalViewport: {
      scale: 1,
      offsetRatio: 0,
      gesture: null,
    },
    userMovedRange: false,
    drawings: [],
    drawingMode: null,
    drawingScope: 'default',
    selectedDrawingId: null,
    drawingGesture: null,
    drawingUndo: [],
    initialized: false,
    appearance: {
      theme: 'dark',
      background: 'match',
      bull: 'teal',
      grid: true,
    },
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

  function chartTimeDate(time) {
    if (typeof time === 'number' && Number.isFinite(time)) return new Date(time * 1000);
    if (time && typeof time === 'object' && Number.isFinite(Number(time.year))) {
      return new Date(Number(time.year), Number(time.month || 1) - 1, Number(time.day || 1));
    }
    const parsed = new Date(time);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatLocalChartDateTime(time) {
    const date = chartTimeDate(time);
    if (!date) return '';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(date);
  }

  function formatLocalTickMark(time, tickMarkType) {
    const date = chartTimeDate(time);
    if (!date) return '';
    const type = Number(tickMarkType);
    if (type === 3 || type === 4) {
      return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(date);
    }
    return new Intl.DateTimeFormat(undefined, {
      day: '2-digit', month: 'short', year: '2-digit',
    }).format(date);
  }

  function appearancePalette() {
    const lightPage = state.appearance.theme === 'light';
    const backgroundMap = {
      black: '#000000',
      navy: '#071524',
      white: '#ffffff',
    };
    const background = backgroundMap[state.appearance.background] || (lightPage ? '#ffffff' : '#0b0f1a');
    const lightChart = background === '#ffffff';
    const bullMap = { teal: '#26a69a', blue: '#2962ff', white: lightChart ? '#4b5563' : '#f5f7fb' };
    return {
      background,
      text: lightChart ? '#1f2937' : '#9fb0c8',
      grid: state.appearance.grid ? (lightChart ? 'rgba(210,224,241,.48)' : 'rgba(42,51,66,.45)') : 'rgba(0,0,0,0)',
      crosshair: lightChart ? 'rgba(30,41,59,.58)' : 'rgba(180,190,210,.35)',
      label: lightChart ? '#e2e8f0' : '#111827',
      border: lightChart ? '#dce6f3' : '#1f2937',
      bull: bullMap[state.appearance.bull] || bullMap.teal,
      bear: '#ef5350',
    };
  }

  function chartOptions(symbol) {
    const price = precisionFor(symbol);
    const palette = appearancePalette();
    return {
      width: state.container?.clientWidth || 800,
      height: state.container?.clientHeight || 420,
      layout: {
        background: { color: palette.background },
        textColor: palette.text,
        attributionLogo: false,
      },
      localization: {
        timeFormatter: formatLocalChartDateTime,
      },
      priceFormat: {
        type: 'price',
        precision: price.precision,
        minMove: price.minMove,
      },
      grid: {
        vertLines: { color: palette.grid },
        horzLines: { color: palette.grid },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: palette.crosshair,
          width: 1,
          style: 2,
          labelBackgroundColor: palette.label,
        },
        horzLine: {
          color: palette.crosshair,
          width: 1,
          style: 2,
          labelBackgroundColor: palette.label,
        },
      },
      rightPriceScale: {
        borderColor: palette.border,
        autoScale: true,
        scaleMargins: {
          top: 0.08,
          bottom: 0.08,
        },
      },
      // Treat the chart as a movable viewport over a larger world instead of
      // a fixed card. This mirrors the TradingView interaction model:
      // drag to pan, wheel/pinch to zoom, and drag either axis to rescale.
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: false,
        },
        axisDoubleClickReset: {
          time: true,
          price: false,
        },
        mouseWheel: true,
        pinch: true,
      },
      kineticScroll: {
        mouse: true,
        touch: true,
      },
      timeScale: {
        borderColor: palette.border,
        timeVisible: true,
        tickMarkFormatter: formatLocalTickMark,
        secondsVisible: false,
        barSpacing: 14,
        minBarSpacing: 0.5,
        rightOffset: 22,
        fixLeftEdge: false,
        fixRightEdge: false,
        rightBarStaysOnScroll: false,
        lockVisibleTimeRangeOnResize: false,
      },
    };
  }

  // Long/Short is a drawing overlay, like TradingView. It must never expand
  // the price scale by itself; candle prices remain the authority for autoscale.
  function visibleCandlePriceRange() {
    if (!state.chart || !state.lastCandles.length) return null;

    let logicalRange = null;
    try {
      logicalRange = state.chart.timeScale().getVisibleLogicalRange();
    } catch (_error) {}
    if (!logicalRange) return null;

    const first = Math.max(0, Math.floor(Number(logicalRange.from)));
    const last = Math.min(
      state.lastCandles.length - 1,
      Math.ceil(Number(logicalRange.to)),
    );
    if (!Number.isFinite(first) || !Number.isFinite(last) || first > last) return null;

    let low = Infinity;
    let high = -Infinity;
    for (let index = first; index <= last; index += 1) {
      const candle = state.lastCandles[index];
      if (!candle) continue;
      const candleLow = Number(candle.low);
      const candleHigh = Number(candle.high);
      if (Number.isFinite(candleLow)) low = Math.min(low, candleLow);
      if (Number.isFinite(candleHigh)) high = Math.max(high, candleHigh);
    }

    if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) return null;
    return { low, high };
  }

  function transformedCandleAutoscale(originalProvider) {
    const original = typeof originalProvider === 'function' ? originalProvider() : null;
    const visible = visibleCandlePriceRange();

    // TradingView-like behavior: price scale follows ONLY candles currently
    // visible in the viewport. Hidden/off-screen candles must not flatten the
    // current structure.
    let baseMin = Number(visible?.low);
    let baseMax = Number(visible?.high);

    if (!Number.isFinite(baseMin) || !Number.isFinite(baseMax) || baseMax <= baseMin) {
      baseMin = Number(original?.priceRange?.minValue);
      baseMax = Number(original?.priceRange?.maxValue);
    }
    if (!Number.isFinite(baseMin) || !Number.isFinite(baseMax) || baseMax <= baseMin) {
      return original;
    }

    const rawSpan = baseMax - baseMin;
    const minimumSpan = Math.abs((baseMax + baseMin) / 2 || 1) * 0.00015;
    const baseSpan = Math.max(rawSpan, minimumSpan);
    const padding = baseSpan * 0.08;
    const paddedMin = baseMin - padding;
    const paddedMax = baseMax + padding;
    const paddedSpan = paddedMax - paddedMin;

    const scale = Math.min(30, Math.max(0.15, Number(state.verticalViewport.scale) || 1));
    const offsetRatio = Number(state.verticalViewport.offsetRatio) || 0;
    const span = paddedSpan * scale;
    const center = (paddedMin + paddedMax) / 2 + offsetRatio * paddedSpan;

    return {
      ...(original || {}),
      priceRange: {
        minValue: center - span / 2,
        maxValue: center + span / 2,
      },
    };
  }

  function refreshVerticalViewport() {
    if (!state.series || !state.chart) return;
    try {
      state.series.applyOptions({
        autoscaleInfoProvider: (originalProvider) => transformedCandleAutoscale(originalProvider),
      });
      state.chart.priceScale('right').applyOptions({ autoScale: true });
    } catch (_error) {}
    requestAnimationFrame(positionDragLayer);
  }

  function resetVerticalViewport() {
    state.verticalViewport.scale = 1;
    state.verticalViewport.offsetRatio = 0;
    state.verticalViewport.gesture = null;
    refreshVerticalViewport();
  }

  function applyManagedZoom(factor) {
    if (!state.chart || !Number.isFinite(Number(factor)) || Number(factor) <= 0) return;
    const zoomFactor = Number(factor);

    // TradingView-style zoom changes how many candles are visible horizontally.
    // The vertical axis then AUTO-FITS the visible candles instead of blindly
    // multiplying the price range. That keeps candles readable even at deep
    // zoom-out and prevents absurd ranges like 0.90 -> 1.45 on EURUSD.
    try {
      const timeScale = state.chart.timeScale();
      const options = timeScale.options();
      const currentSpacing = Number(options?.barSpacing) || 14;
      const nextSpacing = Math.min(60, Math.max(0.5, currentSpacing / zoomFactor));
      timeScale.applyOptions({ barSpacing: nextSpacing });
    } catch (_error) {}

    state.verticalViewport.scale = 1;
    state.verticalViewport.offsetRatio = 0;
    refreshVerticalViewport();
  }

  function priceAxisStartX() {
    if (!state.container) return Infinity;
    let width = 72;
    try {
      width = Number(state.chart?.priceScale('right')?.width?.()) || width;
    } catch (_error) {}
    return Math.max(0, state.container.clientWidth - width);
  }

  function seriesOptions(symbol) {
    const price = precisionFor(symbol);
    const palette = appearancePalette();
    return {
      upColor: palette.bull,
      borderUpColor: palette.bull,
      wickUpColor: palette.bull,
      downColor: palette.bear,
      borderDownColor: palette.bear,
      wickDownColor: palette.bear,
      priceLineVisible: false,
      lastValueVisible: true,
      autoscaleInfoProvider: (originalProvider) => transformedCandleAutoscale(originalProvider),
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



  const DRAWING_STORAGE_PREFIX = 'nathauxfx_manual_replay_drawings_v1:';
  const MAX_DRAWING_UNDO = 50;

  function currentReplayPrice() {
    const candle = state.lastCandles[state.lastCandles.length - 1];
    return Number.isFinite(Number(candle?.close)) ? Number(candle.close) : null;
  }

  function pipSizeForSymbol() {
    return String(state.symbol || '').toUpperCase() === 'XAUUSD' ? 0.01 : 0.0001;
  }

  function liveTradeSnapshot() {
    const trade = state.openTrade;
    const market = currentReplayPrice();
    if (!trade || !Number.isFinite(market)) return null;
    const riskDistance = Number(trade.initialRiskDistance) > 0
      ? Number(trade.initialRiskDistance)
      : Math.abs(Number(trade.entry) - Number(trade.initialSl ?? trade.sl));
    if (!Number.isFinite(riskDistance) || riskDistance <= 0) return null;
    const sign = trade.side === 'SELL' ? -1 : 1;
    const move = sign * (market - Number(trade.entry));
    const r = move / riskDistance;
    const pnl = r * Number(trade.riskDollars || 0);
    const pips = move / pipSizeForSymbol();
    return { market, r, pnl, pips };
  }

  function ensureTradeHologram() {
    if (!state.layer) return null;
    let node = state.layer.querySelector('.manual-replay-trade-hologram');
    if (!node) {
      node = document.createElement('div');
      node.className = 'manual-replay-trade-hologram';
      node.innerHTML = '<strong></strong><span class="pips"></span><span class="r"></span>';
      state.layer.appendChild(node);
    }
    return node;
  }

  function signedMoney(value) {
    if (!Number.isFinite(Number(value))) return '—';
    const n = Number(value);
    return (n >= 0 ? '+' : '-') + String.fromCharCode(36) + Math.abs(n).toFixed(2);
  }

  function signedNumber(value, digits, suffix) {
    if (!Number.isFinite(Number(value))) return '—';
    const n = Number(value);
    return (n >= 0 ? '+' : '') + n.toFixed(digits) + suffix;
  }

  function updateTradeHologram() {
    if (!state.layer || !state.container) return;
    const node = ensureTradeHologram();
    const snapshot = liveTradeSnapshot();
    if (!snapshot) {
      node?.classList.add('hidden');
      return;
    }

    node.classList.remove('hidden', 'positive', 'negative', 'flat');
    node.classList.add(snapshot.pnl > 0.005 ? 'positive' : snapshot.pnl < -0.005 ? 'negative' : 'flat');
    node.querySelector('strong').textContent = signedMoney(snapshot.pnl);
    node.querySelector('.pips').textContent = signedNumber(snapshot.pips, 1, ' pips');
    node.querySelector('.r').textContent = signedNumber(snapshot.r, 2, 'R');

    const y = priceToY(snapshot.market);
    const width = state.container.clientWidth || 800;
    const height = state.container.clientHeight || 460;
    const left = Math.max(16, Math.min(width - 190, priceAxisStartX() - 185));
    const top = Number.isFinite(y)
      ? Math.max(18, Math.min(height - 74, y - 32))
      : 18;
    node.style.left = Math.round(left) + 'px';
    node.style.top = Math.round(top) + 'px';
  }

  function drawingStorageKey() {
    return DRAWING_STORAGE_PREFIX + encodeURIComponent(String(state.drawingScope || 'default'));
  }

  function cloneDrawings(value = state.drawings) {
    return JSON.parse(JSON.stringify(value || []));
  }

  function loadDrawings() {
    try {
      const raw = window.localStorage?.getItem(drawingStorageKey());
      const parsed = raw ? JSON.parse(raw) : [];
      state.drawings = Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      state.drawings = [];
    }
    state.selectedDrawingId = null;
    state.drawingUndo = [];
  }

  function saveDrawings() {
    try {
      window.localStorage?.setItem(drawingStorageKey(), JSON.stringify(state.drawings));
    } catch (_error) {}
  }

  function pushDrawingUndo() {
    state.drawingUndo.push(cloneDrawings());
    if (state.drawingUndo.length > MAX_DRAWING_UNDO) state.drawingUndo.shift();
  }

  function undoDrawingEdit() {
    const previous = state.drawingUndo.pop();
    if (!previous) return false;
    state.drawings = previous;
    if (!state.drawings.some((item) => item.id === state.selectedDrawingId)) {
      state.selectedDrawingId = null;
    }
    saveDrawings();
    renderDrawings();
    return true;
  }

  function drawingById(id) {
    return state.drawings.find((item) => item.id === id) || null;
  }

  function drawingPointFromEvent(event) {
    if (!state.chart || !state.container) return null;
    const rect = state.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x >= priceAxisStartX() || y > rect.height) return null;
    let logical = null;
    try { logical = state.chart.timeScale().coordinateToLogical(x); } catch (_error) {}
    const price = yToPrice(y);
    if (!Number.isFinite(Number(logical)) || !Number.isFinite(Number(price))) return null;
    return { logical: Number(logical), price: Number(price), x, y };
  }

  function logicalToX(logical) {
    if (!state.chart || !Number.isFinite(Number(logical))) return null;
    try {
      const value = state.chart.timeScale().logicalToCoordinate(Number(logical));
      return Number.isFinite(Number(value)) ? Number(value) : null;
    } catch (_error) {
      return null;
    }
  }

  function normalizedRect(drawing) {
    const left = Math.min(Number(drawing.a.logical), Number(drawing.b.logical));
    const right = Math.max(Number(drawing.a.logical), Number(drawing.b.logical));
    const high = Math.max(Number(drawing.a.price), Number(drawing.b.price));
    const low = Math.min(Number(drawing.a.price), Number(drawing.b.price));
    return { left, right, high, low };
  }

  function ensureDrawingSvg() {
    if (!state.layer) return null;
    let svg = state.layer.querySelector('.manual-replay-drawing-layer');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'manual-replay-drawing-layer');
      svg.setAttribute('aria-label', 'Manual chart drawings');
      state.layer.prepend(svg);
    }
    const width = state.container?.clientWidth || 800;
    const height = state.container?.clientHeight || 460;
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    return svg;
  }

  function circleHandle(id, handle, x, y) {
    if (![x, y].every((value) => Number.isFinite(Number(value)))) return '';
    return '<circle class="manual-drawing-handle" data-replay-drawing="1" data-drawing-id="' +
      id + '" data-drawing-handle="' + handle + '" cx="' + x + '" cy="' + y + '" r="6"></circle>';
  }

  function renderLineDrawing(drawing, selected) {
    const x1 = logicalToX(drawing.a.logical);
    const y1 = priceToY(drawing.a.price);
    const x2 = logicalToX(drawing.b.logical);
    const y2 = priceToY(drawing.b.price);
    if (![x1, y1, x2, y2].every((value) => Number.isFinite(Number(value)))) return '';
    const selectedClass = selected ? ' selected' : '';
    let html = '<g class="manual-drawing line' + selectedClass + '" data-drawing-group="' + drawing.id + '">' +
      '<line class="manual-drawing-hit" data-replay-drawing="1" data-drawing-body="1" data-drawing-id="' + drawing.id +
      '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"></line>' +
      '<line class="manual-drawing-line" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"></line>';
    if (selected) {
      html += circleHandle(drawing.id, 'a', x1, y1);
      html += circleHandle(drawing.id, 'b', x2, y2);
    }
    return html + '</g>';
  }

  function rectHandlePoints(x1, y1, x2, y2) {
    const left = Math.min(x1, x2);
    const right = Math.max(x1, x2);
    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;
    return {
      nw: [left, top], n: [midX, top], ne: [right, top],
      e: [right, midY], se: [right, bottom], s: [midX, bottom],
      sw: [left, bottom], w: [left, midY],
    };
  }

  function renderRectDrawing(drawing, selected) {
    const rect = normalizedRect(drawing);
    const x1 = logicalToX(rect.left);
    const x2 = logicalToX(rect.right);
    const y1 = priceToY(rect.high);
    const y2 = priceToY(rect.low);
    if (![x1, y1, x2, y2].every((value) => Number.isFinite(Number(value)))) return '';
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.max(1, Math.abs(x2 - x1));
    const height = Math.max(1, Math.abs(y2 - y1));
    const selectedClass = selected ? ' selected' : '';
    let html = '<g class="manual-drawing rect' + selectedClass + '" data-drawing-group="' + drawing.id + '">' +
      '<rect class="manual-drawing-rect" data-replay-drawing="1" data-drawing-body="1" data-drawing-id="' + drawing.id +
      '" x="' + left + '" y="' + top + '" width="' + width + '" height="' + height + '"></rect>';
    if (selected) {
      const points = rectHandlePoints(x1, y1, x2, y2);
      for (const handle of ['nw','n','ne','e','se','s','sw','w']) {
        html += circleHandle(drawing.id, handle, points[handle][0], points[handle][1]);
      }
    }
    return html + '</g>';
  }

  function renderDrawings() {
    if (!state.layer || !state.container) return;
    const svg = ensureDrawingSvg();
    if (!svg) return;
    svg.innerHTML = state.drawings.map((drawing) => {
      const selected = drawing.id === state.selectedDrawingId;
      return drawing.type === 'rect'
        ? renderRectDrawing(drawing, selected)
        : renderLineDrawing(drawing, selected);
    }).join('');
  }

  function setDrawingMode(mode) {
    const normalized = ['line', 'rect'].includes(mode) ? mode : null;
    state.drawingMode = normalized;
    state.drawingGesture = null;
    state.callbacks.onDrawingModeChange?.(normalized);
    renderDrawings();
  }

  function setDrawingScope(scope) {
    const normalized = String(scope || 'default');
    if (normalized === state.drawingScope) return;
    state.drawingScope = normalized;
    loadDrawings();
    renderDrawings();
  }

  function finishDrawingGesture() {
    const gesture = state.drawingGesture;
    if (!gesture) return;
    const drawing = drawingById(gesture.id);
    if (drawing?.type === 'rect') {
      const rect = normalizedRect(drawing);
      drawing.a = { logical: rect.left, price: rect.high };
      drawing.b = { logical: rect.right, price: rect.low };
    }
    state.drawingGesture = null;
    saveDrawings();
    if (gesture.type === 'create') setDrawingMode(null);
    renderDrawings();
  }

  function applyRectangleHandle(drawing, handle, point) {
    const rect = normalizedRect(drawing);
    let left = rect.left;
    let right = rect.right;
    let high = rect.high;
    let low = rect.low;
    if (handle.includes('w')) left = point.logical;
    if (handle.includes('e')) right = point.logical;
    if (handle.includes('n')) high = point.price;
    if (handle.includes('s')) low = point.price;
    if (left > right) [left, right] = [right, left];
    if (low > high) [low, high] = [high, low];
    drawing.a = { logical: left, price: high };
    drawing.b = { logical: right, price: low };
  }

  function updateDrawingGesture(event) {
    const gesture = state.drawingGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return false;
    const drawing = drawingById(gesture.id);
    const point = drawingPointFromEvent(event);
    if (!drawing || !point) return false;

    if (gesture.type === 'create') {
      drawing.b = { logical: point.logical, price: point.price };
    } else if (gesture.type === 'move') {
      const logicalDelta = point.logical - gesture.start.logical;
      const priceDelta = point.price - gesture.start.price;
      drawing.a = {
        logical: gesture.original.a.logical + logicalDelta,
        price: gesture.original.a.price + priceDelta,
      };
      drawing.b = {
        logical: gesture.original.b.logical + logicalDelta,
        price: gesture.original.b.price + priceDelta,
      };
    } else if (gesture.type === 'resize') {
      if (drawing.type === 'line') {
        drawing[gesture.handle] = { logical: point.logical, price: point.price };
      } else {
        applyRectangleHandle(drawing, gesture.handle, point);
      }
    }

    renderDrawings();
    event.preventDefault();
    event.stopImmediatePropagation?.();
    return true;
  }

  function beginDrawingGesture(event) {
    if (event.button !== 0) return false;
    if (event.target.closest?.('[data-replay-chart-toolbar]')) return false;
    const handle = event.target.closest?.('[data-drawing-handle]');
    const body = event.target.closest?.('[data-drawing-body]');
    const point = drawingPointFromEvent(event);

    if (handle) {
      const id = handle.getAttribute('data-drawing-id');
      const drawing = drawingById(id);
      if (!drawing || !point) return false;
      pushDrawingUndo();
      state.selectedDrawingId = id;
      state.drawingGesture = {
        type: 'resize',
        id,
        handle: handle.getAttribute('data-drawing-handle'),
        pointerId: event.pointerId,
      };
    } else if (body) {
      const id = body.getAttribute('data-drawing-id');
      const drawing = drawingById(id);
      if (!drawing || !point) return false;
      pushDrawingUndo();
      state.selectedDrawingId = id;
      state.drawingGesture = {
        type: 'move',
        id,
        pointerId: event.pointerId,
        start: { logical: point.logical, price: point.price },
        original: cloneDrawings([drawing])[0],
      };
    } else if (state.drawingMode && point) {
      pushDrawingUndo();
      const id = 'drawing_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      state.drawings.push({
        id,
        type: state.drawingMode,
        a: { logical: point.logical, price: point.price },
        b: { logical: point.logical, price: point.price },
      });
      state.selectedDrawingId = id;
      state.drawingGesture = { type: 'create', id, pointerId: event.pointerId };
    } else {
      if (state.selectedDrawingId) {
        state.selectedDrawingId = null;
        renderDrawings();
      }
      return false;
    }

    try { state.interactionHost?.setPointerCapture?.(event.pointerId); } catch (_error) {}
    renderDrawings();
    event.preventDefault();
    event.stopImmediatePropagation?.();
    return true;
  }

  function deleteSelectedDrawing() {
    if (!state.selectedDrawingId) return false;
    const index = state.drawings.findIndex((item) => item.id === state.selectedDrawingId);
    if (index < 0) return false;
    pushDrawingUndo();
    state.drawings.splice(index, 1);
    state.selectedDrawingId = null;
    saveDrawings();
    renderDrawings();
    return true;
  }

  function clearPositionDom() {
    if (!state.layer) return;
    state.positionHitbox = null;
    state.layer.querySelector('.manual-replay-position-tool')?.remove();
    state.layer.querySelectorAll('[data-replay-price-field]').forEach((node) => node.remove());
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
    renderDrawings();
    updateTradeHologram();
    const position = currentPosition();
    if (!position) {
      clearPositionDom();
      return;
    }

    const entryY = priceToY(position.entry);
    const slY = priceToY(position.sl);
    const tpY = priceToY(position.tp);
    const anchorX = positionAnchorX(position);
    if (![entryY, slY, tpY, anchorX].every((value) => Number.isFinite(Number(value)))) {
      clearPositionDom();
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
      height: state.container.clientHeight || 420,
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
        // Recompute price scale from the candles in the NEW visible window.
        // This is what keeps a 15-18 Sep view readable like TradingView.
        refreshVerticalViewport();
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

    const onVerticalPointerDown = (event) => {
      if (event.button !== 0) return;
      if (state.drawingMode || state.drawingGesture) return;
      if (event.target.closest?.('[data-replay-chart-toolbar]')) return;
      if (event.target.closest?.('[data-replay-price-field], [data-replay-drawing]')) return;
      const rect = state.container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (y < 0 || y > rect.height) return;

      const axisStart = priceAxisStartX();
      const isPriceAxis = x >= axisStart;
      state.verticalViewport.gesture = {
        pointerId: event.pointerId,
        type: isPriceAxis ? 'scale' : 'pan',
        startY: event.clientY,
        startScale: state.verticalViewport.scale,
        startOffsetRatio: state.verticalViewport.offsetRatio,
        height: Math.max(1, rect.height),
        active: false,
      };

      if (isPriceAxis) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onDrawingPointerMove = (event) => {
      updateDrawingGesture(event);
    };

    const onDrawingPointerEnd = (event) => {
      const gesture = state.drawingGesture;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      try { state.interactionHost?.releasePointerCapture?.(event.pointerId); } catch (_error) {}
      finishDrawingGesture();
      event.preventDefault();
      event.stopImmediatePropagation?.();
    };

    const onVerticalPointerMove = (event) => {
      const gesture = state.verticalViewport.gesture;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const dy = event.clientY - gesture.startY;
      if (!gesture.active && Math.abs(dy) < 3) return;
      gesture.active = true;

      if (gesture.type === 'scale') {
        state.verticalViewport.scale = Math.min(
          30,
          Math.max(0.15, gesture.startScale * Math.exp(dy / 180)),
        );
        event.preventDefault();
        event.stopPropagation();
      } else {
        // Dragging down moves the candle world down, exposing higher prices
        // above; dragging up exposes lower prices below.
        state.verticalViewport.offsetRatio =
          gesture.startOffsetRatio + (dy / gesture.height) * gesture.startScale;
      }

      refreshVerticalViewport();
    };

    const onVerticalPointerEnd = (event) => {
      const gesture = state.verticalViewport.gesture;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      state.verticalViewport.gesture = null;
    };

    const onVerticalWheel = (event) => {
      const deltaY = Number(event.deltaY || 0);
      const deltaX = Number(event.deltaX || 0);

      // A vertical two-finger trackpad gesture behaves like TradingView zoom:
      // swipe up -> zoom out / create free space,
      // swipe down -> zoom in / bring everything closer.
      // Horizontal two-finger movement is left alone for chart panning.
      if (!deltaY || Math.abs(deltaX) > Math.abs(deltaY)) return;

      const factor = Math.exp(deltaY / 650);
      applyManagedZoom(factor);
      event.preventDefault();
      event.stopPropagation();
    };

    const onDoubleClick = (event) => {
      const rect = state.container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x >= priceAxisStartX()) {
        event.preventDefault();
        event.stopPropagation();
        resetVerticalViewport();
        return;
      }

      if (!currentPosition() || !positionRegionAtPoint(x, y)) return;
      if (state.clickTimer) {
        window.clearTimeout(state.clickTimer);
        state.clickTimer = null;
      }
      event.preventDefault();
      event.stopPropagation();
      togglePositionLocked('double-click');
    };
    const onKeyDown = (event) => {
      const tag = String(document.activeElement?.tagName || '').toUpperCase();
      const typing = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag) || document.activeElement?.isContentEditable;

      if (!typing && (event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 'z') {
        if (undoDrawingEdit()) {
          event.preventDefault();
          return;
        }
      }

      if (!typing && (event.key === 'Delete' || event.key === 'Backspace')) {
        if (deleteSelectedDrawing()) {
          event.preventDefault();
          return;
        }
      }

      if (event.key === 'Escape') {
        if (state.drawingMode || state.selectedDrawingId) {
          state.drawingMode = null;
          state.drawingGesture = null;
          state.selectedDrawingId = null;
          state.callbacks.onDrawingModeChange?.(null);
          renderDrawings();
          event.preventDefault();
          return;
        }
      }

      // Space belongs to Manual Replay playback (stop). Position locking stays
      // available by double-clicking the position box, so playback shortcuts
      // never change a trade drawing by accident.
    };
    interactionHost.addEventListener('pointerdown', beginDrawingGesture, true);
    interactionHost.addEventListener('pointerdown', onVerticalPointerDown, true);
    window.addEventListener('pointermove', onDrawingPointerMove, true);
    window.addEventListener('pointerup', onDrawingPointerEnd, true);
    window.addEventListener('pointercancel', onDrawingPointerEnd, true);
    window.addEventListener('pointermove', onVerticalPointerMove, true);
    window.addEventListener('pointerup', onVerticalPointerEnd, true);
    window.addEventListener('pointercancel', onVerticalPointerEnd, true);
    interactionHost.addEventListener('wheel', onVerticalWheel, { capture: true, passive: false });
    interactionHost.addEventListener('dblclick', onDoubleClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    state.interactionHost = interactionHost;
    state.interactionHandlers = {
      beginDrawingGesture,
      onDrawingPointerMove,
      onDrawingPointerEnd,
      onVerticalPointerDown,
      onVerticalPointerMove,
      onVerticalPointerEnd,
      onVerticalWheel,
      onDoubleClick,
      onKeyDown,
    };

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
    if (state.interactionHost && state.interactionHandlers) {
      state.interactionHost.removeEventListener('pointerdown', state.interactionHandlers.beginDrawingGesture, true);
      state.interactionHost.removeEventListener('pointerdown', state.interactionHandlers.onVerticalPointerDown, true);
      state.interactionHost.removeEventListener('wheel', state.interactionHandlers.onVerticalWheel, true);
      state.interactionHost.removeEventListener('dblclick', state.interactionHandlers.onDoubleClick, true);
    }
    if (state.interactionHandlers) {
      window.removeEventListener('pointermove', state.interactionHandlers.onDrawingPointerMove, true);
      window.removeEventListener('pointerup', state.interactionHandlers.onDrawingPointerEnd, true);
      window.removeEventListener('pointercancel', state.interactionHandlers.onDrawingPointerEnd, true);
      window.removeEventListener('pointermove', state.interactionHandlers.onVerticalPointerMove, true);
      window.removeEventListener('pointerup', state.interactionHandlers.onVerticalPointerEnd, true);
      window.removeEventListener('pointercancel', state.interactionHandlers.onVerticalPointerEnd, true);
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
    state.drawings = [];
    state.drawingMode = null;
    state.drawingScope = 'default';
    state.selectedDrawingId = null;
    state.drawingGesture = null;
    state.drawingUndo = [];
    state.verticalViewport.scale = 1;
    state.verticalViewport.offsetRatio = 0;
    state.verticalViewport.gesture = null;
    state.initialized = false;
    state.userMovedRange = false;
  }

  function setCallbacks(callbacks = {}) {
    state.callbacks = callbacks;
  }

  function setAppearance(next = {}) {
    state.appearance = { ...state.appearance, ...(next || {}) };
    state.chart?.applyOptions(chartOptions(state.symbol));
    state.series?.applyOptions(seriesOptions(state.symbol));
    if (state.container) state.container.style.background = appearancePalette().background;
    requestAnimationFrame(positionDragLayer);
  }

  function setSymbol(symbol) {
    const normalized = String(symbol || 'EURUSD').toUpperCase();
    if (normalized === state.symbol) return;
    state.symbol = normalized;
    state.chart?.applyOptions(chartOptions(state.symbol));
    state.series?.applyOptions(seriesOptions(state.symbol));
  }

  function setCandles(rawCandles, { fit = false, focusBars = 220 } = {}) {
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
      state.verticalViewport.scale = 1;
      state.verticalViewport.offsetRatio = 0;
      try {
        const visibleBars = Math.max(40, Math.round(Number(focusBars) || 220));
        if (candles.length > visibleBars) {
          const rightPaddingBars = 18;
          state.chart.timeScale().setVisibleLogicalRange({
            from: Math.max(0, candles.length - visibleBars),
            to: candles.length - 1 + rightPaddingBars,
          });
        } else {
          state.chart.timeScale().fitContent();
          state.chart.timeScale().applyOptions({ rightOffset: 22 });
        }
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
    // Do not reset the price scale when SL/TP changes. TradingView drawing
    // tools move independently from the candle scale and preserve manual zoom.
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
    // Existing buttons use -1 for Zoom In and +1 for Zoom Out.
    // Make them control BOTH axes so Zoom Out creates real top/bottom space.
    applyManagedZoom(direction < 0 ? (1 / 1.2) : 1.2);
  }

  function resetView() {
    if (!state.chart) return;
    state.userMovedRange = false;
    state.verticalViewport.scale = 1;
    state.verticalViewport.offsetRatio = 0;
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
    setAppearance,
    setSymbol,
    setCandles,
    setPosition,
    clearPosition,
    setDrawingMode,
    setDrawingScope,
    deleteSelectedDrawing,
    undoDrawingEdit,
    zoomBy,
    resetView,
    resize: resizeChart,
    getState: () => ({
      initialized: state.initialized,
      symbol: state.symbol,
      candles: state.lastCandles.length,
      userMovedRange: state.userMovedRange,
      positionLocked: state.positionLocked,
      verticalScale: state.verticalViewport.scale,
      verticalOffsetRatio: state.verticalViewport.offsetRatio,
      drawingMode: state.drawingMode,
      drawings: state.drawings.length,
      selectedDrawingId: state.selectedDrawingId,
    }),
  };
})();
