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

  window.ManualReplayDefaultLayoutV4 = {"version":4,"page":"manual-replay","viewport":{"width":1440,"height":810},"savedAt":"2026-09-22T15:07:05.198Z","items":{"header[0]":{"locked":false,"deleted":false},"brand[0]":{"x":-2,"y":-19,"width":250,"height":46,"locked":true,"deleted":false},"brandMark[0]":{"locked":false,"deleted":false},"brandTitle[0]":{"locked":false,"deleted":false},"brandSubtitle[0]":{"locked":false,"deleted":false},"headingBlock[0]":{"locked":true,"deleted":false},"headingEyebrow[0]":{"locked":false,"deleted":true},"headingTitle[0]":{"x":243,"y":-17,"width":317,"height":47,"locked":true,"deleted":false},"headingText[0]":{"locked":false,"deleted":true},"safeBadge[0]":{"x":-95,"y":-20,"width":321,"height":34,"locked":true,"deleted":false},"setupPanel[0]":{"x":2,"y":19,"width":1437,"height":120,"locked":false,"deleted":false},"setupTitleBlock[0]":{"locked":false,"deleted":false},"setupEyebrow[0]":{"x":434,"y":-21,"width":173,"height":15,"locked":false,"deleted":true},"setupTitle[0]":{"x":1,"y":-16,"width":173,"height":28,"locked":true,"deleted":false},"setupNav[0]":{"locked":false,"deleted":false},"setupNavButton#manualReplayNavLink":{"x":-5,"y":-13,"width":140,"height":32,"locked":true,"deleted":false},"setupNavButton[1]":{"x":-6,"y":-13,"width":168,"height":32,"locked":false,"deleted":false},"setupNavButton[2]":{"x":-9,"y":-12,"width":143,"height":32,"locked":false,"deleted":false},"setupGrid[0]":{"x":6,"y":18,"width":1374,"height":68,"locked":true,"deleted":false},"setupField[0]":{"locked":false,"deleted":false},"setupField[1]":{"locked":false,"deleted":false},"setupField[2]":{"x":0,"y":-13,"width":241,"height":54,"locked":false,"deleted":false},"setupField[3]":{"locked":false,"deleted":false},"setupField[4]":{"locked":false,"deleted":false},"setupFieldText[0]":{"x":4,"y":-15,"width":241,"height":17,"locked":false,"deleted":false},"setupFieldText[1]":{"x":2,"y":-13,"width":241,"height":17,"locked":false,"deleted":false},"setupFieldText[2]":{"x":3,"y":5,"width":241,"height":17,"locked":false,"deleted":false},"setupFieldText[3]":{"x":-6,"y":-9,"width":80,"height":17,"locked":false,"deleted":false},"setupFieldText[4]":{"x":-38,"y":-5,"width":91,"height":23,"locked":false,"deleted":false,"text":"Balance"},"setupFieldControl#symbol":{"locked":false,"deleted":false},"setupFieldControl#timeframe":{"locked":false,"deleted":false},"setupFieldControl#startDate":{"x":0,"y":0,"width":106,"height":30,"locked":false,"deleted":false},"setupFieldControl#endDate":{"x":-8,"y":-14,"width":115,"height":30,"locked":false,"deleted":false},"setupFieldControl#startingBalance":{"x":-45,"y":-16,"width":161,"height":30,"locked":false,"deleted":false},"dateYearJump#startYear":{"x":0,"y":0,"width":86,"height":30,"locked":false,"deleted":false},"dateYearJump#endYear":{"x":-13,"y":-13,"width":86,"height":30,"locked":false,"deleted":false},"loadButton#loadBtn":{"locked":false,"deleted":false},"mainGrid#replayWorkspace":{"x":-13,"y":-12,"width":1423,"height":948,"locked":false,"deleted":false},"chartPanel[0]":{"x":2,"y":-52,"width":1179,"height":657,"locked":false,"deleted":false},"chartToolbar[0]":{"x":114,"y":-46,"width":1031,"height":102,"locked":false,"deleted":false},"chartTitleBlock[0]":{"x":-116,"y":2,"width":254,"height":56,"locked":false,"deleted":false},"chartEyebrow[0]":{"x":-160,"y":12,"width":182,"height":28,"locked":false,"deleted":false},"chartTitle#chartTitle":{"x":9,"y":-9,"width":182,"height":35,"locked":false,"deleted":false},"chartMeta#chartMeta":{"locked":false,"deleted":true},"playback[0]":{"x":-2,"y":2,"width":533,"height":40,"locked":false,"deleted":false},"playbackItem#prevBtn":{"locked":false,"deleted":false},"playbackItem#playBtn":{"locked":false,"deleted":false},"playbackItem#nextBtn":{"locked":false,"deleted":false},"playbackItem#speed":{"locked":false,"deleted":false},"playbackItem#zoomOutBtn":{"locked":false,"deleted":false},"playbackItem#zoomInBtn":{"locked":false,"deleted":false},"playbackItem#fullscreenBtn":{"locked":false,"deleted":false},"playbackItem#progress":{"locked":false,"deleted":false},"positionTools[0]":{"x":182,"y":-123,"width":428,"height":36,"locked":false,"deleted":false},"positionTool#longPositionBtn":{"locked":false,"deleted":false},"positionTool#shortPositionBtn":{"locked":false,"deleted":false},"positionTool#cancelPositionBtn":{"locked":false,"deleted":false},"chartWrap[0]":{"x":-12,"y":-128,"width":1163,"height":607,"locked":false,"deleted":false},"candleStrip[0]":{"x":0,"y":-165,"width":318,"height":30,"locked":false,"deleted":false},"currentPrice#currentPrice":{"locked":false,"deleted":false},"currentTime#currentTime":{"locked":false,"deleted":false},"ohlc#ohlc":{"locked":false,"deleted":false},"tradePanel[0]":{"x":80,"y":-52,"width":267,"height":659,"locked":true,"deleted":false},"tradeEyebrow[0]":{"x":144,"y":0,"width":199,"height":76,"locked":false,"deleted":true},"tradeTitle[0]":{"x":24,"y":47,"width":222,"height":27,"locked":false,"deleted":true},"tradeIntro[0]":{"x":-30,"y":-34,"width":264,"height":41,"locked":false,"deleted":true},"ticketGrid[0]":{"locked":false,"deleted":false},"ticketField[0]":{"locked":false,"deleted":false},"ticketField[1]":{"locked":false,"deleted":false},"ticketField[2]":{"x":0,"y":0,"width":222,"height":54,"locked":false,"deleted":false},"ticketField#riskMethodField":{"locked":false,"deleted":false},"ticketField#riskValueField":{"locked":false,"deleted":false},"ticketField[6]":{"locked":false,"deleted":false},"ticketField[7]":{"locked":false,"deleted":false},"ticketFieldText[0]":{"x":-8,"y":-11,"width":222,"height":17,"locked":false,"deleted":false},"ticketFieldText[1]":{"x":-4,"y":-15,"width":222,"height":17,"locked":false,"deleted":false},"ticketFieldText[2]":{"x":-3,"y":-20,"width":222,"height":17,"locked":false,"deleted":false},"ticketFieldText[3]":{"x":-3,"y":-26,"width":222,"height":17,"locked":false,"deleted":false},"ticketFieldText[4]":{"x":0,"y":-30,"width":222,"height":17,"locked":false,"deleted":false},"ticketFieldText[6]":{"x":1,"y":-38,"width":222,"height":17,"locked":false,"deleted":false},"ticketFieldText[7]":{"x":-4,"y":-40,"width":222,"height":17,"locked":false,"deleted":false},"ticketFieldControl#draftDirection":{"x":-10,"y":-13,"width":222,"height":30,"locked":false,"deleted":false},"ticketFieldControl#draftEntry":{"x":-10,"y":-17,"width":222,"height":30,"locked":false,"deleted":false},"ticketFieldControl#positionSizingMode":{"x":-8,"y":-22,"width":222,"height":30,"locked":false,"deleted":false},"ticketFieldControl#riskMethod":{"x":-5,"y":-30,"width":222,"height":22,"locked":false,"deleted":false},"ticketFieldControl#riskValue":{"x":-7,"y":-34,"width":222,"height":30,"locked":false,"deleted":false},"ticketFieldControl#slPrice":{"x":-7,"y":-41,"width":222,"height":30,"locked":false,"deleted":false},"ticketFieldControl#tpPrice":{"x":-4,"y":-43,"width":222,"height":30,"locked":false,"deleted":false},"draftMetrics[0]":{"x":-4,"y":-46,"width":222,"height":131,"locked":false,"deleted":false},"draftMetricCard[0]":{"x":0,"y":3,"width":64,"height":52,"locked":false,"deleted":false},"draftMetricCard[1]":{"x":0,"y":0,"width":81,"height":52,"locked":false,"deleted":false},"draftMetricCard[2]":{"x":0,"y":0,"width":64,"height":54,"locked":false,"deleted":false},"draftMetricCard[3]":{"locked":false,"deleted":false},"draftMetricCard[4]":{"locked":false,"deleted":false},"draftMetricCard[5]":{"locked":false,"deleted":false},"draftMetricLabel[0]":{"locked":false,"deleted":false},"draftMetricLabel[1]":{"locked":false,"deleted":false},"draftMetricLabel[2]":{"locked":false,"deleted":false},"draftMetricLabel[3]":{"locked":false,"deleted":false},"draftMetricLabel[4]":{"locked":false,"deleted":false},"draftMetricLabel[5]":{"locked":false,"deleted":false},"draftMetricValue#draftLot":{"x":0,"y":0,"width":48,"height":19,"locked":false,"deleted":false},"draftMetricValue#draftSlPips":{"x":0,"y":0,"width":65,"height":21,"locked":false,"deleted":false},"draftMetricValue#draftRisk":{"locked":false,"deleted":false},"draftMetricValue#draftTpPips":{"locked":false,"deleted":false},"draftMetricValue#draftReward":{"locked":false,"deleted":false},"draftMetricValue#draftRr":{"locked":false,"deleted":false},"priceHint#pricePickHint":{"locked":false,"deleted":true},"sideButtons[0]":{"x":-5,"y":-56,"width":234,"height":40,"locked":false,"deleted":false},"buyButton#buyBtn":{"x":2,"y":5,"width":106,"height":40,"locked":false,"deleted":false},"sellButton#sellBtn":{"x":-9,"y":5,"width":111,"height":40,"locked":false,"deleted":false},"resetButton#resetBtn":{"x":-3,"y":-65,"width":222,"height":40,"locked":false,"deleted":false},"metricGrid[0]":{"x":16,"y":-384,"width":1412,"height":66,"locked":false,"deleted":false},"metricCard[0]":{"x":-24,"y":24,"width":233,"height":64,"locked":false,"deleted":false},"metricCard[1]":{"x":-30,"y":25,"width":217,"height":62,"locked":false,"deleted":false},"metricCard[2]":{"x":-39,"y":21,"width":210,"height":62,"locked":false,"deleted":false},"metricCard[3]":{"x":-47,"y":21,"width":241,"height":62,"locked":false,"deleted":false},"metricCard[4]":{"x":-55,"y":22,"width":176,"height":62,"locked":false,"deleted":false},"metricCard[5]":{"x":-63,"y":20,"width":161,"height":65,"locked":false,"deleted":false},"metricCard[6]":{"x":-71,"y":19,"width":180,"height":66,"locked":false,"deleted":false},"metricLabel[0]":{"locked":false,"deleted":false},"metricLabel[1]":{"x":-8,"y":-13,"width":129,"height":16,"locked":false,"deleted":false},"metricLabel[2]":{"x":0,"y":0,"width":131,"height":16,"locked":true,"deleted":false},"metricLabel[3]":{"x":0,"y":0,"width":142,"height":16,"locked":false,"deleted":false},"metricLabel[4]":{"x":0,"y":0,"width":148,"height":16,"locked":false,"deleted":false},"metricLabel[5]":{"locked":false,"deleted":false},"metricLabel[6]":{"locked":false,"deleted":false},"metricValue#metricBalance":{"locked":false,"deleted":false},"metricValue#metricPnl":{"locked":false,"deleted":false},"metricValue#metricWinRate":{"locked":true,"deleted":false},"metricValue#metricTrades":{"locked":false,"deleted":false},"metricValue#metricAvgR":{"x":0,"y":0,"width":148,"height":28,"locked":false,"deleted":false},"metricValue#metricPf":{"locked":false,"deleted":false},"metricValue#metricDd":{"locked":false,"deleted":false},"logPanel[0]":{"x":-164,"y":-376,"width":1583,"height":562,"locked":false,"deleted":false},"logTitleBlock[0]":{"x":4,"y":-16,"width":174,"height":40,"locked":false,"deleted":false},"logEyebrow[0]":{"locked":false,"deleted":false},"logTitle[0]":{"x":-13,"y":-5,"width":174,"height":30,"locked":false,"deleted":false},"tableWrap[0]":{"locked":false,"deleted":false},"tradeTable[0]":{"locked":false,"deleted":false},"tradeTableHeader[0]":{"locked":false,"deleted":false},"tradeTableHeader[1]":{"locked":false,"deleted":false},"tradeTableHeader[2]":{"locked":false,"deleted":false},"tradeTableHeader[3]":{"locked":false,"deleted":false},"tradeTableHeader[4]":{"locked":false,"deleted":false},"tradeTableHeader[5]":{"locked":false,"deleted":false},"tradeTableHeader[6]":{"locked":false,"deleted":false},"tradeTableHeader[7]":{"locked":false,"deleted":false},"tradeTableHeader[8]":{"locked":false,"deleted":false},"tradeTableHeader[9]":{"locked":false,"deleted":false},"tradeTableHeader[10]":{"locked":false,"deleted":false},"tradeTableHeader[11]":{"locked":false,"deleted":false},"tradeTableCell[0]":{"x":37,"y":4,"width":944,"height":467,"locked":false,"deleted":false}}};

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

  const EDITOR_STORAGE_KEY = 'nathauxfx_manual_replay_layout_editor_v4';
  const LEGACY_EDITOR_STORAGE_KEY = 'nathauxfx_manual_replay_layout_editor_v3';

  // Mirrors the editor targets so locally saved full-layout changes (including
  // text edits and deletions) also appear after the user exits edit mode.
  const editorSpecs = [
    ['header', '.topbar'],
    ['brand', '.brand'],
    ['brandMark', '.brand-mark'],
    ['brandTitle', '.brand strong'],
    ['brandSubtitle', '.brand small'],
    ['headingBlock', '.heading'],
    ['headingEyebrow', '.heading .eyebrow'],
    ['headingTitle', '.heading h1'],
    ['headingText', '.heading p'],
    ['safeBadge', '.safe-badge'],
    ['notice', '#notice'],
    ['setupPanel', '.setup-panel'],
    ['setupTitleBlock', '.setup-panel .panel-title > div:first-child'],
    ['setupEyebrow', '.setup-panel .eyebrow'],
    ['setupTitle', '.setup-panel h2'],
    ['setupNav', '.setup-panel .nav-actions'],
    ['setupNavButton', '.setup-panel .nav-actions .button', true],
    ['setupGrid', '.setup-grid'],
    ['setupField', '.setup-grid label', true],
    ['setupFieldText', '.setup-grid label > span', true],
    ['setupFieldControl', '.setup-grid input, .setup-grid select:not(.date-year-jump)', true],
    ['dateYearJump', '.setup-grid .date-year-jump', true],
    ['loadButton', '#loadBtn'],
    ['mainGrid', '.main-grid'],
    ['chartPanel', '.chart-panel'],
    ['chartToolbar', '.chart-toolbar'],
    ['chartTitleBlock', '.chart-toolbar > div:first-child'],
    ['chartEyebrow', '.chart-toolbar .eyebrow'],
    ['chartTitle', '#chartTitle'],
    ['chartMeta', '#chartMeta'],
    ['playback', '.playback'],
    ['playbackItem', '.playback > *', true],
    ['positionTools', '.position-tools'],
    ['positionTool', '.position-tools > *', true],
    ['chartWrap', '.chart-wrap'],
    ['candleStrip', '.candle-strip'],
    ['currentPrice', '#currentPrice'],
    ['currentTime', '#currentTime'],
    ['ohlc', '#ohlc'],
    ['tradePanel', '.trade-panel'],
    ['tradeEyebrow', '.trade-panel > .eyebrow'],
    ['tradeTitle', '.trade-panel > h2'],
    ['tradeIntro', '.trade-panel > p'],
    ['ticketGrid', '.ticket-grid'],
    ['ticketField', '.ticket-grid label', true],
    ['ticketFieldText', '.ticket-grid label > span', true],
    ['ticketFieldControl', '.ticket-grid input, .ticket-grid select', true],
    ['draftMetrics', '.draft-metrics'],
    ['draftMetricCard', '.draft-metrics > div', true],
    ['draftMetricLabel', '.draft-metrics > div > span', true],
    ['draftMetricValue', '.draft-metrics > div > strong', true],
    ['priceHint', '#pricePickHint'],
    ['sideButtons', '.side-buttons'],
    ['buyButton', '#buyBtn'],
    ['sellButton', '#sellBtn'],
    ['positionCard', '#positionCard'],
    ['positionHead', '#positionCard .position-head'],
    ['positionHeadItem', '#positionCard .position-head > *', true],
    ['positionRow', '#positionCard .position-row', true],
    ['positionRowItem', '#positionCard .position-row > *', true],
    ['closeButton', '#closeBtn'],
    ['resetButton', '#resetBtn'],
    ['metricGrid', '.metric-grid'],
    ['metricCard', '.metric-grid article', true],
    ['metricLabel', '.metric-grid article span', true],
    ['metricValue', '.metric-grid article strong', true],
    ['logPanel', '.log-panel'],
    ['logTitleBlock', '.log-panel .panel-title > div'],
    ['logEyebrow', '.log-panel .eyebrow'],
    ['logTitle', '.log-panel h2'],
    ['tableWrap', '.log-panel .table-wrap'],
    ['tradeTable', '.log-panel table'],
    ['tradeTableHeader', '.log-panel th', true],
    ['tradeTableCell', '.log-panel td', true],
  ];

  let editorSaved = null;
  try {
    const raw = localStorage.getItem(EDITOR_STORAGE_KEY) || localStorage.getItem(LEGACY_EDITOR_STORAGE_KEY);
    editorSaved = raw ? JSON.parse(raw) : (window.ManualReplayDefaultLayoutV4 || null);
  } catch (_error) {}

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

  function stabilizeWorkspaceSeparation() {
    if (window.innerWidth < DESKTOP_MIN_WIDTH) return;
    if (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.body.classList.contains('manual-replay-fullscreen-fallback')
    ) return;

    const setup = document.querySelector('.setup-panel');
    const workspace = document.getElementById('replayWorkspace');
    const chartPanel = document.querySelector('.chart-panel');
    const tradePanel = document.querySelector('.trade-panel');
    if (!setup || !workspace || !chartPanel) return;

    // Always measure from the normal grid gap first. Saved child transforms
    // can pull the chart upward, so a fixed 34px/66px margin is unreliable.
    const baseMargin = 14;
    workspace.style.setProperty('margin-top', `${baseMargin}px`, 'important');

    const setupRect = setup.getBoundingClientRect();
    const chartRect = chartPanel.getBoundingClientRect();
    const tradeRect = tradePanel?.getBoundingClientRect?.();
    const visibleTop = Math.min(
      chartRect.top,
      Number.isFinite(Number(tradeRect?.top)) ? tradeRect.top : chartRect.top
    );
    const desiredTop = setupRect.bottom + 8;
    const overlap = Math.max(0, Math.ceil(desiredTop - visibleTop));
    workspace.style.setProperty('margin-top', `${baseMargin + overlap}px`, 'important');
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

    // Keep the primary replay selectors above the upward-shifted chart panel.
    // Safari can otherwise hit-test the transformed chart over these selects
    // until a scroll forces a repaint.
    const setupPanel = document.querySelector('.setup-panel');
    if (setupPanel) {
      setupPanel.style.setProperty('position', 'relative', 'important');
      // Do not put the whole setup CARD above the chart. Only the actual
      // controls need hit-testing priority; a panel-level z-index made the
      // light theme visually cover the replay toolbar underneath.
      setupPanel.style.removeProperty('z-index');
      setupPanel.style.setProperty('overflow', 'visible', 'important');
    }
    for (const id of ['symbol', 'timeframe']) {
      const control = document.getElementById(id);
      if (!control) continue;
      remember(control);
      control.style.setProperty('position', 'relative', 'important');
      control.style.setProperty('z-index', '20001', 'important');
      control.style.setProperty('pointer-events', 'auto', 'important');
      control.style.setProperty('transform', 'none', 'important');
      control.style.setProperty('height', '40px', 'important');
      control.style.setProperty('min-height', '40px', 'important');
    }

    stabilizeWorkspaceSeparation();

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

  function editorTextValue(el) {
    if (!el) return null;
    const tag = String(el.tagName || '').toUpperCase();
    const simpleTags = new Set(['BUTTON', 'A', 'H1', 'H2', 'H3', 'P', 'SPAN', 'STRONG', 'SMALL', 'TH', 'TD']);
    if (!simpleTags.has(tag)) return null;
    if (tag !== 'BUTTON' && el.childElementCount > 0) return null;
    return String(el.textContent || '');
  }

  function applyEditorOverrides({ transforms = true } = {}) {
    // The editor script owns its own restoration when layoutEdit=1.
    if (new URLSearchParams(window.location.search).get('layoutEdit') === '1') return;
    const items = editorSaved?.items;
    if (!items || typeof items !== 'object') return;

    for (const [prefix, selector, all] of editorSpecs) {
      const elements = all
        ? Array.from(document.querySelectorAll(selector))
        : [document.querySelector(selector)].filter(Boolean);
      elements.forEach((el, index) => {
        const item = items[keyFor(prefix, el, index)];
        if (!item) return;

        if (item.text != null && editorTextValue(el) != null) {
          el.textContent = String(item.text);
        }

        if (item.deleted) {
          el.style.setProperty('display', 'none', 'important');
          return;
        }

        if (!transforms) return;
        const width = Number(item.width);
        const height = Number(item.height);
        const x = Number(item.x);
        const y = Number(item.y);
        if ([width, height, x, y].every(Number.isFinite)) {
          el.style.setProperty('box-sizing', 'border-box', 'important');
          el.style.setProperty('width', `${Math.round(width)}px`, 'important');
          el.style.setProperty('height', `${Math.round(height)}px`, 'important');
          el.style.setProperty('max-width', 'none', 'important');
          el.style.setProperty('min-width', '0', 'important');
          el.style.setProperty('min-height', '0', 'important');
          el.style.setProperty('transform', `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`, 'important');
        }
      });
    }
  }

  function modernTicketLayoutEnabled() {
    return Boolean(document.getElementById('positionSizingMode'));
  }

  function applySavedLayout() {
    const fullscreenActive = Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.body.classList.contains('manual-replay-fullscreen-fallback')
    );
    if (fullscreenActive || window.innerWidth < DESKTOP_MIN_WIDTH) {
      restoreAll();
      applyEditorOverrides({ transforms: false });
      return;
    }

    const modernTicket = modernTicketLayoutEnabled();
    const modernTicketPrefixes = new Set([
      'ticketField',
      'ticketFieldText',
      'ticketFieldControl',
      'draftMetrics',
      'priceHint',
      'buyButton',
      'sellButton',
      'resetButton',
    ]);

    for (const [prefix, selector, all] of specs) {
      // The old saved desktop layout predates Position Sizing + Manual Lot.
      // Replaying those index-based transforms over the expanded ticket
      // overlays Risk Method on top of Position Sizing and hides the new
      // selector. Let the modern ticket flow naturally inside the preserved
      // sidebar while keeping the rest of the user's saved desktop layout.
      if (modernTicket && modernTicketPrefixes.has(prefix)) continue;
      const elements = all
        ? Array.from(document.querySelectorAll(selector))
        : [document.querySelector(selector)].filter(Boolean);
      elements.forEach((el, index) => {
        const state = saved[keyFor(prefix, el, index)];
        if (state) applyOne(el, state, prefix);
      });
    }

    if (modernTicket) {
      const tradePanel = document.querySelector('.trade-panel');
      if (tradePanel) {
        tradePanel.style.setProperty('height', 'auto', 'important');
        tradePanel.style.setProperty('min-height', '724px', 'important');
        tradePanel.style.setProperty('overflow', 'visible', 'important');
      }
      const ticketGrid = document.querySelector('.ticket-grid');
      if (ticketGrid) {
        ticketGrid.style.setProperty('transform', 'none', 'important');
        ticketGrid.style.setProperty('height', 'auto', 'important');
      }
      const metrics = document.querySelector('.draft-metrics');
      if (metrics) {
        metrics.style.setProperty('height', 'auto', 'important');
        metrics.style.setProperty('transform', 'none', 'important');
      }
      const sizing = document.getElementById('positionSizingMode');
      if (sizing) {
        sizing.style.setProperty('display', 'block', 'important');
        sizing.style.setProperty('visibility', 'visible', 'important');
        sizing.style.setProperty('opacity', '1', 'important');
        sizing.style.setProperty('transform', 'none', 'important');
        sizing.style.setProperty('width', '100%', 'important');
        sizing.style.setProperty('height', '40px', 'important');
      }
    }

    applyEditorOverrides({ transforms: window.innerWidth >= DESKTOP_MIN_WIDTH && !fullscreenActive });
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
  document.addEventListener('fullscreenchange', applySavedLayout);
  document.addEventListener('webkitfullscreenchange', applySavedLayout);
})();