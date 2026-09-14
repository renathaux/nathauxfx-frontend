(function () {
  const PAPER_HISTORY_KEY = "paper_trade_history";
  const PAPER_STATS_KEY = "paper_trade_stats";
  const MONTH_KEY = "paper_history_month_key";
  const LEGACY_WEEKLY_RESET_KEY = "paper_reset_time";
  const TIME_ZONE = "America/New_York";
  const TORONTO_TIME_ZONE = "America/Toronto";
  const OPEN_RESULTS = new Set(["RUNNING", "TP1 HIT"]);
  const OPEN_STATUSES = new Set(["OPEN", "RUNNING", "CLOSING"]);
  const V3B_REFRESH_MS = 10000;
  const BACKEND_URL = "https://flowsignal-backend-3.onrender.com";

  function newYorkMonthKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit"
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    return year && month ? `${year}-${month}` : null;
  }

  function tradeDate(trade) {
    for (const key of ["closed_at", "opened_at", "time", "timestamp"]) {
      const raw = trade?.[key];
      if (raw == null || raw === "") continue;
      if (typeof raw === "number" || /^\d+(?:\.\d+)?$/.test(String(raw))) {
        let number = Number(raw);
        if (!Number.isFinite(number)) continue;
        if (number < 1e11) number *= 1000;
        const parsed = new Date(number);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  }

  function isOpenTrade(trade) {
    const result = String(trade?.result || "").toUpperCase();
    const status = String(trade?.status || "").toUpperCase();
    return OPEN_RESULTS.has(result) || OPEN_STATUSES.has(status);
  }

  function filterPaperHistoryToCurrentMonth(history, now = new Date()) {
    const currentMonth = newYorkMonthKey(now);
    return (Array.isArray(history) ? history : []).filter((trade) => {
      if (!trade || typeof trade !== "object") return false;
      if (isOpenTrade(trade)) return true;
      const date = tradeDate(trade);
      // Preserve undated legacy rows rather than destructively guessing.
      if (!date) return true;
      return newYorkMonthKey(date) === currentMonth;
    });
  }

  function numberValue(trade) {
    for (const key of ["profit", "pnl", "pl", "total_pl", "total_pnl"]) {
      const value = Number(trade?.[key]);
      if (Number.isFinite(value)) return value;
    }
    return 0;
  }

  function buildPaperMonthStats(history, previousStats) {
    let wins = 0;
    let losses = 0;
    let running = 0;
    let totalPl = 0;
    for (const trade of history) {
      if (isOpenTrade(trade)) {
        running += 1;
        continue;
      }
      const result = String(trade?.result || trade?.status || "").toUpperCase();
      const pnl = numberValue(trade);
      totalPl += pnl;
      if (["WIN", "WON", "PROFIT", "TP2 HIT"].includes(result) || pnl > 0) wins += 1;
      else if (["LOSS", "LOST", "SL HIT"].includes(result) || pnl < 0) losses += 1;
    }
    const decided = wins + losses;
    return {
      ...(previousStats && typeof previousStats === "object" ? previousStats : {}),
      strategy_identity: "PAPER — V1",
      history_window: "calendar_month",
      wins,
      losses,
      running,
      total: wins + losses + running,
      total_pl: Math.round(totalPl * 100) / 100,
      total_pnl: Math.round(totalPl * 100) / 100,
      win_rate: decided ? Math.round((wins / decided) * 10000) / 100 : 0
    };
  }

  function applyMonthlyPaperLocalStorageWindow(now = new Date()) {
    const currentMonth = newYorkMonthKey(now);
    let history = [];
    let previousStats = {};
    try { history = JSON.parse(localStorage.getItem(PAPER_HISTORY_KEY) || "[]"); } catch (_error) {}
    try { previousStats = JSON.parse(localStorage.getItem(PAPER_STATS_KEY) || "{}"); } catch (_error) {}

    const kept = filterPaperHistoryToCurrentMonth(history, now);
    localStorage.setItem(PAPER_HISTORY_KEY, JSON.stringify(kept));
    localStorage.setItem(PAPER_STATS_KEY, JSON.stringify(buildPaperMonthStats(kept, previousStats)));
    localStorage.setItem(MONTH_KEY, currentMonth || "");

    // script.js still contains a legacy weekly local reset. Mark that legacy
    // boundary as already handled before script.js loads so it cannot erase
    // current-month V1 PAPER history. The monthly filter above is authoritative.
    localStorage.setItem(LEGACY_WEEKLY_RESET_KEY, String(now.getTime()));

    return { currentMonth, kept, removed: history.length - kept.length };
  }

  function normalizeSignal(value) {
    const signal = String(value || "WAIT").toUpperCase();
    if (signal.includes("BUY")) return "BUY";
    if (signal.includes("SELL")) return "SELL";
    return "WAIT";
  }

  function signalDate(item) {
    if (!item || typeof item !== "object") return null;
    for (const key of ["timestamp", "time", "created_at", "checked_at", "updated_at", "event_time"]) {
      const raw = item[key];
      if (raw == null || raw === "") continue;
      if (typeof raw === "number" || /^\d+(?:\.\d+)?$/.test(String(raw))) {
        let numeric = Number(raw);
        if (!Number.isFinite(numeric)) continue;
        if (numeric < 1e11) numeric *= 1000;
        const parsed = new Date(numeric);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      const text = String(raw).trim();
      // The backend often emits explicit UTC strings such as
      // "2026-09-14 08:00:00 UTC". Normalize that form before Date parsing.
      const normalized = /\bUTC$/i.test(text)
        ? text.replace(/\s+UTC$/i, "Z").replace(" ", "T")
        : text;
      const parsed = new Date(normalized);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  }

  function formatTorontoTime(value) {
    const date = value instanceof Date ? value : signalDate({ time: value });
    if (!date || Number.isNaN(date.getTime())) {
      const text = String(value || "--");
      const match = text.match(/\b(\d{1,2}):(\d{2})\b/);
      return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "--";
    }
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: TORONTO_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date);
  }

  function compactSignalHistory(history, limit = 10) {
    const source = (Array.isArray(history) ? history : [])
      .map((item, index) => ({ item, index, date: signalDate(item) }))
      .filter(({ item }) => item && typeof item === "object")
      .map(({ item, index, date }) => ({
        ...item,
        __historyIndex: index,
        __historyDate: date,
        __historySignal: normalizeSignal(item.signal || item.final_signal || item.action),
        __historySymbol: String(item.symbol || item.pair || "--").toUpperCase()
      }));

    // Process oldest -> newest so repeated WAIT/BUY/SELL states for each symbol
    // collapse into a single state change. If timestamps are missing, backend
    // history is normally newest-first, so reverse it for state processing.
    const allHaveDates = source.length > 0 && source.every((item) => item.__historyDate);
    const chronological = allHaveDates
      ? [...source].sort((a, b) => a.__historyDate - b.__historyDate)
      : [...source].reverse();

    const lastSignalBySymbol = new Map();
    const changes = [];
    for (const item of chronological) {
      const symbol = item.__historySymbol;
      const signal = item.__historySignal;
      if (!symbol || symbol === "--") continue;
      if (lastSignalBySymbol.get(symbol) === signal) continue;
      lastSignalBySymbol.set(symbol, signal);
      changes.push(item);
    }

    return changes
      .slice(-Math.max(1, Number(limit) || 10))
      .reverse()
      .map((item) => {
        const clone = { ...item };
        clone.signal = item.__historySignal;
        clone.time = item.__historyDate
          ? formatTorontoTime(item.__historyDate)
          : formatTorontoTime(item.time);
        delete clone.__historyIndex;
        delete clone.__historyDate;
        delete clone.__historySignal;
        delete clone.__historySymbol;
        return clone;
      });
  }

  function labelTorontoHistoryHeader() {
    const table = document.querySelector(".history-table");
    const firstHeader = table?.querySelector("thead th:first-child");
    if (firstHeader) firstHeader.textContent = "Toronto Time";
  }

  function installHistoryRendererOverride() {
    if (window.__NATHAUX_HISTORY_RENDER_OVERRIDE) return true;
    if (typeof window.renderHistory !== "function") return false;
    const originalRenderHistory = window.renderHistory;
    window.renderHistory = function (history) {
      const compact = compactSignalHistory(history, 10);
      const result = originalRenderHistory(compact);
      labelTorontoHistoryHeader();
      return result;
    };
    window.__NATHAUX_HISTORY_RENDER_OVERRIDE = true;
    labelTorontoHistoryHeader();
    return true;
  }

  function setV3BCheck(elementId, value, waiting = false) {
    const element = document.getElementById(elementId);
    if (!element) return;
    let text = "NO";
    if (value === true) text = "YES";
    else if (value == null || waiting) text = "WAIT";
    element.textContent = text;
    element.classList.toggle("check-pass", text === "YES");
    element.classList.toggle("check-fail", text === "NO");
    element.classList.toggle("check-waiting", text === "WAIT");
    element.classList.remove("check-not-checked");
  }

  function replaceV1CheckLabelsWithV3B() {
    const details = document.querySelector("details.entry-strategy-debug");
    if (!details) return;
    const summary = details.querySelector("summary");
    if (summary) summary.textContent = "V3B ENTRY STRATEGY CHECKS";

    const labels = [
      ["strategy-debug-smc", "5m BOS"],
      ["strategy-debug-swing-break", "BOS body ≥ 50%"],
      ["strategy-debug-15m-close", "Next 5m same direction"],
      ["strategy-debug-5m-confirm", "Close stays beyond BOS"],
      ["strategy-debug-swing-sl", "5m swing SL"]
    ];
    for (const [id, text] of labels) {
      const status = document.getElementById(id);
      const label = status?.previousElementSibling;
      if (label) label.textContent = text;
    }
  }

  function findV3BStatus(root, symbol) {
    const wanted = String(symbol || "").toUpperCase();
    const queue = [root];
    const seen = new Set();
    let visited = 0;
    while (queue.length && visited < 1200) {
      const value = queue.shift();
      if (!value || typeof value !== "object" || seen.has(value)) continue;
      seen.add(value);
      visited += 1;

      const model = String(
        value.paper_entry_model || value.strategy_model || value.model || ""
      ).toUpperCase();
      const valueSymbol = String(value.symbol || value.pair || "").toUpperCase().replace("/", "");
      const reason = String(value.paper_entry_reason || value.reason || value.block_reason || "");
      if (
        (!wanted || !valueSymbol || valueSymbol === wanted) &&
        (model.includes("V3B") || reason.includes("WAIT_V3B"))
      ) {
        return value;
      }
      for (const child of Object.values(value)) {
        if (child && typeof child === "object") queue.push(child);
      }
    }
    return null;
  }

  function extractCurrentChartSymbol() {
    const visible = String(window.currentChartSymbol || "").toUpperCase().replace("/", "");
    if (["EURUSD", "XAUUSD"].includes(visible)) return visible;
    const selected = document.querySelector("[data-symbol].active, .symbol-tab.active, .pair-tab.active");
    const fromDom = String(selected?.dataset?.symbol || selected?.textContent || "").toUpperCase().replace(/[^A-Z]/g, "");
    return fromDom.includes("XAUUSD") ? "XAUUSD" : "EURUSD";
  }

  function renderV3BChecksFromStatus(status) {
    replaceV1CheckLabelsWithV3B();
    if (!status || typeof status !== "object") {
      ["strategy-debug-smc", "strategy-debug-swing-break", "strategy-debug-15m-close", "strategy-debug-5m-confirm", "strategy-debug-swing-sl"]
        .forEach((id) => setV3BCheck(id, null, true));
      return;
    }

    const candidate = status.source_candidate || status.candidate || status;
    const details = candidate.paper_entry_details || status.paper_entry_details || {};
    const reason = String(
      status.reason || candidate.paper_entry_reason || status.paper_entry_reason || candidate.block_reason || "WAIT"
    );
    const hasBos = Boolean(
      candidate.source_indicator_event_id ||
      details.source_indicator_event_id ||
      candidate.five_m_bos_level ||
      (reason.includes("V3B") && !reason.includes("5M_BOS"))
    );
    const bodyRatio = Number(details.bos_body_ratio ?? candidate.bos_body_ratio);
    const bodyMin = Number(details.minimum_bos_body_ratio ?? candidate.minimum_bos_body_ratio ?? 0.5);
    const bodyKnown = Number.isFinite(bodyRatio);
    const secondSameDirection = details.second_5m_same_direction;
    const staysBeyond = details.second_5m_stays_beyond_bos_level;
    const hasSwingSl = Boolean(
      candidate.stop_loss != null || candidate.sl != null || candidate.paper_entry_ready === true
    );

    setV3BCheck("strategy-debug-smc", hasBos, !hasBos && reason.includes("5M_BOS"));
    setV3BCheck("strategy-debug-swing-break", bodyKnown ? bodyRatio >= bodyMin : null, !bodyKnown);
    setV3BCheck("strategy-debug-15m-close", typeof secondSameDirection === "boolean" ? secondSameDirection : null, typeof secondSameDirection !== "boolean");
    setV3BCheck("strategy-debug-5m-confirm", typeof staysBeyond === "boolean" ? staysBeyond : null, typeof staysBeyond !== "boolean");
    setV3BCheck("strategy-debug-swing-sl", hasSwingSl ? true : null, !hasSwingSl);

    const decision = document.getElementById("strategy-debug-decision");
    if (decision) {
      const signal = normalizeSignal(candidate.signal || candidate.final_signal || status.signal);
      decision.textContent = signal;
      decision.className = signal === "BUY" ? "decision-buy" : signal === "SELL" ? "decision-sell" : "decision-wait";
    }
    const reasonElement = document.getElementById("strategy-debug-block-reason");
    if (reasonElement) reasonElement.textContent = reason || "WAIT";
  }

  async function refreshV3BChecks() {
    replaceV1CheckLabelsWithV3B();
    try {
      const response = await fetch(`${BACKEND_URL}/dashboard-feed`, {
        cache: "no-store",
        credentials: "omit"
      });
      if (!response.ok) throw new Error(`dashboard-feed ${response.status}`);
      const payload = await response.json();
      const symbol = extractCurrentChartSymbol();
      renderV3BChecksFromStatus(findV3BStatus(payload, symbol));
    } catch (_error) {
      // Keep the V3B labels visible even if a single refresh fails. The regular
      // dashboard polling remains authoritative and trading behavior is untouched.
    }
  }

  function installDashboardEnhancements() {
    installHistoryRendererOverride();
    replaceV1CheckLabelsWithV3B();
    labelTorontoHistoryHeader();
    refreshV3BChecks();

    // script.js loads after history.js, so retry briefly until its global
    // renderHistory function exists and can be wrapped safely.
    let attempts = 0;
    const installTimer = window.setInterval(() => {
      attempts += 1;
      if (installHistoryRendererOverride() || attempts >= 20) {
        window.clearInterval(installTimer);
      }
    }, 250);

    window.setInterval(refreshV3BChecks, V3B_REFRESH_MS);
  }

  if (typeof window !== "undefined" && window.localStorage) {
    applyMonthlyPaperLocalStorageWindow();
    window.FlowSignalHistory = {
      feature: "history",
      status: "loaded",
      historyWindow: "calendar_month",
      paperStrategy: "V1",
      liveStrategy: "V3B",
      applyMonthlyPaperLocalStorageWindow,
      filterPaperHistoryToCurrentMonth,
      compactSignalHistory,
      formatTorontoTime,
      newYorkMonthKey
    };

    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", installDashboardEnhancements, { once: true });
    } else {
      installDashboardEnhancements();
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      newYorkMonthKey,
      filterPaperHistoryToCurrentMonth,
      buildPaperMonthStats,
      isOpenTrade,
      compactSignalHistory,
      formatTorontoTime,
      normalizeSignal
    };
  }
})();
