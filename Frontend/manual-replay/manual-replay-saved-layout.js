(() => {
  'use strict';

  const DESKTOP_MIN_WIDTH = 1200;
  const saved = {
    "brand[0]":{"x":5,"y":-37,"width":250,"height":46},
    "headingEyebrow[0]":{"x":288,"y":-19,"width":167,"height":16},
    "headingTitle[0]":{"x":197,"y":-28,"width":861,"height":39},
    "headingText[0]":{"x":122,"y":-34,"width":861,"height":20},
    "safeBadge[0]":{"x":-4,"y":-30,"width":257,"height":49},
    "setupPanel[0]":{"x":-13,"y":-51,"width":1437,"height":126},
    "setupEyebrow[0]":{"x":3,"y":-16,"width":173,"height":15},
    "setupTitle[0]":{"x":17,"y":-26,"width":173,"height":29},
    "setupNavButton#manualReplayNavLink":{"x":-9,"y":-19,"width":140,"height":32},
    "setupNavButton[1]":{"x":-1,"y":-22,"width":168,"height":32},
    "setupNavButton[2]":{"x":2,"y":-23,"width":143,"height":32},
    "setupGrid[0]":{"x":3,"y":-46,"width":1374,"height":68},
    "setupFieldText[0]":{"x":6,"y":-14,"width":241,"height":17},
    "setupFieldText[1]":{"x":3,"y":-13,"width":241,"height":17},
    "setupFieldText[2]":{"x":6,"y":-9,"width":241,"height":17},
    "setupFieldText[3]":{"x":5,"y":-10,"width":241,"height":17},
    "setupFieldText[4]":{"x":3,"y":-10,"width":241,"height":17},
    "setupFieldControl#symbol":{"x":0,"y":-18,"width":241,"height":22},
    "setupFieldControl#timeframe":{"x":0,"y":-17,"width":241,"height":22},
    "setupFieldControl#startDate":{"x":-1,"y":-14,"width":241,"height":30},
    "setupFieldControl#endDate":{"x":-4,"y":-14,"width":241,"height":30},
    "setupFieldControl#startingBalance":{"x":-5,"y":-15,"width":241,"height":30},
    "loadButton#loadBtn":{"x":-4,"y":-17,"width":120,"height":32},
    "mainGrid[0]":{"x":0,"y":0,"width":1416,"height":817},
    "chartPanel[0]":{"x":-14,"y":-93,"width":1176,"height":657},
    "chartToolbar[0]":{"x":107,"y":-46,"width":1031,"height":102},
    "chartTitleBlock[0]":{"x":-12,"y":43,"width":182,"height":101},
    "chartEyebrow[0]":{"x":-81,"y":-14,"width":182,"height":16},
    "chartTitle#chartTitle":{"x":-69,"y":-22,"width":182,"height":30},
    "chartMeta#chartMeta":{"x":336,"y":-79,"width":182,"height":20},
    "positionTools[0]":{"x":317,"y":-105,"width":1030,"height":36},
    "positionTool#longPositionBtn":{"x":-1,"y":0,"width":122,"height":36},
    "chartWrap[0]":{"x":-18,"y":-115,"width":1173,"height":554},
    "candleStrip[0]":{"x":-5,"y":-127,"width":1139,"height":36},
    "tradePanel[0]":{"x":81,"y":-94,"width":260,"height":724},
    "tradeEyebrow[0]":{"x":14,"y":-17,"width":190,"height":16},
    "tradeTitle[0]":{"x":42,"y":-25,"width":222,"height":27},
    "tradeIntro[0]":{"x":-1,"y":-31,"width":218,"height":41},
    "ticketField[0]":{"x":-4,"y":-43,"width":222,"height":64},
    "ticketField[1]":{"x":0,"y":0,"width":222,"height":53},
    "ticketField[5]":{"x":0,"y":9,"width":222,"height":54},
    "ticketFieldText[0]":{"x":0,"y":6,"width":222,"height":23},
    "ticketFieldText[1]":{"x":-5,"y":-49,"width":222,"height":17},
    "ticketFieldText[2]":{"x":-6,"y":-53,"width":222,"height":17},
    "ticketFieldText[3]":{"x":-6,"y":-53,"width":222,"height":20},
    "ticketFieldText[4]":{"x":4,"y":-52,"width":222,"height":17},
    "ticketFieldText[5]":{"x":-4,"y":-57,"width":222,"height":17},
    "ticketFieldControl#draftDirection":{"x":-3,"y":-6,"width":222,"height":30},
    "ticketFieldControl#draftEntry":{"x":-10,"y":-52,"width":222,"height":30},
    "ticketFieldControl#riskMethod":{"x":-8,"y":-55,"width":222,"height":22},
    "ticketFieldControl#riskValue":{"x":-8,"y":-56,"width":222,"height":30},
    "ticketFieldControl#slPrice":{"x":-8,"y":-54,"width":222,"height":30},
    "ticketFieldControl#tpPrice":{"x":-7,"y":-61,"width":222,"height":40},
    "draftMetrics[0]":{"x":-2,"y":-46,"width":222,"height":71},
    "priceHint#pricePickHint":{"x":0,"y":-45,"width":222,"height":50},
    "buyButton#buyBtn":{"x":0,"y":-45,"width":106,"height":40},
    "sellButton#sellBtn":{"x":-4,"y":-45,"width":106,"height":40},
    "resetButton#resetBtn":{"x":1,"y":-58,"width":222,"height":40},
    "metricGrid[0]":{"x":21,"y":-283,"width":1412,"height":66},
    "metricCard[0]":{"x":-29,"y":17,"width":161,"height":64},
    "metricCard[1]":{"x":-68,"y":18,"width":157,"height":62},
    "metricCard[2]":{"x":-112,"y":19,"width":159,"height":62},
    "metricCard[3]":{"x":-152,"y":20,"width":170,"height":62},
    "metricCard[4]":{"x":-182,"y":21,"width":176,"height":62},
    "metricCard[5]":{"x":-204,"y":20,"width":161,"height":62},
    "metricCard[6]":{"x":-242,"y":21,"width":166,"height":62},
    "metricValue#metricBalance":{"x":0,"y":0,"width":118,"height":28},
    "metricValue#metricPf":{"x":0,"y":0,"width":118,"height":28},
    "metricValue#metricDd":{"x":-5,"y":-6,"width":117,"height":28},
    "logPanel[0]":{"x":-19,"y":-277,"width":1445,"height":382},
    "logEyebrow[0]":{"x":4,"y":-6,"width":124,"height":16},
    "logTitle[0]":{"x":-3,"y":-11,"width":174,"height":30},
    "tradeTableCell[0]":{"x":3,"y":3,"width":119,"height":270}
  };

  const specs = [
    ['brand', '.brand'],
    ['headingEyebrow', '.heading .eyebrow'],
    ['headingTitle', '.heading h1'],
    ['headingText', '.heading p'],
    ['safeBadge', '.safe-badge'],
    ['setupPanel', '.setup-panel'],
    ['setupEyebrow', '.setup-panel .eyebrow'],
    ['setupTitle', '.setup-panel h2'],
    ['setupNavButton', '.setup-panel .nav-actions .button', true],
    ['setupGrid', '.setup-grid'],
    ['setupFieldText', '.setup-grid label > span', true],
    ['setupFieldControl', '.setup-grid input, .setup-grid select:not(.date-year-jump)', true],
    ['loadButton', '#loadBtn'],
    ['mainGrid', '.main-grid'],
    ['chartPanel', '.chart-panel'],
    ['chartToolbar', '.chart-toolbar'],
    ['chartTitleBlock', '.chart-toolbar > div:first-child'],
    ['chartEyebrow', '.chart-toolbar .eyebrow'],
    ['chartTitle', '#chartTitle'],
    ['chartMeta', '#chartMeta'],
    ['positionTools', '.position-tools'],
    ['positionTool', '.position-tools > *', true],
    ['chartWrap', '.chart-wrap'],
    ['candleStrip', '.candle-strip'],
    ['tradePanel', '.trade-panel'],
    ['tradeEyebrow', '.trade-panel > .eyebrow'],
    ['tradeTitle', '.trade-panel > h2'],
    ['tradeIntro', '.trade-panel > p'],
    ['ticketField', '.ticket-grid label', true],
    ['ticketFieldText', '.ticket-grid label > span', true],
    ['ticketFieldControl', '.ticket-grid input, .ticket-grid select', true],
    ['draftMetrics', '.draft-metrics'],
    ['priceHint', '#pricePickHint'],
    ['buyButton', '#buyBtn'],
    ['sellButton', '#sellBtn'],
    ['resetButton', '#resetBtn'],
    ['metricGrid', '.metric-grid'],
    ['metricCard', '.metric-grid article', true],
    ['metricValue', '.metric-grid article strong', true],
    ['logPanel', '.log-panel'],
    ['logEyebrow', '.log-panel .eyebrow'],
    ['logTitle', '.log-panel h2'],
    ['tradeTableCell', '.log-panel td', true]
  ];

  const originals = new WeakMap();

  function keyFor(prefix, el, index) {
    return el.id ? `${prefix}#${el.id}` : `${prefix}[${index}]`;
  }

  function remember(el) {
    if (!originals.has(el)) originals.set(el, el.getAttribute('style'));
  }

  function applyOne(el, state, prefix) {
    remember(el);
    el.style.setProperty('box-sizing', 'border-box', 'important');
    el.style.setProperty('width', `${state.width}px`, 'important');
    el.style.setProperty('height', `${state.height}px`, 'important');
    el.style.setProperty('max-width', 'none', 'important');
    el.style.setProperty('min-width', '0', 'important');
    el.style.setProperty('min-height', '0', 'important');

    // Keep the Setup panel/grid at the exact saved coordinates without using
    // transform. A transformed ancestor creates a stacking context, which made
    // the LIVE chart canvas and the setup controls fight for pointer priority.
    if (prefix === 'setupPanel' || prefix === 'setupGrid') {
      el.style.setProperty('position', 'relative', 'important');
      el.style.setProperty('left', `${state.x}px`, 'important');
      el.style.setProperty('top', `${state.y}px`, 'important');
      el.style.setProperty('transform', 'none', 'important');
    } else {
      el.style.setProperty('transform', `translate3d(${state.x}px, ${state.y}px, 0)`, 'important');
    }
  }

  function restoreAll() {
    for (const [prefix, selector, all] of specs) {
      const elements = all
        ? Array.from(document.querySelectorAll(selector))
        : [document.querySelector(selector)].filter(Boolean);
      elements.forEach((el) => {
        if (!originals.has(el)) return;
        const original = originals.get(el);
        if (original == null) el.removeAttribute('style');
        else el.setAttribute('style', original);
      });
    }
  }

  function stabilizeDynamicDesktopContent() {
    const notice = document.getElementById('notice');
    if (notice) {
      remember(notice);
      notice.style.setProperty('position', 'fixed', 'important');
      notice.style.setProperty('left', '20px', 'important');
      notice.style.setProperty('bottom', '20px', 'important');
      notice.style.setProperty('top', 'auto', 'important');
      notice.style.setProperty('right', 'auto', 'important');
      notice.style.setProperty('width', 'min(520px, calc(100vw - 40px))', 'important');
      notice.style.setProperty('margin', '0', 'important');
      notice.style.setProperty('z-index', '10000', 'important');
      notice.style.setProperty('box-shadow', '0 12px 34px rgba(0,0,0,.45)', 'important');
    }

    const dynamicSingleLine = [
      document.getElementById('chartTitle'),
      document.getElementById('chartMeta'),
      document.getElementById('progress'),
      document.getElementById('currentPrice'),
      document.getElementById('currentTime'),
      document.getElementById('ohlc'),
    ].filter(Boolean);

    dynamicSingleLine.forEach((el) => {
      el.style.setProperty('white-space', 'nowrap', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
      el.style.setProperty('text-overflow', 'ellipsis', 'important');
    });

    const title = document.getElementById('chartTitle');
    if (title) title.setAttribute('title', title.textContent || '');
    const meta = document.getElementById('chartMeta');
    if (meta) meta.setAttribute('title', meta.textContent || '');
  }

  function applySavedLayout() {
    if (window.innerWidth < DESKTOP_MIN_WIDTH) {
      restoreAll();
      return;
    }

    for (const [prefix, selector, all] of specs) {
      const elements = all
        ? Array.from(document.querySelectorAll(selector))
        : [document.querySelector(selector)].filter(Boolean);
      elements.forEach((el, index) => {
        const state = saved[keyFor(prefix, el, index)];
        if (state) applyOne(el, state, prefix);
      });
    }
    stabilizeDynamicDesktopContent();
  }

  const dynamicObserver = new MutationObserver(() => {
    if (window.innerWidth < DESKTOP_MIN_WIDTH) return;
    stabilizeDynamicDesktopContent();
  });
  dynamicObserver.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  applySavedLayout();
  window.addEventListener('load', applySavedLayout, { once: true });
  window.addEventListener('resize', applySavedLayout);
})();