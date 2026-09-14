(function () {
  const PAPER_HISTORY_KEY = "paper_trade_history";
  const PAPER_STATS_KEY = "paper_trade_stats";
  const MONTH_KEY = "paper_history_month_key";
  const LEGACY_WEEKLY_RESET_KEY = "paper_reset_time";
  const TIME_ZONE = "America/New_York";
  const TORONTO_TIME_ZONE = "America/Toronto";
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
    if (firstHeader) firstHeader.textContent = "Toronto Time";
    if (window.__NATHAUX_HISTORY_RENDER_OVERRIDE || typeof window.renderHistory !== "function") return false;
    const original = window.renderHistory;
    window.renderHistory = (history) => original(compactSignalHistory(history, 10));
    window.__NATHAUX_HISTORY_RENDER_OVERRIDE = true;
    return true;
  }

  function asObject(value) {
    return value && typeof value === "object" ? value : null;
  }

  function firstText(...values) {
    for (const value of values) {
      if (value == null) continue;
      const text = String(value).trim();
      if (text) return text;
    }
    return "";
  }

  function isInactiveV3BState(value) {
    return /(?:EXPIRED|INVALIDATED|CONSUMED|INACTIVE|CANCELLED|CANCELED)/i.test(String(value || ""));
  }

  function currentV3BEventId(candidate, liveDetails) {
    return firstText(
      candidate?.source_indicator_event_id,
      candidate?.indicator_event_id,
      candidate?.source_event_id,
      candidate?.event_id,
      candidate?.stable_event_id,
      liveDetails?.source_indicator_event_id,
      liveDetails?.indicator_event_id,
      liveDetails?.event_id,
      liveDetails?.stable_event_id
    );
  }

  function strategyDebugSnapshot(status) {
    return {
      ...(asObject(status?.signal_diagnostics) || {}),
      ...(asObject(status?.entry_strategy_debug) || {}),
      ...(asObject(status?.strategy_debug) || {})
    };
  }

  function v3bFacts(status) {
    const liveDetails = asObject(status?.live_v3b_details) || {};
    const strategyDebug = strategyDebugSnapshot(status);
    const explicitV3BReason = firstText(
      status?.live_v3b_reason,
      liveDetails.live_v3b_reason,
      liveDetails.reason,
      liveDetails.block_reason
    );
    const model = firstText(status?.live_strategy_model, status?.strategy_model).toUpperCase();

    let candidate = asObject(liveDetails.source_candidate) || asObject(liveDetails.candidate);
    if (!candidate && explicitV3BReason && model.includes("V3B")) {
      candidate = asObject(status?.source_candidate) || asObject(status?.candidate);
    }

    const candidateReason = firstText(candidate?.paper_entry_reason, candidate?.live_v3b_reason, candidate?.block_reason);
    const v3bReason = explicitV3BReason || (/^(?:WAIT_)?V3B(?:_|$)/i.test(candidateReason) ? candidateReason : "");
    const genericReason = firstText(
      strategyDebug.blocked_reason,
      strategyDebug.block_reason,
      strategyDebug.reason,
      strategyDebug.reason_if_wait,
      strategyDebug.rejection_reason,
      status?.blocked_reason,
      status?.block_reason,
      status?.reason,
      status?.plan_reason,
      "--"
    );
    const reason = v3bReason || genericReason || "--";

    const eventId = currentV3BEventId(candidate, liveDetails);
    const lifecycleState = firstText(
      candidate?.lifecycle_state,
      candidate?.event_state,
      candidate?.state,
      liveDetails.lifecycle_state,
      liveDetails.event_state,
      liveDetails.state,
      strategyDebug.lifecycle_state,
      strategyDebug.event_state,
      strategyDebug.state,
      strategyDebug.saved_15m_setup_status,
      strategyDebug.expired_15m_setup?.status
    );
    const currentEvent = Boolean(
      candidate
      && eventId
      && !isInactiveV3BState(lifecycleState)
      && !isInactiveV3BState(v3bReason)
      && !isInactiveV3BState(genericReason)
    );

    if (!currentEvent) {
      return {
        candidate: {},
        liveDetails,
        reason,
        v3bReason,
        genericReason,
        eventId: "",
        currentEvent: false,
        hasBos: null,
        bodyPass: null,
        secondSame: null,
        beyond: null,
        swingSl: null,
        signal: "WAIT"
      };
    }

    const details = asObject(candidate.paper_entry_details)
      || asObject(liveDetails.paper_entry_details)
      || {};
    const explicitBos = details.five_m_bos_detected
      ?? candidate.five_m_bos_detected
      ?? details.bos_detected
      ?? candidate.bos_detected;
    const hasBos = typeof explicitBos === "boolean"
      ? explicitBos
      : (candidate.five_m_bos_level != null || candidate.five_m_break_time != null)
        ? true
        : null;
    const bodyRatio = Number(details.bos_body_ratio ?? candidate.bos_body_ratio);
    const bodyMin = Number(details.minimum_bos_body_ratio ?? candidate.minimum_bos_body_ratio ?? 0.5);
    const bodyPass = Number.isFinite(bodyRatio) ? bodyRatio >= bodyMin : null;
    const secondSame = typeof details.second_5m_same_direction === "boolean"
      ? details.second_5m_same_direction
      : null;
    const beyond = typeof details.second_5m_stays_beyond_bos_level === "boolean"
      ? details.second_5m_stays_beyond_bos_level
      : null;
    const explicitSwingSl = details.swing_sl_valid
      ?? candidate.swing_sl_valid
      ?? details.swing_sl_found
      ?? candidate.swing_sl_found;
    const swingSl = typeof explicitSwingSl === "boolean"
      ? explicitSwingSl
      : candidate.stop_loss != null || candidate.sl != null || candidate.paper_entry_ready === true
        ? true
        : null;
    const signal = normalizeSignal(candidate.signal || candidate.final_signal || candidate.final_entry_decision);

    return {
      candidate,
      liveDetails,
      reason,
      v3bReason,
      genericReason,
      eventId,
      currentEvent: true,
      hasBos,
      bodyPass,
      secondSame,
      beyond,
      swingSl,
      signal
    };
  }

  const OWNED_IDS = {
    "strategy-debug-smc": "v3b-strategy-debug-smc",
    "strategy-debug-swing-break": "v3b-strategy-debug-swing-break",
    "strategy-debug-15m-close": "v3b-strategy-debug-15m-close",
    "strategy-debug-5m-confirm": "v3b-strategy-debug-5m-confirm",
    "strategy-debug-swing-sl": "v3b-strategy-debug-swing-sl",
    "strategy-debug-decision": "v3b-strategy-debug-decision",
    "strategy-debug-block-reason": "v3b-strategy-debug-block-reason",
    "main-tp2": "v3b-main-tp2",
    "main-rr": "v3b-main-rr"
  };

  function claimVisibleElement(originalId, ownedId) {
    const existingOwned = document.getElementById(ownedId);
    if (existingOwned) return existingOwned;
    const visible = document.getElementById(originalId);
    if (!visible) return null;

    visible.id = ownedId;
    visible.dataset.v3bOwned = "1";

    const sink = document.createElement(visible.tagName || "span");
    sink.id = originalId;
    sink.hidden = true;
    sink.setAttribute("aria-hidden", "true");
    sink.style.display = "none";
    visible.parentNode?.appendChild(sink);
    return visible;
  }

  function ensureV3BOwnership() {
    for (const [legacyId, ownedId] of Object.entries(OWNED_IDS)) {
      claimVisibleElement(legacyId, ownedId);
    }
    const details = document.querySelector("details.entry-strategy-debug");
    if (details) details.dataset.v3bViewVersion = "5";
  }

  function setCheck(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const text = value === true ? "YES" : value === false ? "NO" : "WAIT";
    el.textContent = text;
    el.classList.toggle("check-pass", text === "YES");
    el.classList.toggle("check-fail", text === "NO");
    el.classList.toggle("check-waiting", text === "WAIT");
    el.classList.remove("check-not-checked");
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el && el.textContent !== text) el.textContent = text;
  }

  function numericText(...values) {
    for (const value of values) {
      if (value == null || value === "") continue;
      const number = Number(value);
      if (Number.isFinite(number)) return String(value);
    }
    return "--";
  }

  function isValidRiskRewardText(value) {
    const text = String(value || "").trim();
    if (!text || text === "--") return false;
    return /^\d+(?:\.\d+)?\s*(?:(?::|\/)\s*\d+(?:\.\d+)?|R)?$/i.test(text);
  }

  function riskRewardText(...values) {
    for (const value of values) {
      const text = String(value ?? "").trim();
      if (isValidRiskRewardText(text)) return text;
    }
    return "--";
  }

  function renderV3BPresentation(status) {
    ensureV3BOwnership();
    const f = v3bFacts(status || {});
    const effectiveCurrentEvent = f.currentEvent && !isInactiveV3BState(f.reason);
    const detailsPanel = document.querySelector("details.entry-strategy-debug");
    const summary = detailsPanel?.querySelector("summary");
    if (summary) summary.textContent = "V3B ENTRY STRATEGY CHECKS";

    const header = document.querySelector(".main-smc-panel .smc-header");
    if (header) header.textContent = "⚡ V3B PLAN";

    const labels = [
      ["v3b-strategy-debug-smc", "5m BOS"],
      ["v3b-strategy-debug-swing-break", "BOS body ≥ 50%"],
      ["v3b-strategy-debug-15m-close", "Next 5m same direction"],
      ["v3b-strategy-debug-5m-confirm", "Close stays beyond BOS"],
      ["v3b-strategy-debug-swing-sl", "5m swing SL"]
    ];
    for (const [id, label] of labels) {
      const el = document.getElementById(id);
      if (el?.previousElementSibling) el.previousElementSibling.textContent = label;
    }

    setCheck("v3b-strategy-debug-smc", effectiveCurrentEvent ? f.hasBos : null);
    setCheck("v3b-strategy-debug-swing-break", effectiveCurrentEvent ? f.bodyPass : null);
    setCheck("v3b-strategy-debug-15m-close", effectiveCurrentEvent ? f.secondSame : null);
    setCheck("v3b-strategy-debug-5m-confirm", effectiveCurrentEvent ? f.beyond : null);
    setCheck("v3b-strategy-debug-swing-sl", effectiveCurrentEvent ? f.swingSl : null);
    setText("v3b-strategy-debug-decision", effectiveCurrentEvent ? f.signal : "WAIT");
    setText("v3b-strategy-debug-block-reason", f.reason);

    const executed = asObject(status?.executed_trade_setup_snapshot) || {};
    const candidate = f.candidate || {};
    const candidateDetails = asObject(candidate.paper_entry_details) || asObject(f.liveDetails?.paper_entry_details) || {};

    const tp2 = executed.tp2 != null
      ? numericText(executed.tp2)
      : effectiveCurrentEvent
        ? numericText(
            candidate.tp2,
            candidate.take_profit_2,
            candidate.paper_tp2,
            candidateDetails.tp2,
            f.liveDetails?.tp2,
            status?.tp2
          )
        : "--";

    const rr = executed.risk_reward != null || executed.risk_reward_ratio != null
      ? riskRewardText(executed.risk_reward, executed.risk_reward_ratio)
      : effectiveCurrentEvent
        ? riskRewardText(
            candidate.risk_reward,
            candidate.risk_reward_ratio,
            candidateDetails.risk_reward,
            candidateDetails.risk_reward_ratio,
            f.liveDetails?.risk_reward,
            f.liveDetails?.risk_reward_ratio,
            status?.risk_reward,
            status?.risk_reward_ratio
          )
        : "--";

    setText("v3b-main-tp2", tp2);
    setText("v3b-main-rr", rr);
  }

  function install() {
    applyMonthlyPaperLocalStorageWindow();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (installHistoryRendererOverride() || attempts > 20) clearInterval(timer);
    }, 250);
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
      renderV3BPresentation
    };
    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", install, { once: true });
    } else {
      install();
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
      normalizeSignal,
      v3bFacts,
      renderV3BPresentation
    };
  }
})();
