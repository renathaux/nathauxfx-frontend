(function () {
  const originalFetch = window.fetch?.bind(window);

  function monthifyLivePayload(payload) {
    if (!payload || typeof payload !== "object") return payload;
    const meta = payload.meta || payload.live_meta || payload;
    const pl = meta?.live_pl_sync;
    if (pl && typeof pl === "object") {
      const floating = Number(pl.floating_live_pl || 0);
      const monthlyRealized = Number(pl.monthly_realized_pl || 0);
      pl.risk_weekly_realized_pl = pl.weekly_realized_pl;
      pl.risk_weekly_total_pl = pl.weekly_total_pl;
      pl.history_window = "calendar_month";
      pl.history_window_start_ts = pl.monthly_start_ts;
      // Existing UI code reads the legacy weekly fields. Browser presentation
      // maps those fields to month-to-date values only; backend weekly risk
      // calculations remain untouched.
      pl.weekly_realized_pl = monthlyRealized;
      pl.weekly_total_pl = monthlyRealized + floating;
      pl.monthly_total_pl = monthlyRealized + floating;
    }
    if (meta && typeof meta === "object") {
      meta.paper_strategy_identity = "PAPER — V1";
      meta.live_strategy_identity = "LIVE — V3B";
      meta.performance_history_window = "calendar_month";
    }
    return payload;
  }

  if (originalFetch && !window.__NATHAUXFX_MONTHLY_PERFORMANCE_FETCH__) {
    window.fetch = async function (input, init) {
      const response = await originalFetch(input, init);
      try {
        const rawUrl = typeof input === "string" ? input : input?.url || "";
        const url = new URL(rawUrl, window.location.href);
        if (!/\/(dashboard-feed|panel-data)$/.test(url.pathname)) return response;
        const data = await response.clone().json();
        const transformed = monthifyLivePayload(data);
        return new Response(JSON.stringify(transformed), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      } catch (_error) {
        return response;
      }
    };
    window.__NATHAUXFX_MONTHLY_PERFORMANCE_FETCH__ = true;
  }

  function relabelMonthlyPerformance() {
    const candidates = document.querySelectorAll("span,div,label,strong");
    candidates.forEach((element) => {
      const text = String(element.textContent || "").trim();
      if (text !== "WEEKLY P/L" && text !== "Weekly P/L") return;
      if (element.closest(".risk-settings,#riskSettingsModal,[data-risk-settings]")) return;
      element.textContent = text === "WEEKLY P/L" ? "MONTHLY P/L" : "Monthly P/L";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", relabelMonthlyPerformance, { once: true });
  } else {
    relabelMonthlyPerformance();
  }

  const observer = new MutationObserver(relabelMonthlyPerformance);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.FlowSignalPerformance = {
    feature: "performance",
    status: "loaded",
    historyWindow: "calendar_month",
    paperStrategy: "V1",
    liveStrategy: "V3B",
    monthifyLivePayload,
    relabelMonthlyPerformance
  };
})();
