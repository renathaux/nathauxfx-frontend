(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const ROOT = '/replay-data';
  const FIVE_MINUTES = 5 * 60 * 1000;
  const MARKET_NAMES = { EURUSD:'Euro vs US Dollar', XAUUSD:'Gold vs US Dollar' };

  let replayManifestCache = null;
  const replayMonthCache = new Map();
  let candleCalendarMonthKey = null;
  let candleCalendarSelectedDay = null;
  let candleCalendarDayRows = [];
  let candleCalendarActivePoint = 'from';
  let candleCalendarFromTs = null;
  let candleCalendarToTs = null;

  const state = {
    symbol:'EURUSD',
    timeframe:'5m',
    candles:[],
    index:0,
    timer:null,
    chart:null,
    series:null,
    side:'LONG',
    sizingMode:'AUTO_RISK',
    balance:10000,
    startBalance:10000,
    trades:[],
    openTrade:null,
    openTradeEditing:false,
    positionDraft:null,
    positionDrag:null,
    positionDragPointerId:null,
    pricePanOffset:0,
    pricePanGesture:null,
    pricePanPointerId:null,
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

  async function loadReplayManifest() {
    if (replayManifestCache) return replayManifestCache;
    const response = await fetch(ROOT + '/manifest.json', {cache:'no-cache'});
    if (!response.ok) throw new Error('Replay history is unavailable.');
    replayManifestCache = await response.json();
    return replayManifestCache;
  }

  async function loadReplayMonth(symbol,month) {
    const cacheKey = symbol + ':' + month;
    if (replayMonthCache.has(cacheKey)) return replayMonthCache.get(cacheKey);
    const response = await fetch(ROOT + '/' + symbol + '/' + month + '.json', {
      cache:month === monthKey(new Date()) ? 'no-cache' : 'force-cache'
    });
    if (!response.ok) throw new Error('Replay file ' + month + ' is unavailable.');
    const payload = await response.json();
    replayMonthCache.set(cacheKey,payload);
    return payload;
  }

  async function loadHistory(symbol,timeframe,start,end,options={}) {
    const manifest = await loadReplayManifest();
    const available = new Set((manifest && manifest.symbols && manifest.symbols[symbol] && manifest.symbols[symbol].months) || []);
    const requestedMonths = monthKeys(start, new Date(end.getTime()-1));
    const allowPartial = Boolean(options && options.allowPartial);
    const missing = requestedMonths.filter(month => !available.has(month));
    if (missing.length && !allowPartial) {
      throw new Error('Replay data for ' + symbol + ' ' + missing[0] + ' is unavailable.');
    }
    const months = requestedMonths.filter(month => available.has(month));
    if (!months.length) throw new Error('No downloaded candles are available for this date.');

    const payloads = await Promise.all(months.map(month => loadReplayMonth(symbol,month)));

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

  let overlayRenderFrame = null;

  function scheduleOverlayRender() {
    if (overlayRenderFrame != null) return;
    overlayRenderFrame = requestAnimationFrame(() => {
      overlayRenderFrame = null;
      renderDrawings();
    });
  }

  function autoScaleInfoProvider(original) {
    const info = original();
    if (!info || !info.priceRange) return info;
    const offset = Number(state.pricePanOffset) || 0;
    if (!offset) return info;
    return {
      ...info,
      priceRange:{
        minValue:Number(info.priceRange.minValue) + offset,
        maxValue:Number(info.priceRange.maxValue) + offset
      }
    };
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
      priceLineVisible:false,
      autoscaleInfoProvider:autoScaleInfoProvider
    });
    state.chart.timeScale().subscribeVisibleLogicalRangeChange(() => scheduleOverlayRender());
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
      const position = state.positionDraft || state.openTrade;
      $('entryPrice').value = fmt(position ? position.entry : candle.close);
      $('shortPrice').textContent = state.positionDraft?.side === 'SHORT' ? 'SELL' : fmt(candle.close);
      $('longPrice').textContent = state.positionDraft?.side === 'LONG' ? 'BUY' : fmt(candle.close);
    }
    $('progress').textContent = (state.candles.length ? state.index+1 : 0) + ' / ' + state.candles.length;
    state.series.applyOptions({autoscaleInfoProvider:autoScaleInfoProvider});
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
    syncPositionDraftToCurrent();
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
      state.openTradeEditing = false;
      state.positionDraft = null;
      state.positionDrag = null;
      state.positionDragPointerId = null;
      state.pricePanOffset = 0;
      state.pricePanGesture = null;
      state.pricePanPointerId = null;
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
    if (state.sizingMode === 'MANUAL_LOT') $('quickLot').value = normalized.toFixed(2);
    updateDraft();
  }

  function riskTargetDollars() {
    const value = Number($('riskValue').value);
    if (!Number.isFinite(value) || value <= 0) return null;
    return $('riskMethod').value === 'FIXED' ? value : state.balance * value / 100;
  }

  function setSizingMode(mode) {
    state.sizingMode = mode === 'MANUAL_LOT' ? 'MANUAL_LOT' : 'AUTO_RISK';
    const manual = state.sizingMode === 'MANUAL_LOT';
    $('autoRiskMode').classList.toggle('active',!manual);
    $('manualLotMode').classList.toggle('active',manual);
    $('autoRiskFields').classList.toggle('hidden',manual);
    $('manualLotField').classList.toggle('hidden',!manual);
    $('quickLotLabel').textContent = manual ? 'MANUAL LOT' : 'AUTO LOT';
    $('quickLot').readOnly = !manual;
    $('lotMinus').disabled = !manual;
    $('lotPlus').disabled = !manual;
    if (manual) $('quickLot').value = manualLot().toFixed(2);
    updateDraft();
  }

  function minimumPriceDistance() {
    return state.symbol === 'XAUUSD' ? 0.01 : 0.0001;
  }

  function createPositionDraft(side) {
    if (state.openTrade) {
      alert('Close the current replay trade first.');
      return false;
    }
    const candle = current();
    if (!candle) return false;

    const normalizedSide = side === 'SHORT' ? 'SHORT' : 'LONG';
    const rows = state.candles.slice(Math.max(0,state.index-119),state.index+1);
    const lows = rows.map(row => Number(row.low)).filter(Number.isFinite);
    const highs = rows.map(row => Number(row.high)).filter(Number.isFinite);
    const entry = Number(candle.close);
    const low = lows.length ? Math.min(...lows) : entry;
    const high = highs.length ? Math.max(...highs) : entry;
    const range = Math.max(high-low,minimumPriceDistance()*10);
    const distance = Math.max(range*0.075,minimumPriceDistance()*4);

    state.side = normalizedSide;
    state.positionDraft = normalizedSide === 'LONG'
      ? {side:'LONG',entry,sl:entry-distance,tp:entry+distance*2,entryIndex:state.index,entryTime:candle.timestamp}
      : {side:'SHORT',entry,sl:entry+distance,tp:entry-distance*2,entryIndex:state.index,entryTime:candle.timestamp};

    $('entryPrice').value = fmt(entry);
    $('slPrice').value = fmt(state.positionDraft.sl);
    $('tpPrice').value = fmt(state.positionDraft.tp);
    updateDraft();
    renderDrawings();
    return true;
  }

  function syncPositionDraftToCurrent() {
    const draft = state.positionDraft;
    const candle = current();
    if (!draft || !candle || state.openTrade) return false;

    const nextEntry = Number(candle.close);
    if (!Number.isFinite(nextEntry)) return false;
    const oldEntry = Number(draft.entry);
    const delta = nextEntry - oldEntry;
    if (!Number.isFinite(delta)) return false;

    if (Math.abs(delta) > 0) {
      draft.entry = nextEntry;
      draft.sl = Number(draft.sl) + delta;
      draft.tp = Number(draft.tp) + delta;
    }
    draft.entryIndex = state.index;
    draft.entryTime = candle.timestamp;

    $('entryPrice').value = fmt(draft.entry);
    $('slPrice').value = fmt(draft.sl);
    $('tpPrice').value = fmt(draft.tp);
    return true;
  }

  function setPositionLevel(field,rawValue) {
    if (!['sl','tp'].includes(field)) return false;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return false;

    const gap = minimumPriceDistance();

    if (state.positionDraft) {
      const draft = state.positionDraft;
      const entry = Number(draft.entry);
      let next = value;
      if (field === 'sl') {
        next = draft.side === 'LONG' ? Math.min(value,entry-gap) : Math.max(value,entry+gap);
      } else {
        next = draft.side === 'LONG' ? Math.max(value,entry+gap) : Math.min(value,entry-gap);
      }
      draft[field] = next;
      $(field === 'sl' ? 'slPrice' : 'tpPrice').value = fmt(next);
      updateDraft();
      renderDrawings();
      return true;
    }

    if (state.openTrade && state.openTradeEditing) {
      const trade = state.openTrade;
      const market = Number(current()?.close);
      if (!Number.isFinite(market)) return false;
      let next = value;
      if (field === 'sl') {
        next = trade.side === 'LONG' ? Math.min(value,market-gap) : Math.max(value,market+gap);
      } else {
        next = trade.side === 'LONG' ? Math.max(value,market+gap) : Math.min(value,market-gap);
      }
      trade[field] = next;
      $(field === 'sl' ? 'slPrice' : 'tpPrice').value = fmt(next);
      renderOpenTrade();
      renderDrawings();
      return true;
    }

    return false;
  }

  function setDraftLevel(field,rawValue) {
    return setPositionLevel(field,rawValue);
  }

  function draftFor(side) {
    const position = state.positionDraft;
    if (!position || position.side !== side) return null;

    const entry = Number(position.entry);
    const sl = Number(position.sl);
    const tp = Number(position.tp);
    if (![entry,sl,tp].every(Number.isFinite) || sl <= 0 || tp <= 0) return null;

    const valid = side === 'LONG' ? (sl < entry && tp > entry) : (sl > entry && tp < entry);
    if (!valid) return null;

    const pip = pipSize(state.symbol);
    const perLot = pipValuePerLot(state.symbol);
    const slPips = Math.abs(entry-sl)/pip;
    const tpPips = Math.abs(tp-entry)/pip;
    if (!Number.isFinite(slPips) || slPips <= 0 || !Number.isFinite(tpPips)) return null;

    let lot;
    let risk;
    if (state.sizingMode === 'MANUAL_LOT') {
      lot = manualLot();
      risk = slPips * perLot * lot;
    } else {
      risk = riskTargetDollars();
      if (!Number.isFinite(risk) || risk <= 0) return null;
      lot = risk / (slPips * perLot);
    }

    if (!Number.isFinite(lot) || lot <= 0) return null;

    const reward = tpPips * perLot * lot;
    const rr = risk > 0 ? reward/risk : 0;

    return {
      side,entry,sl,tp,lot,risk,reward,rr,slPips,tpPips,
      sizingMode:state.sizingMode,
      riskMethod:$('riskMethod').value,
      riskValue:Number($('riskValue').value)
    };
  }

  function updateQuickEntryButtons() {
    const draft = state.positionDraft;
    const metrics = draft ? draftFor(draft.side) : null;
    const shortArmed = Boolean(draft && draft.side === 'SHORT');
    const longArmed = Boolean(draft && draft.side === 'LONG');

    if (shortArmed) {
      $('quickShortLabel').textContent = metrics
        ? metrics.slPips.toFixed(1) + ' pips • $' + metrics.risk.toFixed(2) + ' risk'
        : 'TAP TO ENTER';
      $('shortPrice').textContent = 'SELL';
    } else {
      $('quickShortLabel').textContent = 'SHORT POSITION';
      $('shortPrice').textContent = current() ? fmt(current().close) : '—';
    }

    if (longArmed) {
      $('quickLongLabel').textContent = metrics
        ? metrics.slPips.toFixed(1) + ' pips • $' + metrics.risk.toFixed(2) + ' risk'
        : 'TAP TO ENTER';
      $('longPrice').textContent = 'BUY';
    } else {
      $('quickLongLabel').textContent = 'LONG POSITION';
      $('longPrice').textContent = current() ? fmt(current().close) : '—';
    }

    $('quickShort').classList.toggle('selected',shortArmed);
    $('quickLong').classList.toggle('selected',longArmed);

    if (draft) $('ticketDirection').textContent = draft.side + ' DRAFT';
    else if (state.openTrade) $('ticketDirection').textContent = state.openTrade.side + ' ACTIVE';
    else $('ticketDirection').textContent = 'No draft';
  }

  function updateDraft() {
    const draft = draftFor(state.side);
    $('draftLot').textContent = draft ? draft.lot.toFixed(2) : '—';
    $('draftRisk').textContent = draft ? '$' + draft.risk.toFixed(2) : '—';
    $('draftReward').textContent = draft ? '$' + draft.reward.toFixed(2) : '—';
    $('draftRr').textContent = draft ? '1:' + draft.rr.toFixed(2) : '—';
    $('draftSlPips').textContent = draft ? draft.slPips.toFixed(1) : '—';
    $('draftTpPips').textContent = draft ? draft.tpPips.toFixed(1) : '—';

    const manual = state.sizingMode === 'MANUAL_LOT';
    $('quickLotLabel').textContent = manual ? 'MANUAL LOT' : 'AUTO LOT';
    $('quickLot').readOnly = !manual;
    $('lotMinus').disabled = !manual;
    $('lotPlus').disabled = !manual;
    if (manual) {
      $('quickLot').value = manualLot().toFixed(2);
    } else {
      $('quickLot').value = draft && Number.isFinite(draft.lot) ? draft.lot.toFixed(2) : '';
    }
    updateQuickEntryButtons();
  }

  function setSide(side) {
    state.side = side === 'SHORT' ? 'SHORT' : 'LONG';
    updateDraft();
  }

  function handleQuickPosition(side) {
    const normalizedSide = side === 'SHORT' ? 'SHORT' : 'LONG';
    if (state.openTrade) {
      alert('Close the current replay trade first.');
      return false;
    }
    if (state.positionDraft && state.positionDraft.side === normalizedSide) {
      return openTrade(normalizedSide);
    }
    return createPositionDraft(normalizedSide);
  }

  function openTrade(side) {
    if (state.openTrade) {
      alert('Close the current replay trade first.');
      return false;
    }

    syncPositionDraftToCurrent();
    const draft = draftFor(side);
    const candle = current();
    if (!draft || !candle) return false;

    state.openTrade = Object.assign({},draft,{
      symbol:state.symbol,
      openedAt:candle.timestamp,
      openedIndex:state.index,
      floating:0
    });
    state.openTradeEditing = false;
    state.positionDraft = null;
    state.positionDrag = null;
    state.positionDragPointerId = null;
    renderOpenTrade();
    renderMetrics();
    updateDraft();
    renderDrawings();
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
    state.openTradeEditing = false;
    renderOpenTrade();
    renderMetrics();
    renderHistory();
    updateDraft();
    renderDrawings();
  }

  function closeTradeNow() {
    const candle = current();
    if (candle) closeTradeAt(candle.close,candle.timestamp);
  }

  function openTradeDrawer() {
    if (state.openTrade) syncActiveTradeEditorFields();
    else updateQuickEntryButtons();
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

  function localDateKey(date) {
    const pad = value => String(value).padStart(2,'0');
    return date.getFullYear() + '-' + pad(date.getMonth()+1) + '-' + pad(date.getDate());
  }

  function calendarMonthLabel(monthIndex) {
    return new Intl.DateTimeFormat(undefined,{month:'long'}).format(new Date(2024,monthIndex,1));
  }

  function calendarAvailableMonths() {
    const manifest = replayManifestCache;
    return ((manifest && manifest.symbols && manifest.symbols[state.symbol] && manifest.symbols[state.symbol].months) || [])
      .map(String)
      .sort();
  }

  function setCalendarStatus(message,kind='') {
    const node = $('candleCalendarStatus');
    node.textContent = message || '';
    node.className = 'calendar-status' + (kind ? ' ' + kind : '');
  }

  function formatCalendarPoint(timestamp) {
    if (!timestamp) return 'Choose candle';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Choose candle';
    return new Intl.DateTimeFormat(undefined,{
      month:'short',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'
    }).format(date);
  }

  function refreshCalendarRangeCards() {
    $('calendarFromValue').textContent = formatCalendarPoint(candleCalendarFromTs);
    $('calendarToValue').textContent = formatCalendarPoint(candleCalendarToTs);
    $('calendarFromPick').classList.toggle('active',candleCalendarActivePoint === 'from');
    $('calendarToPick').classList.toggle('active',candleCalendarActivePoint === 'to');

    const fromMs = Date.parse(candleCalendarFromTs || '');
    const toMs = Date.parse(candleCalendarToTs || '');
    const valid = Number.isFinite(fromMs) && Number.isFinite(toMs) && fromMs < toMs;
    $('jumpToCandleBtn').disabled = !valid;
    if (!valid && candleCalendarFromTs && candleCalendarToTs) {
      setCalendarStatus('TO must be after FROM.','error');
    }
  }

  function commitActiveCalendarPoint(timestamp) {
    if (!timestamp) return;
    if (candleCalendarActivePoint === 'to') candleCalendarToTs = timestamp;
    else candleCalendarFromTs = timestamp;
    refreshCalendarRangeCards();
  }

  function timeframeDurationMs() {
    if (state.timeframe === '1h') return 60*60*1000;
    if (state.timeframe === '15m') return 15*60*1000;
    return 5*60*1000;
  }

  async function activateCalendarPoint(which) {
    candleCalendarActivePoint = which === 'to' ? 'to' : 'from';
    refreshCalendarRangeCards();
    const timestamp = candleCalendarActivePoint === 'to' ? candleCalendarToTs : candleCalendarFromTs;
    if (!timestamp) return;
    const date = new Date(timestamp);
    const key = monthKey(date);
    populateCalendarYearMonthControls(key);
    await renderCandleCalendarMonth(date.getDate(),timestamp);
  }

  function calendarMonthParts(key) {
    const match = String(key || '').match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;
    return {year:Number(match[1]),month:Number(match[2])-1};
  }

  function populateCalendarYearMonthControls(targetKey) {
    const months = calendarAvailableMonths();
    if (!months.length) throw new Error('No downloaded candle history is available for ' + state.symbol + '.');

    const years = [...new Set(months.map(key => key.slice(0,4)))].sort();
    const yearSelect = $('candleCalendarYear');
    yearSelect.replaceChildren(...years.map(value => new Option(value,value)));

    let key = months.includes(targetKey) ? targetKey : months[months.length-1];
    const targetYear = key.slice(0,4);
    yearSelect.value = targetYear;

    const monthSelect = $('candleCalendarMonth');
    const monthsForYear = months.filter(value => value.startsWith(targetYear + '-'));
    monthSelect.replaceChildren(...monthsForYear.map(value => {
      const monthIndex = Number(value.slice(5,7))-1;
      return new Option(calendarMonthLabel(monthIndex),value);
    }));
    monthSelect.value = key;
    candleCalendarMonthKey = key;
    updateCalendarNavigationButtons();
  }

  function updateCalendarMonthOptionsForYear(preferredKey=null) {
    const year = $('candleCalendarYear').value;
    const months = calendarAvailableMonths().filter(value => value.startsWith(year + '-'));
    const monthSelect = $('candleCalendarMonth');
    monthSelect.replaceChildren(...months.map(value => {
      const monthIndex = Number(value.slice(5,7))-1;
      return new Option(calendarMonthLabel(monthIndex),value);
    }));
    const nextKey = months.includes(preferredKey) ? preferredKey : (months[0] || null);
    if (nextKey) monthSelect.value = nextKey;
    candleCalendarMonthKey = nextKey;
    updateCalendarNavigationButtons();
  }

  function updateCalendarNavigationButtons() {
    const months = calendarAvailableMonths();
    const index = months.indexOf(candleCalendarMonthKey);
    $('candleCalendarPrevious').disabled = index <= 0;
    $('candleCalendarNext').disabled = index < 0 || index >= months.length-1;
  }

  async function calendarRowsForMonth(key) {
    const available = new Set(calendarAvailableMonths());
    const parts = calendarMonthParts(key);
    if (!parts) return [];
    const keys = [];
    for (const delta of [-1,0,1]) {
      const d = new Date(Date.UTC(parts.year,parts.month+delta,1));
      const candidate = monthKey(d);
      if (available.has(candidate)) keys.push(candidate);
    }
    const payloads = await Promise.all(keys.map(k => loadReplayMonth(state.symbol,k)));
    return payloads.flatMap(payload => Array.isArray(payload && payload.candles) ? payload.candles : []);
  }

  async function populateCalendarTimes(year,month,day,preferredTimestamp=null) {
    const select = $('candleJumpTime');
    const jump = $('jumpToCandleBtn');
    select.replaceChildren();
    select.disabled = true;
    jump.disabled = true;
    candleCalendarDayRows = [];
    setCalendarStatus('Loading actual ' + state.timeframe.toUpperCase() + ' candles…');

    const dayStart = new Date(year,month,day,0,0,0,0);
    const dayEnd = new Date(year,month,day+1,0,0,0,0);
    try {
      const rows = await loadHistory(state.symbol,state.timeframe,dayStart,dayEnd,{allowPartial:true});
      candleCalendarDayRows = rows;
      if (!rows.length) throw new Error('No candles for this day.');

      const formatter = new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit'});
      select.replaceChildren(...rows.map(candle => {
        const date = new Date(candle.timestamp);
        return new Option(formatter.format(date),candle.timestamp);
      }));

      if (preferredTimestamp) {
        const preferredMs = Date.parse(preferredTimestamp);
        let best = rows[0];
        let bestDiff = Math.abs(Date.parse(best.timestamp)-preferredMs);
        for (const row of rows) {
          const diff = Math.abs(Date.parse(row.timestamp)-preferredMs);
          if (diff < bestDiff) { best=row; bestDiff=diff; }
        }
        select.value = best.timestamp;
      }

      select.disabled = false;
      commitActiveCalendarPoint(select.value);
      const label = new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(dayStart);
      setCalendarStatus(rows.length + ' actual ' + state.timeframe.toUpperCase() + ' candles available on ' + label + '.','success');
      refreshCalendarRangeCards();
    } catch (error) {
      select.replaceChildren(new Option('No candles available',''));
      setCalendarStatus(error.message || 'No candles are available for this day.','error');
    }
  }

  async function renderCandleCalendarMonth(preferredDay=null,preferredTimestamp=null) {
    const key = candleCalendarMonthKey;
    const parts = calendarMonthParts(key);
    if (!parts) return;
    const grid = $('candleCalendarDays');
    grid.replaceChildren();
    $('candleJumpTime').replaceChildren();
    $('candleJumpTime').disabled = true;
    $('jumpToCandleBtn').disabled = true;
    setCalendarStatus('Loading candle dates…');

    try {
      const rows = await calendarRowsForMonth(key);
      const daysWithData = new Set();
      for (const candle of rows) {
        const date = new Date(candle && candle.timestamp);
        if (Number.isNaN(date.getTime())) continue;
        if (date.getFullYear() === parts.year && date.getMonth() === parts.month) {
          daysWithData.add(date.getDate());
        }
      }

      const daysInMonth = new Date(parts.year,parts.month+1,0).getDate();
      const firstWeekday = new Date(parts.year,parts.month,1).getDay();
      for (let offset=0;offset<firstWeekday;offset+=1) grid.appendChild(document.createElement('span'));

      const requested = Number(preferredDay);
      let selected = daysWithData.has(requested) ? requested : null;
      if (selected == null && daysWithData.size) selected = [...daysWithData].sort((a,b)=>a-b)[0];
      candleCalendarSelectedDay = selected;

      for (let day=1;day<=daysInMonth;day+=1) {
        const button = document.createElement('button');
        const available = daysWithData.has(day);
        button.type = 'button';
        button.textContent = String(day);
        button.disabled = !available;
        button.classList.toggle('available',available);
        button.dataset.day = String(day);
        button.setAttribute('aria-pressed',String(day === selected));
        if (available) {
          button.addEventListener('click',async () => {
            candleCalendarSelectedDay = day;
            for (const item of grid.querySelectorAll('button')) {
              item.setAttribute('aria-pressed',String(Number(item.dataset.day)===day));
            }
            await populateCalendarTimes(parts.year,parts.month,day,null);
          });
        }
        grid.appendChild(button);
      }

      if (selected != null) {
        await populateCalendarTimes(parts.year,parts.month,selected,preferredTimestamp);
      } else {
        setCalendarStatus('No downloaded candles are available in this month.','error');
      }
    } catch (error) {
      setCalendarStatus(error.message || 'Could not load candle dates.','error');
    }
  }

  async function openCandleJump() {
    if (!state.candles.length) return;
    setPlaying(false);
    $('candleJumpBackdrop').classList.remove('hidden');
    $('candleJumpPanel').classList.remove('hidden');
    setCalendarStatus('Loading candle history…');

    try {
      await loadReplayManifest();
      candleCalendarFromTs = state.candles[0]?.timestamp || null;
      candleCalendarToTs = state.candles[state.candles.length-1]?.timestamp || null;
      candleCalendarActivePoint = 'from';
      refreshCalendarRangeCards();

      const anchor = new Date(candleCalendarFromTs || current()?.timestamp);
      const anchorKey = monthKey(anchor);
      populateCalendarYearMonthControls(anchorKey);
      await renderCandleCalendarMonth(anchor.getDate(),candleCalendarFromTs);
    } catch (error) {
      setCalendarStatus(error.message || 'Could not load candle history.','error');
    }
  }

  function closeCandleJump() {
    $('candleJumpBackdrop').classList.add('hidden');
    $('candleJumpPanel').classList.add('hidden');
  }

  function nearestCandleIndex(targetMs) {
    if (!state.candles.length || !Number.isFinite(targetMs)) return -1;
    let low = 0;
    let high = state.candles.length - 1;
    while (low <= high) {
      const mid = Math.floor((low+high)/2);
      const time = Date.parse(state.candles[mid].timestamp);
      if (time === targetMs) return mid;
      if (time < targetMs) low = mid+1;
      else high = mid-1;
    }
    if (low >= state.candles.length) return state.candles.length-1;
    if (high < 0) return 0;
    return Math.abs(Date.parse(state.candles[low].timestamp)-targetMs) <
      Math.abs(Date.parse(state.candles[high].timestamp)-targetMs) ? low : high;
  }

  async function jumpToSelectedCandle() {
    const fromMs = Date.parse(candleCalendarFromTs || '');
    const toMs = Date.parse(candleCalendarToTs || '');
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) {
      setCalendarStatus('Choose a valid FROM and TO candle.','error');
      return;
    }
    if (state.openTrade) {
      setCalendarStatus('Close the open trade before loading another replay range.','error');
      return;
    }

    try {
      setCalendarStatus('Loading the selected replay range…');
      const start = new Date(fromMs);
      const endExclusive = new Date(toMs + timeframeDurationMs());
      const candles = await loadHistory(state.symbol,state.timeframe,start,endExclusive,{allowPartial:false});
      if (candles.length < 2) throw new Error('The selected range needs at least two candles.');

      state.candles = candles;
      state.index = 0;
      state.trades = [];
      state.balance = state.startBalance;
      state.openTrade = null;
      state.openTradeEditing = false;
      state.positionDraft = null;
      state.positionDrag = null;
      state.positionDragPointerId = null;
      state.pricePanOffset = 0;
      state.drawings = [];
      $('startDate').value = toInput(start);
      $('endDate').value = toInput(endExclusive);
      renderAll();
      state.chart.timeScale().scrollToRealTime();
      closeCandleJump();
    } catch (error) {
      setCalendarStatus(error.message || 'Could not load the selected replay range.','error');
    }
  }

  async function moveCandleCalendarMonth(delta) {
    const months = calendarAvailableMonths();
    const index = months.indexOf(candleCalendarMonthKey);
    const next = months[index+delta];
    if (!next) return;
    candleCalendarMonthKey = next;
    const year = next.slice(0,4);
    $('candleCalendarYear').value = year;
    updateCalendarMonthOptionsForYear(next);
    $('candleCalendarMonth').value = next;
    candleCalendarMonthKey = next;
    updateCalendarNavigationButtons();
    await renderCandleCalendarMonth(null,null);
  }

  function chartPoint(event) {
    const rect = $('chart').getBoundingClientRect();
    return {x:event.clientX-rect.left,y:event.clientY-rect.top};
  }

  function positionDisplayMetrics(position) {
    if (!position) return null;
    if (state.positionDraft === position) return draftFor(position.side);

    const pip = pipSize(state.symbol);
    const perLot = pipValuePerLot(state.symbol);
    const lot = Number(position.lot);
    const entry = Number(position.entry);
    const sl = Number(position.sl);
    const tp = Number(position.tp);
    if (![lot,entry,sl,tp].every(Number.isFinite) || lot <= 0) return null;

    const slPips = Math.abs(entry-sl)/pip;
    const tpPips = Math.abs(tp-entry)/pip;
    const risk = slPips*perLot*lot;
    const reward = tpPips*perLot*lot;
    return {slPips,tpPips,risk,reward,lot};
  }

  function positionOverlaySvg(position,editable) {
    if (!position || !state.series) return '';
    const entryY = state.series.priceToCoordinate(Number(position.entry));
    const slY = state.series.priceToCoordinate(Number(position.sl));
    const tpY = state.series.priceToCoordinate(Number(position.tp));
    if (![entryY,slY,tpY].every(Number.isFinite)) return '';

    const width = $('chart').clientWidth || 320;
    const entryTime = position.entryTime || position.openedAt;
    const entrySeconds = entryTime ? Math.floor(Date.parse(entryTime)/1000) : null;
    const candleX = entrySeconds && state.chart?.timeScale ? state.chart.timeScale().timeToCoordinate(entrySeconds) : null;
    const fallbackX = Math.round(width*0.52);
    const baseX = Number.isFinite(Number(candleX)) ? Number(candleX) : fallbackX;
    const cardWidth = Math.max(150,Math.min(250,width*0.42));
    const startX = Math.max(12,Math.min(width-cardWidth-12,baseX-22));
    const endX = Math.min(width-12,startX+cardWidth);
    const minY = Math.min(entryY,slY,tpY);
    const maxY = Math.max(entryY,slY,tpY);

    const rect = (a,b,klass) => '<rect class="position-zone ' + klass + '" x="' + startX + '" y="' + Math.min(a,b) + '" width="' + (endX-startX) + '" height="' + Math.abs(b-a) + '" rx="2"/>';
    const line = (field,value,y,klass) => {
      const hit = editable && (field === 'sl' || field === 'tp')
        ? '<line class="position-hit-line" data-position-handle="' + field + '" x1="' + startX + '" y1="' + y + '" x2="' + endX + '" y2="' + y + '"/>' +
          '<circle class="position-handle ' + klass + '" data-position-handle="' + field + '" cx="' + (endX-10) + '" cy="' + y + '" r="9"/>'
        : '';
      return '<line class="position-line ' + klass + '" x1="' + startX + '" y1="' + y + '" x2="' + endX + '" y2="' + y + '"/>' +
        hit +
        '<text class="position-price-label ' + klass + '" x="' + (endX-14) + '" y="' + Math.max(12,y-5) + '" text-anchor="end">' + field.toUpperCase() + ' ' + fmt(value) + '</text>';
    };

    const metrics = positionDisplayMetrics(position);
    const riskText = metrics && Number.isFinite(Number(metrics.slPips)) && Number.isFinite(Number(metrics.risk))
      ? metrics.slPips.toFixed(1) + ' pips  -$' + metrics.risk.toFixed(2)
      : '';
    const rewardText = metrics && Number.isFinite(Number(metrics.tpPips)) && Number.isFinite(Number(metrics.reward))
      ? metrics.tpPips.toFixed(1) + ' pips  +$' + metrics.reward.toFixed(2)
      : '';
    const riskMid = (entryY+slY)/2;
    const rewardMid = (entryY+tpY)/2;
    const editingClass = state.openTrade === position && state.openTradeEditing ? ' editing' : '';
    const modeClass = state.positionDraft === position ? 'draft' : 'active';

    return '<g class="position-overlay ' + modeClass + editingClass + '">' +
      '<rect class="position-card-hit" data-position-card="1" x="' + startX + '" y="' + minY + '" width="' + (endX-startX) + '" height="' + Math.max(20,maxY-minY) + '"/>' +
      rect(entryY,tpY,'profit-zone') +
      rect(entryY,slY,'risk-zone') +
      line('entry',position.entry,entryY,'entry') +
      line('sl',position.sl,slY,'sl') +
      line('tp',position.tp,tpY,'tp') +
      (riskText ? '<text class="position-info risk" x="' + (startX+8) + '" y="' + Math.max(14,riskMid+4) + '">' + riskText + '</text>' : '') +
      (rewardText ? '<text class="position-info reward" x="' + (startX+8) + '" y="' + Math.max(14,rewardMid+4) + '">' + rewardText + '</text>' : '') +
    '</g>';
  }

  function renderDrawings() {
    const svg = $('drawingSvg');
    if (!svg) return;
    const drawings = state.drawings.map(drawing => {
      if (drawing.type === 'rect') {
        const x = Math.min(drawing.a.x,drawing.b.x);
        const y = Math.min(drawing.a.y,drawing.b.y);
        return '<rect class="drawing-rect" x="' + x + '" y="' + y + '" width="' + Math.abs(drawing.b.x-drawing.a.x) + '" height="' + Math.abs(drawing.b.y-drawing.a.y) + '"/>';
      }
      const klass = drawing.type === 'measure' ? 'drawing-measure' : 'drawing-line';
      return '<line class="' + klass + '" x1="' + drawing.a.x + '" y1="' + drawing.a.y + '" x2="' + drawing.b.x + '" y2="' + drawing.b.y + '"/>';
    }).join('');
    const position = state.positionDraft || state.openTrade;
    const editable = Boolean(state.positionDraft || (state.openTrade && state.openTradeEditing));
    svg.innerHTML = drawings + positionOverlaySvg(position,editable);
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

  function syncActiveTradeEditorFields() {
    const trade = state.openTrade;
    if (!trade) return;
    $('entryPrice').value = fmt(trade.entry);
    $('slPrice').value = fmt(trade.sl);
    $('tpPrice').value = fmt(trade.tp);
    $('ticketDirection').textContent = trade.side + (state.openTradeEditing ? ' ACTIVE • EDITING' : ' ACTIVE');
  }

  function bindPositionDrag() {
    const svg = $('drawingSvg');
    svg.addEventListener('pointerdown',event => {
      const target = event.target;
      const field = target && target.getAttribute ? target.getAttribute('data-position-handle') : null;
      const card = target && target.getAttribute ? target.getAttribute('data-position-card') : null;

      if (card && state.openTrade && !state.positionDraft) {
        setPlaying(false);
        state.openTradeEditing = true;
        syncActiveTradeEditorFields();
        renderDrawings();
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const canEdit = Boolean(state.positionDraft || (state.openTrade && state.openTradeEditing));
      if (!canEdit || !['sl','tp'].includes(field)) return;
      state.positionDrag = field;
      state.positionDragPointerId = event.pointerId;
      event.preventDefault();
      event.stopPropagation();
    });

    window.addEventListener('pointermove',event => {
      const canEdit = Boolean(state.positionDraft || (state.openTrade && state.openTradeEditing));
      if (!state.positionDrag || event.pointerId !== state.positionDragPointerId || !canEdit) return;
      const rect = $('chart').getBoundingClientRect();
      const y = Math.max(0,Math.min(rect.height,event.clientY-rect.top));
      const next = state.series && state.series.coordinateToPrice ? state.series.coordinateToPrice(y) : null;
      if (Number.isFinite(Number(next))) setPositionLevel(state.positionDrag,Number(next));
      event.preventDefault();
    },{passive:false});

    const finish = event => {
      if (!state.positionDrag) return;
      if (event && state.positionDragPointerId != null && event.pointerId !== state.positionDragPointerId) return;
      state.positionDrag = null;
      state.positionDragPointerId = null;
    };
    window.addEventListener('pointerup',finish);
    window.addEventListener('pointercancel',finish);
  }

  function visiblePriceSpan() {
    const rows = visibleCandles();
    if (!rows.length) return minimumPriceDistance()*100;
    const highs = rows.map(row => Number(row.high)).filter(Number.isFinite);
    const lows = rows.map(row => Number(row.low)).filter(Number.isFinite);
    if (!highs.length || !lows.length) return minimumPriceDistance()*100;
    const raw = Math.max(...highs)-Math.min(...lows);
    return Math.max(raw*1.25,minimumPriceDistance()*100);
  }

  function bindChartVerticalPan() {
    const stage = $('chart').parentElement;
    if (!stage) return;

    stage.addEventListener('pointerdown',event => {
      if (state.drawMode || state.positionDrag) return;
      if (event.target && event.target.getAttribute && event.target.getAttribute('data-position-handle')) return;
      state.pricePanGesture = {
        startX:event.clientX,
        startY:event.clientY,
        startOffset:Number(state.pricePanOffset)||0,
        span:visiblePriceSpan(),
        active:false
      };
      state.pricePanPointerId = event.pointerId;
    },true);

    stage.addEventListener('pointermove',event => {
      const gesture = state.pricePanGesture;
      if (!gesture || event.pointerId !== state.pricePanPointerId || state.positionDrag) return;
      const dx = event.clientX-gesture.startX;
      const dy = event.clientY-gesture.startY;

      if (!gesture.active) {
        if (Math.hypot(dx,dy) < 12) return;
        if (Math.abs(dy) <= Math.abs(dx)*1.4) {
          state.pricePanGesture = null;
          state.pricePanPointerId = null;
          return;
        }
        gesture.active = true;
        stage.setPointerCapture?.(event.pointerId);
      }

      const h = Math.max($('chart').clientHeight,1);
      state.pricePanOffset = gesture.startOffset + (dy/h)*gesture.span*0.18;
      state.series.applyOptions({autoscaleInfoProvider:autoScaleInfoProvider});
      scheduleOverlayRender();
      event.preventDefault();
      event.stopPropagation();
    },{capture:true,passive:false});

    const finish = event => {
      if (!state.pricePanGesture) return;
      if (state.pricePanPointerId != null && event.pointerId !== state.pricePanPointerId) return;
      state.pricePanGesture = null;
      state.pricePanPointerId = null;
    };
    stage.addEventListener('pointerup',finish,true);
    stage.addEventListener('pointercancel',finish,true);
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

      if (startX <= 38 && dx > 55) openTradeDrawer();
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
  bindPositionDrag();
  bindChartVerticalPan();
  bindSwipes();
  syncLot(0.10);
  setSizingMode('AUTO_RISK');

  $('leftDrawerBtn').onclick = () => openTradeDrawer();
  $('leftEdgeHandle').onclick = () => openTradeDrawer();
  $('rightEdgeHandle').onclick = () => openInfoDrawer('metrics');
  $('closeTradeDrawer').onclick = () => closeDrawers();
  $('closeInfoDrawer').onclick = () => closeDrawers();
  $('drawerBackdrop').onclick = () => closeDrawers();
  $('closeCandleJump').onclick = closeCandleJump;
  $('candleJumpBackdrop').onclick = closeCandleJump;
  $('jumpToCandleBtn').onclick = jumpToSelectedCandle;
  $('calendarFromPick').onclick = () => activateCalendarPoint('from');
  $('calendarToPick').onclick = () => activateCalendarPoint('to');
  $('candleJumpTime').onchange = () => commitActiveCalendarPoint($('candleJumpTime').value);
  $('candleCalendarPrevious').onclick = () => moveCandleCalendarMonth(-1);
  $('candleCalendarNext').onclick = () => moveCandleCalendarMonth(1);
  $('candleCalendarYear').onchange = async () => {
    updateCalendarMonthOptionsForYear();
    await renderCandleCalendarMonth(null,null);
  };
  $('candleCalendarMonth').onchange = async () => {
    candleCalendarMonthKey = $('candleCalendarMonth').value;
    updateCalendarNavigationButtons();
    await renderCandleCalendarMonth(null,null);
  };

  $('toolsBtn').onclick = toggleTools;
  $('calendarBtn').onclick = openCandleJump;
  $('prevBtn').onclick = () => step(-1);
  $('nextBtn').onclick = () => step(1);
  $('playBtn').onclick = () => setPlaying(!state.timer);
  $('speed').onchange = () => { if (state.timer) setPlaying(true); };

  $('quickShort').onclick = () => handleQuickPosition('SHORT');
  $('quickLong').onclick = () => handleQuickPosition('LONG');
  $('autoRiskMode').onclick = () => setSizingMode('AUTO_RISK');
  $('manualLotMode').onclick = () => setSizingMode('MANUAL_LOT');
  $('closeTradeBtn').onclick = closeTradeNow;

  $('lotMinus').onclick = () => syncLot(manualLot()-0.01);
  $('lotPlus').onclick = () => syncLot(manualLot()+0.01);
  $('quickLot').addEventListener('input',() => {
    if (state.sizingMode === 'MANUAL_LOT') syncLot($('quickLot').value);
  });
  $('lotSize').addEventListener('input',() => syncLot($('lotSize').value));
  $('riskMethod').addEventListener('change',updateDraft);
  $('riskValue').addEventListener('input',updateDraft);
  $('slPrice').addEventListener('input',() => setDraftLevel('sl',$('slPrice').value));
  $('tpPrice').addEventListener('input',() => setDraftLevel('tp',$('tpPrice').value));

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
    if (!$('candleJumpPanel').classList.contains('hidden')) closeCandleJump();
    else if (state.activeDrawer) closeDrawers();
    else if (state.positionDraft) {
      state.positionDraft = null;
      updateDraft();
      renderDrawings();
    }
  });

  loadReplay();
})();