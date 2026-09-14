(function () {
  const PAPER_HISTORY_KEY = "paper_trade_history";
  const PAPER_STATS_KEY = "paper_trade_stats";
  const MONTH_KEY = "paper_history_month_key";
  const LEGACY_WEEKLY_RESET_KEY = "paper_reset_time";
  const TIME_ZONE = "America/New_York";
  const TORONTO_TIME_ZONE = "America/Toronto";
  const BACKEND_URL = "https://flowsignal-backend-3.onrender.com";
  const OPEN_RESULTS = new Set(["RUNNING", "TP1 HIT"]);
  const OPEN_STATUSES = new Set(["OPEN", "RUNNING", "CLOSING"]);
  let lastV3BStatus = {};

  function newYorkMonthKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit"
    }).formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    return year && month ? `${year}-${month}` : null;
  }

  function parseDateValue(raw) {
    if (raw == null || raw === "") return null;
    if (typeof raw === "number" || /^\d+(?:\.\d+)?$/.test(String(raw))) {
      let n = Number(raw);
      if (!Number.isFinite(n)) return null;
      if (n < 1e11) n *= 1000;
      const d = new Date(n);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const text = String(raw).trim();
    const normalized = /\bUTC$/i.test(text)
      ? text.replace(/\s+UTC$/i, "Z").replace(" ", "T")
      : text;
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function tradeDate(trade) {
    for (const key of ["closed_at", "opened_at", "time", "timestamp"]) {
      const d = parseDateValue(trade?.[key]);
      if (d) return d;
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
      return !date || newYorkMonthKey(date) === currentMonth;
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
    for (const key of ["timestamp", "time", "created_at", "checked_at", "updated_at", "event_time"]) {
      const d = parseDateValue(item?.[key]);
      if (d) return d;
    }
    return null;
  }

  function formatTorontoTime(value) {
    const date = value instanceof Date ? value : parseDateValue(value);
    if (!date) return "--";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: TORONTO_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date);
  }

  function compactSignalHistory(history, limit = 10) {
    const source = (Array.isArray(history) ? history : []).map((item, index) => ({
      ...item,
      __date: signalDate(item),
      __index: index,
      __signal: normalizeSignal(item.signal || item.final_signal || item.action),
      __symbol: String(item.symbol || item.pair || "--").toUpperCase()
    }));
    const chronological = source.length && source.every((x) => x.__date)
      ? [...source].sort((a, b) => a.__date - b.__date)
      : [...source].reverse();
    const lastBySymbol = new Map();
    const changes = [];
    for (const item of chronological) {
      if (!item.__symbol || item.__symbol === "--") continue;
      if (lastBySymbol.get(item.__symbol) === item.__signal) continue;
      lastBySymbol.set(item.__symbol, item.__signal);
      changes.push(item);
    }
    return changes.slice(-Math.max(1, Number(limit) || 10)).reverse().map((item) => {
      const clone = { ...item };
      clone.signal = item.__signal;
      clone.time = item.__date ? formatTorontoTime(item.__date) : formatTorontoTime(item.time);
      delete clone.__date;
      delete clone.__index;
      delete clone.__signal;
      delete clone.__symbol;
      return clone;
    });
  }

  function installHistoryRendererOverride() {
    const firstHeader = document.querySelector(".history-table thead th:first-child");
    if (firstHeader) firstHeader.textContent = "Toronto Time";
    if (window.__NATHAUX_HISTORY_RENDER_OVERRIDE || typeof window.renderHistory !== "function") return false;
    const original = window.renderHistory;
    window.renderHistory = (history) => original(compactSignalHistory(history, 10));
    window.__NATHAUX_HISTORY_RENDER_OVERRIDE = true;
    return true;
  }

  function extractCurrentChartSymbol() {
    const explicit = String(window.currentChartSymbol || "").toUpperCase().replace("/", "");
    if (["EURUSD", "XAUUSD"].includes(explicit)) return explicit;
    const selected = document.querySelector("[data-symbol].active, .symbol-tab.active, .pair-tab.active");
    const text = String(selected?.dataset?.symbol || selected?.textContent || "").toUpperCase().replace(/[^A-Z]/g, "");
    return text.includes("XAUUSD") ? "XAUUSD" : "EURUSD";
  }

  function findV3BStatus(root, symbol) {
    const wanted = String(symbol || "").toUpperCase();
    const queue = [root];
    const seen = new Set();
    while (queue.length && seen.size < 1500) {
      const value = queue.shift();
      if (!value || typeof value !== "object" || seen.has(value)) continue;
      seen.add(value);
      const model = String(value.paper_entry_model || value.strategy_model || value.model || "").toUpperCase();
      const valueSymbol = String(value.symbol || value.pair || "").toUpperCase().replace("/", "");
      const reason = String(value.paper_entry_reason || value.reason || value.block_reason || "");
      if ((!wanted || !valueSymbol || valueSymbol === wanted) && (model.includes("V3B") || reason.includes("WAIT_V3B"))) return value;
      for (const child of Object.values(value)) if (child && typeof child === "object") queue.push(child);
    }
    return null;
  }

  function v3bFacts(status) {
    const candidate = status?.source_candidate || status?.candidate || status || {};
    const details = candidate.paper_entry_details || status?.paper_entry_details || {};
    const reason = String(status?.reason || candidate.paper_entry_reason || status?.paper_entry_reason || candidate.block_reason || "WAIT_V3B_PAPER_5M_BOS");
    const hasBos = Boolean(candidate.source_indicator_event_id || details.source_indicator_event_id || candidate.five_m_bos_level || (reason.includes("V3B") && !reason.includes("5M_BOS")));
    const bodyRatio = Number(details.bos_body_ratio ?? candidate.bos_body_ratio);
    const bodyMin = Number(details.minimum_bos_body_ratio ?? candidate.minimum_bos_body_ratio ?? 0.5);
    const bodyPass = Number.isFinite(bodyRatio) ? bodyRatio >= bodyMin : null;
    const secondSame = typeof details.second_5m_same_direction === "boolean" ? details.second_5m_same_direction : null;
    const beyond = typeof details.second_5m_stays_beyond_bos_level === "boolean" ? details.second_5m_stays_beyond_bos_level : null;
    const swingSl = Boolean(candidate.stop_loss != null || candidate.sl != null || candidate.paper_entry_ready === true) ? true : null;
    return { candidate, reason, hasBos, bodyPass, secondSame, beyond, swingSl };
  }

  function setCheck(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const text = value === true ? "YES" : value === false ? "NO" : "WAIT";
    el.textContent = text;
    el.classList.toggle("check-pass", text === "YES");
    el.classList.toggle("check-fail", text === "NO");
    el.classList.toggle("check-waiting", text === "WAIT");
  }

  function triggerFromReason(reason) {
    const r = String(reason || "");
    if (r.includes("AUTHORITY")) return "5m authority sync";
    if (r.includes("BOS_BODY")) return "BOS body ≥ 50%";
    if (r.includes("SECOND_5M")) return "Next 5m confirmation";
    if (r.includes("RECOVERY_ENTRY_EXPIRED")) return "Fresh 5m BOS";
    if (r.includes("5M_BOS")) return "Fresh 5m BOS";
    return "V3B 5m setup";
  }

  function applyV3BPresentation(status) {
    const f = v3bFacts(status || {});

    const details = document.querySelector("details.entry-strategy-debug");
    if (details?.querySelector("summary")) details.querySelector("summary").textContent = "V3B ENTRY STRATEGY CHECKS";
    const labels = [
      ["strategy-debug-smc", "5m BOS"],
      ["strategy-debug-swing-break", "BOS body ≥ 50%"],
      ["strategy-debug-15m-close", "Next 5m same direction"],
      ["strategy-debug-5m-confirm", "Close stays beyond BOS"],
      ["strategy-debug-swing-sl", "5m swing SL"]
    ];
    for (const [id, label] of labels) {
      const el = document.getElementById(id);
      if (el?.previousElementSibling) el.previousElementSibling.textContent = label;
    }
    setCheck("strategy-debug-smc", f.hasBos ? true : null);
    setCheck("strategy-debug-swing-break", f.bodyPass);
    setCheck("strategy-debug-15m-close", f.secondSame);
    setCheck("strategy-debug-5m-confirm", f.beyond);
    setCheck("strategy-debug-swing-sl", f.swingSl);
    const decision = document.getElementById("strategy-debug-decision");
    if (decision) decision.textContent = normalizeSignal(f.candidate.signal || f.candidate.final_signal || status?.signal);
    const reasonEl = document.getElementById("strategy-debug-block-reason");
    if (reasonEl) reasonEl.textContent = f.reason;

    const header = document.querySelector(".main-smc-panel .smc-header");
    if (header) header.textContent = "⚡ V3B PLAN";
    const structureLabel = document.querySelector("#main-smc-structure")?.previousElementSibling;
    if (structureLabel) structureLabel.textContent = "5m Structure";
    const triggerLabel = document.querySelector("#main-smc-trigger")?.previousElementSibling;
    if (triggerLabel) triggerLabel.textContent = "V3B Next Trigger";
    const waitingLabel = document.querySelector("#main-smc-waiting-list")?.previousElementSibling;
    if (waitingLabel) waitingLabel.textContent = "V3B Waiting For";

    const structure = document.getElementById("main-smc-structure");
    if (structure) structure.textContent = f.hasBos ? "5M BOS FOUND" : "WAITING 5M BOS";
    const trigger = document.getElementById("main-smc-trigger");
    if (trigger) trigger.textContent = triggerFromReason(f.reason);
    const list = document.getElementById("main-smc-waiting-list");
    if (list) {
      const rows = [
        ["5m BOS", f.hasBos ? true : null],
        ["BOS body ≥ 50%", f.bodyPass],
        ["Next 5m same direction", f.secondSame],
        ["Close stays beyond BOS", f.beyond],
        ["5m swing SL", f.swingSl]
      ];
      list.innerHTML = rows.map(([label, value]) => `<li class="${value === true ? "check-pass" : value === false ? "check-fail" : "check-waiting"}">${value === true ? "✓" : value === false ? "✗" : "•"} ${label}</li>`).join("");
    }
  }

  async function refreshV3B() {
    try {
      const response = await fetch(`${BACKEND_URL}/dashboard-feed`, { cache: "no-store", credentials: "omit" });
      if (!response.ok) return;
      const payload = await response.json();
      const found = findV3BStatus(payload, extractCurrentChartSymbol());
      if (found) lastV3BStatus = found;
    } catch (_error) {}
    applyV3BPresentation(lastV3BStatus);
  }

  function install() {
    applyMonthlyPaperLocalStorageWindow();
    let attempts = 0;
    const historyTimer = setInterval(() => {
      attempts += 1;
      if (installHistoryRendererOverride() || attempts > 20) clearInterval(historyTimer);
    }, 250);

    refreshV3B();
    setInterval(refreshV3B, 10000);

    // script.js still renders the legacy V1 presentation. Keep the dashboard
    // presentation pinned to V3B even when the V3B status request is temporarily
    // unavailable. This changes display only; PAPER remains V1 and LIVE remains V3B.
    setInterval(() => applyV3BPresentation(lastV3BStatus), 500);
  }

  if (typeof window !== "undefined" && window.localStorage) {
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
    if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", install, { once: true });
    else install();
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
