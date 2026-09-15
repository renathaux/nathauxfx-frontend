(function () {
  "use strict";

  function fromMeta(meta = {}) {
    const displayOnly = Boolean(
      meta.display_only_fallback
      && meta.display_data_source === "persisted_ctrader_closed_candles"
    );
    return {
      displayOnly,
      analysisAvailable: displayOnly ? false : meta.analysis_available !== false,
      statusLabel: displayOnly
        ? "ANALYSIS PAUSED"
        : meta.stale_data
          ? "STALE DATA"
          : "LIVE",
    };
  }

  window.NathauxDisplayDataState = { fromMeta };
})();
