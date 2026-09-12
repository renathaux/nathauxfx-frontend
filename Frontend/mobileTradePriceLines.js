(() => {
  let lines = [];
  let lastKey = "";

  const $ = (id) => document.getElementById(id);

  function activeSymbol() {
    return String(document.querySelector('.symbol-switch-btn.active')?.dataset?.symbol || 'EURUSD').toUpperCase();
  }

  function readNumber(id) {
    const raw = String($(id)?.textContent || '').trim().replace(/,/g, '');
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }

  function clearLines(series) {
    if (!series) return;
    for (const line of lines) {
      try { series.removePriceLine(line); } catch (_) {}
    }
    lines = [];
  }

  function draw() {
    const series = window.FlowSignalMobileCandleSeries;
    if (!series) return;

    const tradeSymbol = String($("mTradeSymbol")?.textContent || '').trim().toUpperCase();
    const symbol = activeSymbol();
    const entry = readNumber('mEntry');
    const sl = readNumber('mSl');
    const tp1 = readNumber('mTp1');
    const tp2 = readNumber('mTp2');

    const key = [symbol, tradeSymbol, entry, sl, tp1, tp2].join('|');
    if (key === lastKey && lines.length) return;

    clearLines(series);
    lastKey = key;

    if (!tradeSymbol || tradeSymbol !== symbol) return;

    const configs = [
      { price: entry, color: '#f8fafc', title: 'ENTRY', lineStyle: 0, lineWidth: 2 },
      { price: sl, color: '#ef4444', title: 'SL', lineStyle: 0, lineWidth: 2 },
      { price: tp1, color: '#facc15', title: 'TP1', lineStyle: 2, lineWidth: 2 },
      { price: tp2, color: '#22c55e', title: 'TP2', lineStyle: 0, lineWidth: 2 },
    ];

    for (const cfg of configs) {
      if (!Number.isFinite(cfg.price)) continue;
      try {
        const line = series.createPriceLine({
          price: cfg.price,
          color: cfg.color,
          lineWidth: cfg.lineWidth,
          lineStyle: cfg.lineStyle,
          axisLabelVisible: false,
          title: cfg.title,
        });
        lines.push(line);
      } catch (error) {
        console.warn('Mobile trade price line failed', cfg.title, error);
      }
    }
  }

  document.addEventListener('flowsignal:mobile-chart-ready', () => setTimeout(draw, 100));
  document.addEventListener('click', (event) => {
    if (event.target.closest('.symbol-switch-btn') || event.target.closest('.tf')) {
      lastKey = '';
      setTimeout(draw, 200);
    }
  });

  window.addEventListener('load', () => setTimeout(draw, 800));
  setInterval(draw, 1000);
})();

// The mobile full menu still reuses several mature desktop panels. Load them
// inside the installed mobile web app instead of navigating the top-level page,
// which makes iOS leave standalone mode and show Safari browser chrome.
(() => {
  if (document.querySelector('script[data-mobile-app-panel-bridge]')) return;
  const script = document.createElement('script');
  script.src = 'mobileAppPanelBridge.js?v=1';
  script.async = false;
  script.dataset.mobileAppPanelBridge = '1';
  document.head.appendChild(script);
})();
