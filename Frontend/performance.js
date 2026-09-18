(function () {
  const originalFetch = window.fetch?.bind(window);

  function monthifyLivePayload(payload) {
    if (!payload || typeof payload !== "object") return payload;
    const meta = payload.meta || payload.live_meta || payload;
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

  window.FlowSignalPerformance = {
    feature: "performance",
    status: "loaded",
    historyWindow: "calendar_month",
    paperStrategy: "V1",
    liveStrategy: "V3B",
    monthifyLivePayload
  };
})();
