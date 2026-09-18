(function () {
  "use strict";

  function timeframeSeconds(value) {
    const normalized = String(value || "5m").toLowerCase();
    if (normalized === "5m") return 300;
    if (normalized === "15m") return 900;
    if (normalized === "1h") return 3600;
    return 300;
  }
  function bucketTime(epochSeconds, timeframe) {
    const size = timeframeSeconds(timeframe);
    return Math.floor(Number(epochSeconds) / size) * size;
  }
  function normalizeEpoch(value) {
    if (typeof value === "string" && value.trim()) {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed / 1000;
    }
    let epoch = Number(value);
    if (!Number.isFinite(epoch)) return null;
    if (epoch > 10_000_000_000) epoch /= 1000;
    return epoch;
  }
  function normalizeTick(payload, symbol) {
    const root = payload && typeof payload === "object" ? payload : {};
    const prices = root.live_prices || root.prices || root;
    const tick = prices?.[symbol] || prices?.[String(symbol).toLowerCase()];
    if (!tick || typeof tick !== "object") return null;
    const bid = Number(tick.bid);
    const ask = Number(tick.ask);
    const mid = Number(tick.mid);
    const price = Number.isFinite(mid) ? mid
      : Number.isFinite(bid) && Number.isFinite(ask) ? (bid + ask) / 2
      : Number.isFinite(bid) ? bid : Number.isFinite(ask) ? ask : null;
    const timestamp = normalizeEpoch(tick.timestamp ?? tick.time ?? tick.updated_at ?? root.live_price_last_update);
    return Number.isFinite(price) && Number.isFinite(timestamp)
      ? { symbol, price, timestamp }
      : null;
  }

  const state = {
    series: null,
    symbol: "EURUSD",
    timeframe: "15m",
    candle: null,
    endpoint: "",
    pollMs: 500,
    timer: null,
    requestInFlight: false,
    lastTickTimestamp: 0,
    lastTickPrice: null,
    running: false,
    libraryHooked: false,
  };

  function schedulePoll(delay = state.pollMs) {
    window.clearTimeout(state.timer);
    if (!state.running) return;
    state.timer = window.setTimeout(pollOnce, Math.max(100, Number(delay) || state.pollMs));
  }
  async function pollOnce() {
    if (!state.running || !state.endpoint) return;
    if (document.hidden || !state.series) {
      schedulePoll(document.hidden ? 1500 : state.pollMs);
      return;
    }
    if (state.requestInFlight) return schedulePoll();
    if (typeof brokerAccountActionInProgress !== "undefined" && brokerAccountActionInProgress) return schedulePoll();
    const generation = typeof accountSelectionGeneration === "undefined" ? 0 : accountSelectionGeneration;
    const isCurrent = () => generation === (typeof accountSelectionGeneration === "undefined" ? 0 : accountSelectionGeneration);
    state.requestInFlight = true;
    try {
      const response = await fetch(state.endpoint, { cache: "no-store", suppressErrorPanel: true });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!isCurrent()) return;
      const staleSymbols = Array.isArray(payload?.live_price_stale_symbols)
        ? payload.live_price_stale_symbols.map((value) => String(value).toUpperCase())
        : [];
      if (!staleSymbols.includes(state.symbol)) {
        const tick = normalizeTick(payload, state.symbol);
        if (tick) api.onTick(tick);
      }
    } catch (error) {
      if (!isCurrent()) return;
      window.dispatchEvent(new CustomEvent("flowsignal:live-candle-error", {
        detail: { message: error?.message || String(error) },
      }));
    } finally {
      state.requestInFlight = false;
      schedulePoll();
    }
  }

  function inferContextFromButton(button) {
    const text = String(button?.textContent || "").trim().toUpperCase();
    if (text === "GOLD" || text === "XAUUSD") return { symbol: "XAUUSD" };
    if (text === "EURUSD") return { symbol: "EURUSD" };
    const timeframe = text.toLowerCase();
    if (["5m", "15m", "1h"].includes(timeframe)) return { timeframe };
    return null;
  }

  function emitContext() {
    window.dispatchEvent(new CustomEvent("flowsignal:chart-context", {
      detail: { symbol: state.symbol, timeframe: state.timeframe },
    }));
  }

  function attachSeries(series) {
    if (!series) return;
    state.series = series;
    state.candle = null;
    state.lastTickTimestamp = 0;
    state.lastTickPrice = null;

    const originalSetData = typeof series.setData === "function" ? series.setData.bind(series) : null;
    if (originalSetData && !series.__flowLiveSetDataWrapped) {
      series.setData = function (candles) {
        const result = originalSetData(candles);
        const last = Array.isArray(candles) ? candles[candles.length - 1] : null;
        if (last) api.seed(last);
        return result;
      };
      series.__flowLiveSetDataWrapped = true;
    }
    window.dispatchEvent(new CustomEvent("flowsignal:chart-candle-series", {
      detail: { candleSeries: series, symbol: state.symbol, timeframe: state.timeframe },
    }));
    emitContext();
    if (state.endpoint && !state.running) api.start();
  }

  function hookChartLibrary() {
    if (state.libraryHooked) return true;
    const library = window.LightweightCharts;
    if (!library || typeof library.createChart !== "function") return false;
    const originalCreateChart = library.createChart.bind(library);
    library.createChart = function (...args) {
      const chart = originalCreateChart(...args);
      if (chart && typeof chart.addCandlestickSeries === "function") {
        const originalAddCandlestickSeries = chart.addCandlestickSeries.bind(chart);
        chart.addCandlestickSeries = function (...seriesArgs) {
          const series = originalAddCandlestickSeries(...seriesArgs);
          attachSeries(series);
          return series;
        };
      }
      return chart;
    };
    state.libraryHooked = true;
    return true;
  }

  const api = {
    mount({ candleSeries, symbol, timeframe } = {}) {
      if (symbol) state.symbol = String(symbol).toUpperCase();
      if (timeframe) state.timeframe = String(timeframe).toLowerCase();
      attachSeries(candleSeries);
      return Boolean(state.series);
    },
    setContext({ symbol, timeframe } = {}) {
      const nextSymbol = symbol ? String(symbol).toUpperCase() : state.symbol;
      const nextTimeframe = timeframe ? String(timeframe).toLowerCase() : state.timeframe;
      if (nextSymbol !== state.symbol || nextTimeframe !== state.timeframe) {
        state.symbol = nextSymbol;
        state.timeframe = nextTimeframe;
        state.candle = null;
        state.lastTickTimestamp = 0;
        state.lastTickPrice = null;
        emitContext();
      }
    },
    seed(candle) {
      if (!candle) return;
      const normalized = {
        time: Number(candle.time), open: Number(candle.open), high: Number(candle.high),
        low: Number(candle.low), close: Number(candle.close),
      };
      if (Object.values(normalized).every(Number.isFinite)) state.candle = normalized;
    },
    start({ endpoint, pollMs } = {}) {
      if (endpoint) state.endpoint = String(endpoint);
      if (Number.isFinite(Number(pollMs))) state.pollMs = Math.max(500, Number(pollMs));
      if (!state.endpoint) return false;
      state.running = true;
      schedulePoll(0);
      return true;
    },
    stop() {
      state.running = false;
      window.clearTimeout(state.timer);
      state.timer = null;
    },
    onTick({ symbol, price, timestamp } = {}) {
      if (!state.series) return null;
      if (symbol && String(symbol).toUpperCase() !== state.symbol) return null;
      const numericPrice = Number(price);
      const epoch = normalizeEpoch(timestamp);
      if (!Number.isFinite(numericPrice) || !Number.isFinite(epoch)) return null;
      if (epoch < state.lastTickTimestamp) return null;
      if (epoch === state.lastTickTimestamp && numericPrice === state.lastTickPrice) return null;
      const time = bucketTime(epoch, state.timeframe);
      let candle = state.candle;
      if (!candle || Number(candle.time) !== time) {
        const previousClose = Number(candle?.close);
        const open = Number.isFinite(previousClose) ? previousClose : numericPrice;
        candle = { time, open, high: Math.max(open, numericPrice), low: Math.min(open, numericPrice), close: numericPrice };
      } else {
        candle = { ...candle, high: Math.max(candle.high, numericPrice), low: Math.min(candle.low, numericPrice), close: numericPrice };
      }
      state.candle = candle;
      state.lastTickTimestamp = epoch;
      state.lastTickPrice = numericPrice;

      // Publish the tick before touching the controller-held series. The main
      // dashboard owns the active chart instance and can recover if this
      // controller reference became stale after a chart recreation.
      window.dispatchEvent(new CustomEvent("flowsignal:live-candle", {
        detail: {
          symbol: state.symbol,
          timeframe: state.timeframe,
          candle: { ...candle },
          price: numericPrice,
          tickTimestamp: epoch,
        },
      }));

      try {
        state.series.update(candle);
      } catch (error) {
        window.dispatchEvent(new CustomEvent("flowsignal:live-candle-series-error", {
          detail: { message: error?.message || String(error) },
        }));
      }
      return { ...candle };
    },
    getState() {
      return { ...state, timer: undefined, series: undefined, candle: state.candle ? { ...state.candle } : null };
    },
  };

  window.FlowSignalLiveCandles = api;
  window.addEventListener("flowsignal:account-changed", () => {
    state.candle = null;
    state.lastTickTimestamp = 0;
    state.lastTickPrice = null;
  });
  function liveTickBackendBase() {
    const hostname = String(window.location.hostname || "");
    if (hostname === "127.0.0.1" || hostname === "localhost") {
      return "http://127.0.0.1:8001";
    }
    const origin = String(window.location.origin || "").replace(/\/$/, "");
    return origin ? `${origin}/api/proxy` : "https://api.nathauxfx.com";
  }

  state.endpoint = `${liveTickBackendBase()}/chart/live-ticks`;

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.(".chart-symbols button, .chart-timeframes button");
    const context = inferContextFromButton(button);
    if (context) api.setContext(context);
  }, true);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.running) schedulePoll(0);
  });

  // Critical: hook synchronously when Lightweight Charts is already available.
  // The previous 25ms-only retry path could lose the chart series if script.js
  // created it before the first timer tick, leaving SMC ON with nothing mounted.
  if (!hookChartLibrary()) {
    let hookAttempts = 0;
    const hookTimer = window.setInterval(() => {
      hookAttempts += 1;
      if (hookChartLibrary() || hookAttempts > 1200) window.clearInterval(hookTimer);
    }, 25);
  }
})();
