(function () {
  const PAPER_HISTORY_KEY = "paper_trade_history";
  const PAPER_STATS_KEY = "paper_trade_stats";
  const MONTH_KEY = "paper_history_month_key";
  const LEGACY_WEEKLY_RESET_KEY = "paper_reset_time";
  const TIME_ZONE = "America/New_York";
  const OPEN_RESULTS = new Set(["RUNNING", "TP1 HIT"]);
  const OPEN_STATUSES = new Set(["OPEN", "RUNNING", "CLOSING"]);

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
      newYorkMonthKey
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      newYorkMonthKey,
      filterPaperHistoryToCurrentMonth,
      buildPaperMonthStats,
      isOpenTrade
    };
  }
})();
