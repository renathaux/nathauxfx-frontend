(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const ROOT = '/replay-data';
  const FIVE_MINUTES = 5 * 60 * 1000;
  const MARKET_NAMES = { EURUSD:'Euro vs US Dollar', XAUUSD:'Gold vs US Dollar' };

  const state = {
    symbol:'EURUSD',
    timeframe:'5m',
    candles:[],
    index:0,
    timer:null,
    chart:null,
    series:null,
    side:'LONG',
    balance:10000,
    startBalance:10000,
    trades:[],
    openTrade:null,
    drawMode:null,
    drawStart:null,
    drawings:[],
    activeDrawer:null,
    swipeStart:null
  };

  const pipSize = symbol => symbol === 'XAUUSD' ? 0.01 : 0.0001;
  const pipValuePerLot = symbol => symbol === 'XAUUSD' ? 1 : 10;
  const digits = symbol => symbol === 'XAUUSD' ? 2 : 5;
  const fmt = value => Number.isFinite(Number(value)) ? Number(value).toFixed(digits(state.symbol)) : '—';
  const money = value => {
    const n = Number(value) || 0;
    return (n >= 0 ? '+' : '-') + '$' + Math.abs(n).toFixed(2);
  };
  const toInput = date => {
    const pad = n => String(n).padStart(2,'0');
    return date.getFullYear() + '-' + pad(date.getMonth()+1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  };

  function defaults() {
    const end = new Date();
    end.setSeconds(0,0);
    const start = new Date(end.getTime() - 7 * 86400000);
    $('startDate').value = toInput(start);
    $('endDate').value = toInput(end);
  }

  function monthKey(date) {
    return date.getUTCFullYear() + '-' + String(date.getUTCMonth()+1).padStart(2,'0');
  }

  function monthKeys(start,end) {
    const out = [];
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    while (cursor <= last) {
      out.push(monthKey(cursor));
      cursor.setUTCMonth(cursor.getUTCMonth()+1);
    }
    return out;
  }

  async function loadHistory(symbol,timeframe,start,end) {
    const manifestResponse = await fetch(ROOT + '/manifest.json', {cache:'no-cache'});
    if (!manifestResponse.ok) throw new Error('Replay history is unavailable.');
    const manifest = await manifestResponse.json();
    const available = new Set((manifest && manifest.symbols && manifest.symbols[symbol] && manifest.symbols[symbol].months) || []);
    const months = monthKeys(start, new Date(end.getTime()-1));

    for (const month of months) {
      if (!available.has(month)) throw new Error('Replay data for ' + symbol + ' ' + month + ' is unavailable.');
    }

    const payloads = await Promise.all(months.map(async month => {
      const response = await fetch(ROOT + '/' + symbol + '/' + month + '.json', {
        cache:month === monthKey(new Date()) ? 'no-cache' : 'force-cache'
      });
      if (!response.ok) throw new Error('Replay file ' + month + ' is unavailable.');
      return response.json();
    }));

    const startMs = start.getTime();
    const endMs = end.getTime();
    const byTimestamp = new Map();

    payloads.flatMap(item => item.candles || []).forEach(candle => {
      const t = Date.parse(candle.timestamp);
      const open = Number(candle.open);
      const high = Number(candle.high);
      const low = Number(candle.low);
      const close = Number(candle.close);
      if (t >= startMs && t < endMs && [open,high,low,close].every(Number.isFinite)) {
        byTimestamp.set(t,{timestamp:new Date(t).toISOString(),open,high,low,close});
      }
    });

    const base = [...byTimestamp.values()].sort((a,b) => Date.parse(a.timestamp)-Date.parse(b.timestamp));
    if (timeframe === '5m') return base;

    const minutes = timeframe === '15m' ? 15 : 60;
    const duration = minutes * 60000;
    const required = duration / FIVE_MINUTES;
    const source = new Map(base.map(candle => [Date.parse(candle.timestamp), candle]));
    const buckets = [...new Set(base.map(candle => Math.floor(Date.parse(candle.timestamp)/duration)*duration))].sort((a,b)=>a-b);
    const out = [];

    buckets.forEach(bucket => {
      const rows = [];
      for (let i=0;i<required;i+=1) {
        const candle = source.get(bucket + i*FIVE_MINUTES);
        if (!candle) {
          rows.length = 0;
          break;
        }
        rows.push(candle);
      }
      if (rows.length === required) {
        out.push({
          timestamp:new Date(bucket).toISOString(),
          open:rows[0].open,
          high:Math.max(...rows.map(row => row.high)),
          low:Math.min(...rows.map(row => row.low)),
          close:rows[rows.length-1].close
        });
      }
    });

    return out;
  }

  function ensureChart() {
    if (state.chart) return;
    state.chart = LightweightCharts.createChart($('chart'), {
      autoSize:true,
      layout:{background:{color:'#03070a'},textColor:'#98a8b6',attributionLogo:false},
      grid:{vertLines:{color:'#14232f'},horzLines:{color:'#14232f'}},
      rightPriceScale:{
        visible:false,
        borderVisible:false,
        autoScale:true,
        scaleMargins:{top:0.16,bottom:0.16}
      },
      timeScale:{
        borderColor:'#233745',
        timeVisible:true,
        secondsVisible:false,
        rightOffset:3,
        fixRightEdge:false,
        barSpacing:8,
        minBarSpacing:3
      },
      handleScroll:true,
      handleScale:true,
      crosshair:{vertLine:{color:'#5b7180',width:1,style:3},horzLine:{color:'#5b7180',width:1,style:3}}
    });
    state.series = state.chart.addCandlestickSeries({
      upColor:'#18c5ae',
      downColor:'#ff565d',
      wickUpColor:'#18c5ae',
      wickDownColor:'#ff565d',
      borderVisible:false,
      priceLineColor:'#18c5ae',
      priceLineStyle:2,
      priceLineWidth:1,
      lastValueVisible:false,
      priceLineVisible:false
    });
  }

  function current() {
    return state.candles[state.index] || null;
  }

  function visibleCandles() {
    return state.candles.slice(0,state.index+1).map(candle => ({
      time:Math.floor(Date.parse(candle.timestamp)/1000),
      open:candle.open,
      high:candle.high,
      low:candle.low,
      close:candle.close
    }));
  }

  function renderChart() {
    ensureChart();
    const rows = visibleCandles();
    state.series.setData(rows);
    if (rows.length) state.chart.timeScale().scrollToRealTime();

    const candle = current();
    if (candle) {
      $('ohlc').textContent = 'O ' + fmt(candle.open) + '   H ' + fmt(candle.high) + '   L ' + fmt(candle.low) + '   C ' + fmt(candle.close);
      $('entryPrice').value = fmt(candle.close);
      $('shortPrice').textContent = fmt(candle.close);
      $('longPrice').textContent = fmt(candle.close);
    }
    $('progress').textContent = (state.candles.length ? state.index+1 : 0) + ' / ' + state.candles.length;
  }

  function renderMetrics() {
    const completed = state.trades.length;
    const wins = state.trades.filter(trade => trade.pnl > 0).length;
    const floating = state.openTrade ? Number(state.openTrade.floating || 0) : 0;
    const equity = state.balance + floating;
    const net = state.balance - state.startBalance;
    const pct = state.candles.length ? ((state.index+1)/state.candles.length)*100 : 0;

    $('metricBalance').textContent = '$' + state.balance.toFixed(2);
    $('metricEquity').textContent = '$' + equity.toFixed(2);
    $('metricOpenPnl').textContent = money(floating);
    $('metricPnl').textContent = money(net);
    $('metricWinRate').textContent = completed ? (wins/completed*100).toFixed(0) + '%' : '—';
    $('metricWins').textContent = String(wins);
    $('metricTrades').textContent = String(completed);
    $('metricProgressPct').textContent = pct.toFixed(0) + '%';
    $('metricProgressBar').style.width = Math.max(0,Math.min(100,pct)) + '%';
    $('metricProgressText').textContent = (state.candles.length ? state.index+1 : 0) + ' / ' + state.candles.length + ' candles';
  }

  function renderHistory() {
    const host = $('tradeHistoryList');
    if (!state.trades.length) {
      host.innerHTML = '<p class="empty-history">No completed trades yet.</p>';
      return;
    }

    host.innerHTML = state.trades.slice().reverse().map(trade => {
      const pip = pipSize(trade.symbol);
      const direction = trade.side === 'LONG' ? 1 : -1;
      const pips = ((trade.exit-trade.entry)*direction)/pip;
      const sideClass = trade.side === 'LONG' ? 'side-long' : 'side-short';
      const pnlClass = trade.pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
      const time = new Date(trade.closedAt).toLocaleString([], {month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'});
      return '<article class="history-item">' +
        '<div class="row"><strong>' + trade.symbol + ' <span class="' + sideClass + '">' + trade.side + ' ' + trade.lot.toFixed(2) + '</span></strong><strong class="' + pnlClass + '">' + money(trade.pnl) + '</strong></div>' +
        '<small>' + fmtFor(trade.symbol,trade.entry) + ' → ' + fmtFor(trade.symbol,trade.exit) + ' · ' + (pips>=0?'+':'') + pips.toFixed(1) + ' pips</small>' +
        '<small>' + time + '</small>' +
      '</article>';
    }).join('');
  }

  function fmtFor(symbol,value) {
    const d = symbol === 'XAUUSD' ? 2 : 5;
    return Number(value).toFixed(d);
  }

  function renderOpenTrade() {
    const trade = state.openTrade;
    $('openTradeCard').classList.toggle('hidden',!trade);
    if (!trade) return;
    $('openTradeSide').textContent = trade.side;
    $('openTradeSide').className = trade.side === 'LONG' ? 'side-long' : 'side-short';
    $('openTradeEntry').textContent = fmt(trade.entry);
    $('openTradeLevels').textContent = fmt(trade.sl) + ' / ' + fmt(trade.tp);
    $('openTradePnl').textContent = money(trade.floating || 0);
  }

  function renderAll() {
    renderChart();
    updateOpenTrade(current());
    renderOpenTrade();
    renderMetrics();
    renderHistory();
    updateDraft();
    renderDrawings();
  }

  function setPlaying(on) {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
    $('playBtn').textContent = on ? 'Ⅱ' : '▶';
    if (on) {
      state.timer = setInterval(() => {
        if (state.index >= state.candles.length-1) {
          setPlaying(false);
          return;
        }
        step(1);
      },Math.max(70,900/Number($('speed').value || 1)));
    }
  }

  function step(delta) {
    if (!state.candles.length) return;
    state.index = Math.max(0,Math.min(state.candles.length-1,state.index+delta));
    renderAll();
  }

  async function loadReplay() {
    setPlaying(false);
    closeDrawers();
    $('status').classList.remove('hidden');
    $('status').textContent = 'Loading replay…';

    try {
      state.symbol = $('symbol').value;
      state.timeframe = $('timeframe').value;
      state.startBalance = Math.max(1,Number($('startingBalance').value) || 10000);
      state.balance = state.startBalance;
      state.trades = [];
      state.openTrade = null;
      state.drawings = [];

      const start = new Date($('startDate').value);
      const end = new Date($('endDate').value);
      if (!(start < end)) throw new Error('Choose a valid start and end date.');

      state.candles = await loadHistory(state.symbol,state.timeframe,start,end);
      if (state.candles.length < 2) throw new Error('Not enough candles in this replay range.');

      state.index = Math.min(180,state.candles.length-1);
      $('chartSymbol').value = state.symbol;
      $('chartTf').value = state.timeframe;
      syncMarketHeader();
      $('status').classList.add('hidden');
      renderAll();
    } catch (error) {
      $('status').textContent = error.message || 'Replay failed to load.';
    }
  }

  function syncMarketHeader() {
    $('marketName').textContent = MARKET_NAMES[state.symbol] || state.symbol;
    $('symbol').value = state.symbol;
    $('timeframe').value = state.timeframe;
  }

  function manualLot() {
    return Math.max(0.01,Number($('lotSize').value || $('quickLot').value) || 0.10);
  }

  function syncLot(value) {
    const normalized = Math.max(0.01,Math.round((Number(value) || 0.10)*100)/100);
    $('lotSize').value = normalized.toFixed(2);
    $('quickLot').value = normalized.toFixed(2);
    updateDraft();
  }

  function draftFor(side) {
    const candle = current();
    if (!candle) return null;
    const entry = Number(candle.close);
    const sl = Number($('slPrice').value);
    const tp = Number($('tpPrice').value);
    const lot = manualLot();

    if (![entry,sl,tp,lot].every(Number.isFinite) || sl <= 0 || tp <= 0 || lot <= 0) return null;

    const valid = side === 'LONG' ? (sl < entry && tp > entry) : (sl > entry && tp < entry);
    if (!valid) return null;

    const pip = pipSize(state.symbol);
    const pipValue = pipValuePerLot(state.symbol) * lot;
    const slPips = Math.abs(entry-sl)/pip;
    const tpPips = Math.abs(tp-entry)/pip;
    const risk = slPips * pipValue;
    const reward = tpPips * pipValue;
    const rr = risk > 0 ? reward/risk : 0;

    return {side,entry,sl,tp,lot,risk,reward,rr,slPips,tpPips};
  }

  function updateDraft() {
    const draft = draftFor(state.side);
    $('draftRisk').textContent = draft ? '$' + draft.risk.toFixed(2) : '—';
    $('draftReward').textContent = draft ? '$' + draft.reward.toFixed(2) : '—';
    $('draftRr').textContent = draft ? '1:' + draft.rr.toFixed(2) : '—';
    $('draftSlPips').textContent = draft ? draft.slPips.toFixed(1) : '—';
  }

  function setSide(side) {
    state.side = side;
    $('ticketLong').classList.toggle('active',side === 'LONG');
    $('ticketShort').classList.toggle('active',side === 'SHORT');
    updateDraft();
  }

  function openTrade(side) {
    if (state.openTrade) {
      alert('Close the current replay trade first.');
      return false;
    }

    setSide(side);
    const draft = draftFor(side);
    if (!draft) {
      openTradeDrawer(side);
      return false;
    }

    state.openTrade = Object.assign({},draft,{
      symbol:state.symbol,
      openedAt:current().timestamp,
      openedIndex:state.index,
      floating:0
    });
    renderOpenTrade();
    renderMetrics();
    closeDrawers();
    return true;
  }

  function updateOpenTrade(candle) {
    const trade = state.openTrade;
    if (!trade || !candle) return;

    const direction = trade.side === 'LONG' ? 1 : -1;
    const pip = pipSize(trade.symbol);
    const pipValue = pipValuePerLot(trade.symbol) * trade.lot;
    trade.floating = ((candle.close-trade.entry)*direction/pip)*pipValue;

    let exit = null;
    if (trade.side === 'LONG') {
      if (candle.low <= trade.sl) exit = trade.sl;
      else if (candle.high >= trade.tp) exit = trade.tp;
    } else {
      if (candle.high >= trade.sl) exit = trade.sl;
      else if (candle.low <= trade.tp) exit = trade.tp;
    }

    if (exit !== null) closeTradeAt(exit,candle.timestamp);
  }

  function closeTradeAt(price,time) {
    const trade = state.openTrade;
    if (!trade) return;

    const direction = trade.side === 'LONG' ? 1 : -1;
    const pip = pipSize(trade.symbol);
    const pipValue = pipValuePerLot(trade.symbol) * trade.lot;
    const pnl = ((price-trade.entry)*direction/pip)*pipValue;

    state.balance += pnl;
    state.trades.push(Object.assign({},trade,{exit:price,closedAt:time,pnl}));
    state.openTrade = null;
    renderOpenTrade();
    renderMetrics();
    renderHistory();
  }

  function closeTradeNow() {
    const candle = current();
    if (candle) closeTradeAt(candle.close,candle.timestamp);
  }

  function openTradeDrawer(side) {
    if (side) setSide(side);
    openDrawer('trade');
  }

  function setInfoMode(mode) {
    const settings = mode === 'settings';
    $('settingsPanel').classList.toggle('hidden',!settings);
    $('metricsPanel').classList.toggle('hidden',settings);
    $('historyPanel').classList.toggle('hidden',settings);

    if (settings) {
      $('infoDrawerTitle').textContent = 'Replay Settings';
    } else {
      $('infoDrawerTitle').textContent = 'Account & Analytics';
    }
  }

  function openInfoDrawer(mode='metrics') {
    setInfoMode(mode);
    openDrawer('info');
    requestAnimationFrame(() => {
      if (mode === 'history') $('historyPanel').scrollIntoView({block:'start'});
      else $('infoDrawer').scrollTop = 0;
    });
  }

  function openDrawer(which) {
    closeDrawers(false);
    state.activeDrawer = which;
    const drawer = which === 'trade' ? $('tradeDrawer') : $('infoDrawer');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden','false');
    $('drawerBackdrop').classList.remove('hidden');
    document.body.classList.add('drawer-open');
  }

  function closeDrawers(clear=true) {
    [$('tradeDrawer'),$('infoDrawer')].forEach(drawer => {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden','true');
    });
    $('drawerBackdrop').classList.add('hidden');
    document.body.classList.remove('drawer-open');
    if (clear) state.activeDrawer = null;
  }

  function toggleTools() {
    $('toolPalette').classList.toggle('hidden');
  }

  function toggleFullscreen() {
    document.body.classList.toggle('stream-fullscreen');
    requestAnimationFrame(() => state.chart && state.chart.resize($('chart').clientWidth,$('chart').clientHeight));
  }

  function chartPoint(event) {
    const rect = $('chart').getBoundingClientRect();
    return {x:event.clientX-rect.left,y:event.clientY-rect.top};
  }

  function renderDrawings() {
    const svg = $('drawingSvg');
    if (!svg) return;
    svg.innerHTML = state.drawings.map(drawing => {
      if (drawing.type === 'rect') {
        const x = Math.min(drawing.a.x,drawing.b.x);
        const y = Math.min(drawing.a.y,drawing.b.y);
        return '<rect class="drawing-rect" x="' + x + '" y="' + y + '" width="' + Math.abs(drawing.b.x-drawing.a.x) + '" height="' + Math.abs(drawing.b.y-drawing.a.y) + '"/>';
      }
      const klass = drawing.type === 'measure' ? 'drawing-measure' : 'drawing-line';
      return '<line class="' + klass + '" x1="' + drawing.a.x + '" y1="' + drawing.a.y + '" x2="' + drawing.b.x + '" y2="' + drawing.b.y + '"/>';
    }).join('');
  }

  function setDrawMode(mode) {
    state.drawMode = mode;
    state.drawStart = null;
    [['cursorBtn',null],['lineBtn','line'],['rectBtn','rect'],['measureBtn','measure']].forEach(([id,value]) => {
      $(id).classList.toggle('active',value === mode);
    });
    if (state.chart) {
      state.chart.applyOptions({handleScroll:!mode,handleScale:!mode});
    }
  }

  function bindDrawing() {
    $('chart').addEventListener('pointerdown',event => {
      if (!state.drawMode) return;
      state.drawStart = chartPoint(event);
    });
    $('chart').addEventListener('pointerup',event => {
      if (!state.drawMode || !state.drawStart) return;
      state.drawings.push({type:state.drawMode,a:state.drawStart,b:chartPoint(event)});
      state.drawStart = null;
      renderDrawings();
    });
  }

  function bindSwipes() {
    document.addEventListener('touchstart',event => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      state.swipeStart = {x:touch.clientX,y:touch.clientY};
    },{passive:true});

    document.addEventListener('touchend',event => {
      if (!state.swipeStart || !event.changedTouches.length) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX-state.swipeStart.x;
      const dy = touch.clientY-state.swipeStart.y;
      const startX = state.swipeStart.x;
      state.swipeStart = null;

      if (Math.abs(dx) < 55 || Math.abs(dx) <= Math.abs(dy)*1.25) return;

      if (state.activeDrawer === 'trade' && dx < -55) {
        closeDrawers();
        return;
      }
      if (state.activeDrawer === 'info' && dx > 55) {
        closeDrawers();
        return;
      }
      if (state.activeDrawer) return;

      if (startX <= 38 && dx > 55) openTradeDrawer(state.side);
      else if (startX >= window.innerWidth-38 && dx < -55) openInfoDrawer('metrics');
    },{passive:true});
  }

  function clearHistory() {
    if (state.openTrade) {
      alert('Close the open replay trade before clearing history.');
      return;
    }
    state.trades = [];
    state.balance = state.startBalance;
    renderMetrics();
    renderHistory();
  }

  function syncNav(active) {
    [['navReplay','replay'],['navHistory','history'],['navMetrics','metrics'],['navSettings','settings']].forEach(([id,key]) => {
      $(id).classList.toggle('active',key === active);
    });
  }

  defaults();
  ensureChart();
  bindDrawing();
  bindSwipes();
  syncLot(0.10);

  $('leftDrawerBtn').onclick = () => openTradeDrawer(state.side);
  $('leftEdgeHandle').onclick = () => openTradeDrawer(state.side);
  $('rightEdgeHandle').onclick = () => openInfoDrawer('metrics');
  $('closeTradeDrawer').onclick = () => closeDrawers();
  $('closeInfoDrawer').onclick = () => closeDrawers();
  $('drawerBackdrop').onclick = () => closeDrawers();

  $('toolsBtn').onclick = toggleTools;
  $('fullscreenBtn').onclick = toggleFullscreen;
  $('prevBtn').onclick = () => step(-1);
  $('nextBtn').onclick = () => step(1);
  $('playBtn').onclick = () => setPlaying(!state.timer);
  $('speed').onchange = () => { if (state.timer) setPlaying(true); };

  $('quickShort').onclick = () => openTrade('SHORT');
  $('quickLong').onclick = () => openTrade('LONG');
  $('ticketLong').onclick = () => setSide('LONG');
  $('ticketShort').onclick = () => setSide('SHORT');
  $('openLongBtn').onclick = () => openTrade('LONG');
  $('openShortBtn').onclick = () => openTrade('SHORT');
  $('closeTradeBtn').onclick = closeTradeNow;

  $('lotMinus').onclick = () => syncLot(manualLot()-0.01);
  $('lotPlus').onclick = () => syncLot(manualLot()+0.01);
  $('quickLot').addEventListener('input',() => syncLot($('quickLot').value));
  $('lotSize').addEventListener('input',() => syncLot($('lotSize').value));
  $('slPrice').addEventListener('input',updateDraft);
  $('tpPrice').addEventListener('input',updateDraft);

  $('cursorBtn').onclick = () => setDrawMode(null);
  $('lineBtn').onclick = () => setDrawMode('line');
  $('rectBtn').onclick = () => setDrawMode('rect');
  $('measureBtn').onclick = () => setDrawMode('measure');
  $('clearDrawingsBtn').onclick = () => { state.drawings=[]; renderDrawings(); };

  $('chartSymbol').onchange = () => {
    state.symbol = $('chartSymbol').value;
    $('symbol').value = state.symbol;
    loadReplay();
  };
  $('chartTf').onchange = () => {
    state.timeframe = $('chartTf').value;
    $('timeframe').value = state.timeframe;
    loadReplay();
  };
  $('symbol').onchange = () => { state.symbol=$('symbol').value; $('chartSymbol').value=state.symbol; syncMarketHeader(); };
  $('timeframe').onchange = () => { state.timeframe=$('timeframe').value; $('chartTf').value=state.timeframe; };
  $('loadBtn').onclick = loadReplay;

  $('navReplay').onclick = () => { closeDrawers(); syncNav('replay'); };
  $('navHistory').onclick = () => { openInfoDrawer('history'); syncNav('history'); };
  $('navMetrics').onclick = () => { openInfoDrawer('metrics'); syncNav('metrics'); };
  $('navSettings').onclick = () => { openInfoDrawer('settings'); syncNav('settings'); };
  $('clearHistoryBtn').onclick = clearHistory;

  window.addEventListener('keydown',event => {
    if (event.key !== 'Escape') return;
    if (state.activeDrawer) closeDrawers();
    else if (!document.body.classList.contains('stream-fullscreen')) return;
    else toggleFullscreen();
  });

  loadReplay();
})();