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
    callbacks: {},
    priceLines: new Map(),
    resizeObserver: null,
    drag: null,
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
        rightOffset: 10,
        lockVisibleTimeRangeOnResize: true,
      },
    };
  }

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

  function rebuildPriceLines() {
    clearPriceLines();
    const position = currentPosition();
    if (!position) {
      positionDragLayer();
      return;
    }

    createPriceLine('entry', position.entry, {
      color: '#77adff',
      title: state.openTrade ? `${position.side} ENTRY` : 'ENTRY',
      lineStyle: 2,
    });
    createPriceLine('sl', position.sl, {
      color: '#ff687a',
      title: 'SL',
      lineStyle: 2,
    });
    createPriceLine('tp', position.tp, {
      color: '#35d5a2',
      title: 'TP',
      lineStyle: 2,
    });

    positionDragLayer();
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
        if (state.openTrade || !state.draft) return;
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
    if (!state.layer) return;
    const position = currentPosition();
    if (!position) {
      state.layer.replaceChildren();
      return;
    }

    const entry = ensureDragLine('entry', 'ENTRY', 'entry');
    const sl = ensureDragLine('sl', 'SL', 'sl');
    const tp = ensureDragLine('tp', 'TP', 'tp');

    const lineStates = [
      [entry, position.entry, state.openTrade || !state.draft],
      [sl, position.sl, Boolean(state.openTrade)],
      [tp, position.tp, Boolean(state.openTrade)],
    ];

    for (const [node, price, locked] of lineStates) {
      if (!node) continue;
      const y = priceToY(price);
      node.classList.toggle('hidden', y == null);
      if (y == null) continue;
      node.style.transform = `translateY(${Math.round(y)}px)`;
      node.classList.toggle('locked', Boolean(locked));
      node.querySelector('span').textContent = `${node.dataset.replayPriceField.toUpperCase()} ${formatPrice(price)}`;
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
        state.callbacks.onHoverPrice?.(null);
        return;
      }
      state.callbacks.onHoverPrice?.(yToPrice(param.point.y));
    });

    state.chart.subscribeClick((param) => {
      if (!param?.point) return;
      const price = yToPrice(param.point.y);
      if (Number.isFinite(price)) state.callbacks.onChartClick?.(price);
    });

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
    if (state.chart) {
      try { state.chart.remove(); } catch (_error) {}
    }
    state.chart = null;
    state.series = null;
    state.container = null;
    state.layer = null;
    state.lastCandles = [];
    state.priceLines.clear();
    state.drag = null;
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
        state.chart.timeScale().applyOptions({ rightOffset: 10 });
      } catch (_error) {}
    } else if (!state.userMovedRange && isSingleAppend) {
      try { state.chart.timeScale().scrollToRealTime(); } catch (_error) {}
    }

    requestAnimationFrame(positionDragLayer);
  }

  function setPosition({ draft = null, openTrade = null } = {}) {
    state.draft = draft;
    state.openTrade = openTrade;
    rebuildPriceLines();
  }

  function clearPosition() {
    state.draft = null;
    state.openTrade = null;
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
      state.chart.timeScale().applyOptions({ rightOffset: 10, barSpacing: 14 });
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
    }),
  };
})();