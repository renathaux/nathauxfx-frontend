(function () {
  "use strict";

  function fromMeta(meta = {}) {
    const displayOnly = Boolean(meta.display_only_fallback);
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
