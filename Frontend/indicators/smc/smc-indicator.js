(function () {
  "use strict";

  const base = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
    ? "http://127.0.0.1:8001"
    : "https://flowsignal-backend-3.onrender.com";
  const DISPLAY_KEY = "flowsignal_smc_overlay";

  const state = {
    // The indicator display defaults to ON unless the user explicitly turns it off.
    enabled: localStorage.getItem(DISPLAY_KEY) !== "0",
    symbol: "EURUSD",
    timeframe: "5m",
    latest: null,
    mounted: false,
    timer: null,
    requestInFlight: false,
    lastError: null,
    localReady: false,
    localCandleCount: 0,
    pointSize: null,
  };

  function renderer() { return window.FlowSignalSmcRenderer || null; }
  function emit(name, detail) { window.dispatchEvent(new CustomEvent(name, { detail })); }

  function schedule(delay = 15000) {
    window.clearTimeout(state.timer);
    if (!state.enabled) return;
    state.timer = window.setTimeout(loadStructure, delay);
  }

  async function loadStructure() {
    if (!state.enabled || state.requestInFlight) return;
    if (typeof brokerAccountActionInProgress !== "undefined" && brokerAccountActionInProgress) {
      schedule(1000);
      return;
    }
    const generation = typeof accountSelectionGeneration === "undefined" ? 0 : accountSelectionGeneration;
    const symbol = state.symbol;
    const timeframe = state.timeframe;
    const isCurrent = () => generation === (typeof accountSelectionGeneration === "undefined" ? 0 : accountSelectionGeneration)
      && symbol === state.symbol && timeframe === state.timeframe;
    state.requestInFlight = true;
    try {
      const url = new URL(`${base}/chart/smc-structure`);
      url.searchParams.set("symbol", state.symbol);
      url.searchParams.set("timeframe", state.timeframe);
      url.searchParams.set("limit", "250");
      const response = await fetch(url.toString(), { cache: "no-store", suppressErrorPanel: true });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const structure = await response.json();
      if (!isCurrent()) return;
      state.lastError = null;
      api.applyStructure(structure);
    } catch (error) {
      if (!isCurrent()) return;
      state.lastError = error?.message || String(error);
      emit("flowsignal:smc-error", api.getState());
    } finally {
      state.requestInFlight = false;
      schedule();
    }
  }

  function applyLocalCandles(detail) {
    // Chart candles are still counted for diagnostics, but the browser no
    // longer calculates a competing BOS/CHoCH model. The renderer uses the
    // backend SMC engine, which is also the strategy authority.
    const symbol = String(detail?.symbol || state.symbol).toUpperCase();
    const timeframe = String(detail?.timeframe || state.timeframe).toLowerCase();
    if (symbol !== state.symbol || timeframe !== state.timeframe) return false;
    const candles = Array.isArray(detail?.candles) ? detail.candles : [];
    state.localCandleCount = candles.length;
    state.localReady = false;
    return false;
  }

  const api = {
    mount({ chart, candleSeries, symbol, timeframe } = {}) {
      if (symbol) state.symbol = String(symbol).toUpperCase();
      if (timeframe) state.timeframe = String(timeframe).toLowerCase();
      const minMove = Number(candleSeries?.options?.()?.priceFormat?.minMove);
      state.pointSize = Number.isFinite(minMove) && minMove > 0 ? minMove : state.pointSize;
      state.mounted = Boolean(renderer()?.mount({ chart, candleSeries }));
      renderer()?.setEnabled(state.enabled);
      if (state.latest && state.enabled) renderer()?.render(state.latest);
      if (state.enabled) schedule(0);
      return state.mounted;
    },

    setContext({ symbol, timeframe } = {}) {
      const nextSymbol = symbol ? String(symbol).toUpperCase() : state.symbol;
      const nextTimeframe = timeframe ? String(timeframe).toLowerCase() : state.timeframe;
      const changed = nextSymbol !== state.symbol || nextTimeframe !== state.timeframe;
      state.symbol = nextSymbol;
      state.timeframe = nextTimeframe;
      if (changed) {
        state.latest = null;
        state.localReady = false;
        state.localCandleCount = 0;
        renderer()?.clear();
        if (state.enabled) schedule(100);
      }
      emit("flowsignal:smc-context", this.getState());
    },

    setEnabled(enabled) {
      // DISPLAY ONLY. This never sends a setting to the backend and therefore
      // cannot disable server-side SMC BOS/CHoCH analysis or trading logic.
      state.enabled = Boolean(enabled);
      localStorage.setItem(DISPLAY_KEY, state.enabled ? "1" : "0");
      renderer()?.setEnabled(state.enabled);
      if (state.enabled) {
        if (state.latest) renderer()?.render(state.latest);
        window.FlowSignalSmcCandleTap?.wrap?.();
        schedule(0);
      } else {
        window.clearTimeout(state.timer);
        state.timer = null;
        renderer()?.clear?.();
      }
      emit("flowsignal:smc-toggle", this.getState());
    },

    refresh() {
      window.FlowSignalSmcCandleTap?.wrap?.();
      if (state.enabled) schedule(0);
    },

    applyStructure(structure) {
      state.latest = structure || null;
      if (state.enabled) renderer()?.render(state.latest);
      emit("flowsignal:smc-update", { ...this.getState(), structure: state.latest });
    },

    applyLocalCandles,

    clear() {
      state.latest = null;
      state.localReady = false;
      state.localCandleCount = 0;
      renderer()?.clear();
    },

    getState() {
      return {
        enabled: state.enabled,
        symbol: state.symbol,
        timeframe: state.timeframe,
        mounted: state.mounted,
        bias: state.latest?.bias || "NEUTRAL",
        closedCandleCount: state.latest?.closed_candle_count || 0,
        localReady: false,
        localCandleCount: state.localCandleCount,
        source: state.latest?.source || "backend_smc_indicator",
        lastError: state.lastError,
        affectsStrategy: state.timeframe === "15m",
        backendUsesIndicator: true,
        displayOnlyToggle: true,
      };
    },
  };

  window.FlowSignalSMC = api;

  window.addEventListener("flowsignal:account-changed", () => {
    api.clear();
    state.lastError = null;
    schedule(100);
  });

  window.addEventListener("flowsignal:chart-candle-series", (event) => api.mount(event.detail || {}));
  window.addEventListener("flowsignal:chart-context", (event) => api.setContext(event.detail || {}));
  window.addEventListener("flowsignal:chart-candles", (event) => applyLocalCandles(event.detail || {}));
  window.addEventListener("flowsignal:live-candle", (event) => {
    const detail = event.detail || {};
    if (detail.symbol !== state.symbol || detail.timeframe !== state.timeframe) return;
    const candleTime = Number(detail.candle?.time);
    if (!Number.isFinite(candleTime) || !state.enabled) return;
    const lastSeen = Number(state.latest?._visual_live_bucket || 0);
    if (candleTime !== lastSeen) {
      if (state.latest) state.latest._visual_live_bucket = candleTime;
      schedule(250);
    }
  });
})();
