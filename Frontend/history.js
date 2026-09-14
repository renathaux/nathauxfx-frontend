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

  let lastV3BStatus = null;
  let applyingV3B = false;
  let historyOverrideInstalled = false;
  let mainPanelWrapperInstalled = false;

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
    const source = (Array.isArray(history) ? history : []).map((item) => ({
      ...item,
      __date: signalDate(item),
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
      delete clone.__signal;
      delete clone.__symbol;
      return clone;
    });
  }

  function installHistoryRendererOverride() {
    const firstHeader = document.querySelector(".history-table thead th:first-child");
    if (firstHeader && firstHeader.textContent !== "Toronto Time") firstHeader.textContent = "Toronto Time";
    if (historyOverrideInstalled || window.__NATHAUX_HISTORY_RENDER_OVERRIDE) return true;
    if (typeof window.renderHistory !== "function") return false;
    const original = window.renderHistory;
    window.renderHistory = (history) => original(compactSignalHistory(history, 10));
    window.__NATHAUX_HISTORY_RENDER_OVERRIDE = true;
    historyOverrideInstalled = true;
    return true;
  }

  function extractCurrentChartSymbol() {
    const explicit = String(window.currentChartSymbol || "").toUpperCase().replace("/", "");
    if (["EURUSD", "XAUUSD"].includes(explicit)) return explicit;
    const selected = document.querySelector("[data-symbol].active, .symbol-tab.active, .pair-tab.active");
    const text = String(selected?.dataset?.symbol || selected?.textContent || "")
      .toUpperCase().replace(/[^A-Z]/g, "");
    return text.includes("XAUUSD") ? "XAUUSD" : "EURUSD";
  }

  function isV3BObject(value) {
    if (!value || typeof value !== "object") return false;
    const model = String(
      value.live_strategy_model || value.paper_entry_model || value.strategy_model || value.model || ""
    ).toUpperCase();
    const reason = String(
      value.live_v3b_reason || value.paper_entry_reason || value.reason || value.block_reason || ""
    ).toUpperCase();
    return model.includes("V3B") || reason.includes("WAIT_V3B");
  }

  function findV3BStatus(root, symbol) {
    const wanted = String(symbol || "").toUpperCase().replace("/", "");
    const queue = [root];
    const seen = new Set();
    let fallback = null;
    while (queue.length && seen.size < 2500) {
      const value = queue.shift();
      if (!value || typeof value !== "object" || seen.has(value)) continue;
      seen.add(value);
      if (isV3BObject(value)) {
        const valueSymbol = String(value.symbol || value.pair || "").toUpperCase().replace("/", "");
        if (!valueSymbol || valueSymbol === wanted) return value;
        if (!fallback) fallback = value;
      }
      for (const child of Object.values(value)) {
        if (child && typeof child === "object") queue.push(child);
      }
    }
    return fallback;
  }

  function v3bFacts(status) {
    const liveDetails = status?.live_v3b_details || {};
    const candidate = liveDetails.source_candidate || status?.source_candidate || status?.candidate || status || {};
    const details = candidate.paper_entry_details || status?.paper_entry_details || liveDetails || {};
    const reason = String(
      status?.live_v3b_reason || status?.reason || candidate.paper_entry_reason ||
      status?.paper_entry_reason || candidate.block_reason || "WAIT_V3B_PAPER_5M_BOS"
    );
    const reasonUpper = reason.toUpperCase();
    const hasBos = Boolean(
      candidate.source_indicator_event_id || details.source_indicator_event_id ||
      candidate.five_m_bos_level || candidate.five_m_break_time ||
      (reasonUpper.includes("WAIT_V3B") && !reasonUpper.includes("5M_BOS"))
    );
    const bodyRatio = Number(details.bos_body_ratio ?? candidate.bos_body_ratio);
    const bodyMin = Number(details.minimum_bos_body_ratio ?? candidate.minimum_bos_body_ratio ?? 0.5);
    const bodyPass = Number.isFinite(bodyRatio) ? bodyRatio >= bodyMin : null;
    const secondSame = typeof details.second_5m_same_direction === "boolean"
      ? details.second_5m_same_direction
      : null;
    const beyond = typeof details.second_5m_stays_beyond_bos_level === "boolean"
      ? details.second_5m_stays_beyond_bos_level
      : null;
    const swingSl = candidate.stop_loss != null || candidate.sl != null || candidate.paper_entry_ready === true
      ? true
      : null;
    return { candidate, reason, hasBos, bodyPass, secondSame, beyond, swingSl };
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el && el.textContent !== text) el.textContent = text;
  }

  function setNodeText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  function setCheck(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const text = value === true ? "YES" : value === false ? "NO" : "WAIT";
    if (el.textContent !== text) el.textContent = text;
    el.classList.toggle("check-pass", text === "YES");
    el.classList.toggle("check-fail", text === "NO");
    el.classList.toggle("check-waiting", text === "WAIT");
    el.classList.remove("check-not-checked", "check-blocked");
  }

  function triggerFromReason(reason) {
    const r = String(reason || "").toUpperCase();
    if (r.includes("AUTHORITY_DESYNC") || r.includes("AUTHORITY_STALE")) return "5m authority sync";
    if (r.includes("BOS_BODY")) return "BOS body ≥ 50%";
    if (r.includes("SECOND_5M")) return "Next 5m confirmation";
    if (r.includes("RECOVERY_ENTRY_EXPIRED")) return "Fresh 5m BOS";
    if (r.includes("5M_BOS")) return "Fresh 5m BOS";
    if (r.includes("DURABLE_IDENTITY")) return "5m setup identity";
    return "V3B 5m setup";
  }

  function applyV3BPresentation(status) {
    if (applyingV3B) return;
    const panel = document.querySelector(".main-smc-panel");
    if (!panel) return;
    applyingV3B = true;
    try {
      const f = v3bFacts(status || {});
      const details = document.querySelector("details.entry-strategy-debug");
      setNodeText(details?.querySelector("summary"), "V3B ENTRY STRATEGY CHECKS");

      const labels = [
        ["strategy-debug-smc", "5m BOS"],
        ["strategy-debug-swing-break", "BOS body ≥ 50%"],
        ["strategy-debug-15m-close", "Next 5m same direction"],
        ["strategy-debug-5m-confirm", "Close stays beyond BOS"],
        ["strategy-debug-swing-sl", "5m swing SL"]
      ];
      for (const [id, label] of labels) {
        const el = document.getElementById(id);
        setNodeText(el?.previousElementSibling, label);
      }

      setCheck("strategy-debug-smc", f.hasBos ? true : null);
      setCheck("strategy-debug-swing-break", f.bodyPass);
      setCheck("strategy-debug-15m-close", f.secondSame);
      setCheck("strategy-debug-5m-confirm", f.beyond);
      setCheck("strategy-debug-swing-sl", f.swingSl);
      setText("strategy-debug-decision", normalizeSignal(f.candidate.signal || f.candidate.final_signal || status?.signal));
      setText("strategy-debug-block-reason", f.reason);

      setNodeText(panel.querySelector(".smc-header"), "⚡ V3B PLAN");
      setNodeText(document.querySelector("#main-smc-structure")?.previousElementSibling, "5m Structure");
      setNodeText(document.querySelector("#main-smc-trigger")?.previousElementSibling, "V3B Next Trigger");
      setNodeText(document.querySelector("#main-smc-waiting-list")?.previousElementSibling, "V3B Waiting For");

      setText("main-smc-structure", f.hasBos ? "5M BOS FOUND" : "WAITING 5M BOS");
      setText("main-smc-trigger", triggerFromReason(f.reason));

      const rows = [
        ["5m BOS", f.hasBos ? true : null],
        ["BOS body ≥ 50%", f.bodyPass],
        ["Next 5m same direction", f.secondSame],
        ["Close stays beyond BOS", f.beyond],
        ["5m swing SL", f.swingSl]
      ];
      const list = document.getElementById("main-smc-waiting-list");
      if (list) {
        const html = rows.map(([label, value]) =>
          `<li class="${value === true ? "check-pass" : value === false ? "check-fail" : "check-waiting"}">${value === true ? "✓" : value === false ? "✗" : "•"} ${label}</li>`
        ).join("");
        if (list.innerHTML !== html) list.innerHTML = html;
      }

      for (const id of ["main-tp2", "main-rr"]) {
        const el = document.getElementById(id);
        if (el && /^WAIT_(?!V3B)/i.test(String(el.textContent || "").trim())) el.textContent = "--";
      }
    } finally {
      applyingV3B = false;
    }
  }

  function enforceV3BNow() {
    applyV3BPresentation(lastV3BStatus || {});
  }

  function installMainPanelWrapper() {
    if (mainPanelWrapperInstalled || window.__NATHAUX_V3B_MAIN_PANEL_WRAPPED) return true;
    if (typeof window.updateMainPanel !== "function") return false;
    const original = window.updateMainPanel;
    window.updateMainPanel = function (...args) {
      const result = original.apply(this, args);
      enforceV3BNow();
      return result;
    };
    window.__NATHAUX_V3B_MAIN_PANEL_WRAPPED = true;
    mainPanelWrapperInstalled = true;
    return true;
  }

  async function refreshV3B() {
    try {
      const response = await fetch(`${BACKEND_URL}/dashboard-feed`, {
        cache: "no-store",
        credentials: "omit"
      });
      if (response.ok) {
        const payload = await response.json();
        const found = findV3BStatus(payload, extractCurrentChartSymbol());
        if (found) lastV3BStatus = found;
      }
    } catch (_error) {}
    enforceV3BNow();
  }

  function install() {
    try { applyMonthlyPaperLocalStorageWindow(); } catch (_error) {}

    window.__NATHAUX_V3B_UI_MODE = true;
    window.__NATHAUX_APPLY_V3B = enforceV3BNow;

    enforceV3BNow();
    refreshV3B();

    let attempts = 0;
    const historyTimer = setInterval(() => {
      attempts += 1;
      if (installHistoryRendererOverride() || attempts > 40) clearInterval(historyTimer);
    }, 100);

    let panelAttempts = 0;
    const panelTimer = setInterval(() => {
      panelAttempts += 1;
      if (installMainPanelWrapper() || panelAttempts > 80) clearInterval(panelTimer);
    }, 100);

    setInterval(refreshV3B, 5000);
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
      newYorkMonthKey,
      applyV3BPresentation: enforceV3BNow
    };

    install();
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