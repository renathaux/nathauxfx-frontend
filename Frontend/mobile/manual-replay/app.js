(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = {
    symbol:'EURUSD', timeframe:'5m', candles:[], index:0, timer:null,
    chart:null, series:null, side:'LONG', balance:10000, startBalance:10000,
    trades:[], openTrade:null, drawMode:null, drawStart:null, drawings:[]
  };
  const FIVE = 5 * 60 * 1000;
  const ROOT = '/replay-data';

  const pipSize = symbol => symbol === 'XAUUSD' ? 0.01 : 0.0001;
  const digits = symbol => symbol === 'XAUUSD' ? 2 : 5;
  const fmt = n => Number.isFinite(Number(n)) ? Number(n).toFixed(digits(state.symbol)) : '—';
  const money = n => (Number(n) >= 0 ? '+' : '-') + '$' + Math.abs(Number(n) || 0).toFixed(2);
  const toInput = d => {
    const p = n => String(n).padStart(2,'0');
    return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  };

  function defaults() {
    const end = new Date();
    end.setSeconds(0,0);
    const start = new Date(end.getTime() - 7 * 86400000);
    $('startDate').value = toInput(start);
    $('endDate').value = toInput(end);
  }

  function monthKey(d) {
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth()+1).padStart(2,'0');
  }

  function monthKeys(start,end) {
    const out = [];
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    while (d <= last) {
      out.push(monthKey(d));
      d.setUTCMonth(d.getUTCMonth()+1);
    }
    return out;
  }

  async function loadHistory(symbol, tf, start, end) {
    const manifestResponse = await fetch(ROOT + '/manifest.json', {cache:'no-cache'});
    if (!manifestResponse.ok) throw new Error('Replay manifest unavailable');
    const manifest = await manifestResponse.json();
    const available = new Set((manifest && manifest.symbols && manifest.symbols[symbol] && manifest.symbols[symbol].months) || []);
    const months = monthKeys(start, new Date(end.getTime()-1));
    months.forEach(m => {
      if (!available.has(m)) throw new Error('Replay data for ' + symbol + ' ' + m + ' is unavailable.');
    });

    const payloads = await Promise.all(months.map(async m => {
      const response = await fetch(ROOT + '/' + symbol + '/' + m + '.json', {cache:m === monthKey(new Date()) ? 'no-cache' : 'force-cache'});
      if (!response.ok) throw new Error('Replay file ' + m + ' unavailable');
      return response.json();
    }));

    const s = start.getTime(), e = end.getTime(), map = new Map();
    payloads.flatMap(x => x.candles || []).forEach(c => {
      const t = Date.parse(c.timestamp), o = +c.open, h = +c.high, l = +c.low, cl = +c.close;
      if (t >= s && t < e && [o,h,l,cl].every(Number.isFinite)) {
        map.set(t, {timestamp:new Date(t).toISOString(), open:o, high:h, low:l, close:cl});
      }
    });

    const base = [...map.values()].sort((a,b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    if (tf === '5m') return base;

    const mins = tf === '15m' ? 15 : 60;
    const duration = mins * 60000;
    const need = duration / FIVE;
    const source = new Map(base.map(c => [Date.parse(c.timestamp), c]));
    const buckets = [...new Set(base.map(c => Math.floor(Date.parse(c.timestamp) / duration) * duration))].sort((a,b) => a-b);
    const out = [];

    buckets.forEach(bucket => {
      const rows = [];
      for (let i=0;i<need;i+=1) {
        const c = source.get(bucket + i * FIVE);
        if (!c) { rows.length = 0; break; }
        rows.push(c);
      }
      if (rows.length === need) {
        out.push({
          timestamp:new Date(bucket).toISOString(),
          open:rows[0].open,
          high:Math.max(...rows.map(x => x.high)),
          low:Math.min(...rows.map(x => x.low)),
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
      layout:{background:{color:'#ffffff'},textColor:'#536d94',attributionLogo:false},
      grid:{vertLines:{color:'#edf2f8'},horzLines:{color:'#edf2f8'}},
      rightPriceScale:{borderColor:'#d9e3f1',scaleMargins:{top:.12,bottom:.16}},
      timeScale:{borderColor:'#d9e3f1',timeVisible:true,secondsVisible:false,rightOffset:6,barSpacing:8,minBarSpacing:3},
      handleScroll:true,
      handleScale:true
    });
    state.series = state.chart.addCandlestickSeries({
      upColor:'#1ab7a1', downColor:'#ff5458',
      wickUpColor:'#1ab7a1', wickDownColor:'#ff5458',
      borderVisible:false, priceLineVisible:true
    });
  }

  function visibleCandles() {
    return state.candles.slice(0,state.index+1).map(c => ({
      time:Math.floor(Date.parse(c.timestamp)/1000),
      open:c.open, high:c.high, low:c.low, close:c.close
    }));
  }

  function current() {
    return state.candles[state.index] || null;
  }

  function render() {
    ensureChart();
    const rows = visibleCandles();
    state.series.setData(rows);
    if (rows.length) state.chart.timeScale().scrollToRealTime();

    const c = current();
    if (c) {
      $('ohlc').textContent = 'O ' + fmt(c.open) + '  H ' + fmt(c.high) + '  L ' + fmt(c.low) + '  C ' + fmt(c.close);
      $('currentPrice').textContent = fmt(c.close);
      $('currentTime').textContent = new Date(c.timestamp).toLocaleString();
      $('entryPrice').value = fmt(c.close);
    }
    $('progress').textContent = (state.candles.length ? state.index+1 : 0) + ' / ' + state.candles.length;
    updateTrade(c);
    renderMetrics();
    updateDraft();
    renderDrawings();
  }

  function renderMetrics() {
    const wins = state.trades.filter(t => t.pnl > 0).length;
    const total = state.trades.length;
    $('metricBalance').textContent = '$' + state.balance.toFixed(2);
    $('metricPnl').textContent = money(state.balance - state.startBalance);
    $('metricTrades').textContent = String(total);
    $('metricWinRate').textContent = total ? (wins/total*100).toFixed(0) + '%' : '—';
  }

  function step(delta) {
    if (!state.candles.length) return;
    state.index = Math.max(0, Math.min(state.candles.length-1, state.index + delta));
    render();
  }

  function setPlaying(on) {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
    $('playBtn').textContent = on ? 'Ⅱ Pause' : '▶ Play';
    if (on) {
      state.timer = setInterval(() => {
        if (state.index >= state.candles.length-1) {
          setPlaying(false);
          return;
        }
        step(1);
      }, Math.max(80, 900 / Number($('speed').value || 1)));
    }
  }

  async function loadReplay() {
    setPlaying(false);
    $('status').classList.remove('hidden');
    $('status').textContent = 'Loading replay…';
    try {
      state.symbol = $('symbol').value;
      state.timeframe = $('timeframe').value;
      state.startBalance = Math.max(1, +$('startingBalance').value || 10000);
      state.balance = state.startBalance;
      state.trades = [];
      state.openTrade = null;
      const start = new Date($('startDate').value);
      const end = new Date($('endDate').value);
      if (!(start < end)) throw new Error('Choose a valid start and end date.');
      state.candles = await loadHistory(state.symbol, state.timeframe, start, end);
      if (state.candles.length < 2) throw new Error('Not enough candles in this range.');
      state.index = Math.min(180, state.candles.length-1);
      $('chartSymbol').value = state.symbol;
      $('chartTf').value = state.timeframe;
      syncSetupSummary();
      $('status').classList.add('hidden');
      render();
    } catch (e) {
      $('status').textContent = e.message || 'Replay failed to load.';
    }
  }

  function syncSetupSummary() {
    $('setupSummaryText').textContent = $('symbol').value + ' · ' + $('timeframe').value + ' · $' + Number($('startingBalance').value || 0).toLocaleString();
  }

  function openTicket(side) {
    state.side = side;
    syncSide();
    $('ticketSheet').classList.remove('hidden');
    $('ticketSheet').setAttribute('aria-hidden','false');
    $('backdrop').classList.remove('hidden');
    $('ticketHandle').setAttribute('aria-expanded','true');
    updateDraft();
  }

  function closeTicket() {
    $('ticketSheet').classList.add('hidden');
    $('ticketSheet').setAttribute('aria-hidden','true');
    $('backdrop').classList.add('hidden');
    $('ticketHandle').setAttribute('aria-expanded','false');
  }

  function syncSide() {
    const long = state.side === 'LONG';
    $('ticketLong').classList.toggle('active', long);
    $('ticketShort').classList.toggle('active', !long);
  }

  function riskDollars() {
    return $('riskMethod').value === 'PERCENT'
      ? state.balance * (Math.max(0, +$('riskValue').value || 0) / 100)
      : Math.max(0, +$('riskValue').value || 0);
  }

  function draft() {
    const e = +(current() && current().close);
    const sl = +$('slPrice').value;
    const tp = +$('tpPrice').value;
    if (![e,sl,tp].every(Number.isFinite) || !e || !sl || !tp) return null;

    const riskDistance = Math.abs(e-sl);
    const rewardDistance = Math.abs(tp-e);
    if (!riskDistance || !rewardDistance) return null;

    const valid = state.side === 'LONG' ? (sl < e && tp > e) : (sl > e && tp < e);
    if (!valid) return null;

    const pip = pipSize(state.symbol);
    const risk = riskDollars();
    const slPips = riskDistance / pip;
    let lot = $('sizingMode').value === 'LOT'
      ? Math.max(.01, +$('lotSize').value || .01)
      : risk / (slPips * (state.symbol === 'XAUUSD' ? 1 : 10));

    if (!Number.isFinite(lot) || lot <= 0) lot = .01;
    const rr = rewardDistance / riskDistance;
    return {entry:e, sl:sl, tp:tp, risk:risk, reward:risk*rr, rr:rr, lot:lot, side:state.side};
  }

  function updateDraft() {
    const d = draft();
    $('lotField').classList.toggle('hidden', $('sizingMode').value !== 'LOT');
    $('draftRisk').textContent = d ? money(-d.risk) : '—';
    $('draftReward').textContent = d ? money(d.reward) : '—';
    $('draftRr').textContent = d ? '1:' + d.rr.toFixed(2) : '—';
    $('draftLot').textContent = d ? d.lot.toFixed(2) : '—';
  }

  function openTrade(side) {
    state.side = side;
    syncSide();
    if (state.openTrade) {
      alert('Close the current replay trade first.');
      return;
    }
    const d = draft();
    if (!d) {
      alert('Set a valid SL and TP for this direction.');
      return;
    }
    state.openTrade = Object.assign({}, d, {
      openedAt:current().timestamp,
      openedIndex:state.index,
      floating:0
    });
    renderOpenTrade();
    closeTicket();
  }

  function updateTrade(c) {
    if (!state.openTrade || !c) return;
    const t = state.openTrade;
    const direction = t.side === 'LONG' ? 1 : -1;
    const move = (c.close - t.entry) * direction;
    const unit = t.risk / Math.abs(t.entry - t.sl);
    t.floating = move * unit;

    let exit = null;
    if (t.side === 'LONG') {
      if (c.low <= t.sl) exit = t.sl;
      else if (c.high >= t.tp) exit = t.tp;
    } else {
      if (c.high >= t.sl) exit = t.sl;
      else if (c.low <= t.tp) exit = t.tp;
    }

    if (exit !== null) closeTradeAt(exit, c.timestamp);
    else renderOpenTrade();
  }

  function closeTradeAt(price,time) {
    const t = state.openTrade;
    if (!t) return;
    const direction = t.side === 'LONG' ? 1 : -1;
    const pnl = (price - t.entry) * direction * (t.risk / Math.abs(t.entry - t.sl));
    state.balance += pnl;
    state.trades.push(Object.assign({}, t, {exit:price, closedAt:time, pnl:pnl}));
    state.openTrade = null;
    renderOpenTrade();
    renderMetrics();
  }

  function closeTradeNow() {
    const c = current();
    if (c) closeTradeAt(c.close, c.timestamp);
  }

  function renderOpenTrade() {
    const t = state.openTrade;
    $('openTradeCard').classList.toggle('hidden', !t);
    if (!t) return;
    $('openTradeSide').textContent = t.side;
    $('openTradeEntry').textContent = fmt(t.entry);
    $('openTradeLevels').textContent = fmt(t.sl) + ' / ' + fmt(t.tp);
    $('openTradePnl').textContent = money(t.floating || 0);
  }

  function toggleSetup() {
    const card = $('setupCard');
    card.classList.toggle('collapsed');
    $('setupToggle').setAttribute('aria-expanded', String(!card.classList.contains('collapsed')));
  }

  function toggleFullscreen() {
    document.body.classList.toggle('stream-fullscreen');
    setTimeout(() => {
      if (state.chart) state.chart.resize($('chart').clientWidth, $('chart').clientHeight);
    }, 30);
  }

  function chartPoint(event) {
    const rect = $('chart').getBoundingClientRect();
    return {x:event.clientX-rect.left, y:event.clientY-rect.top};
  }

  function renderDrawings() {
    const svg = $('drawingSvg');
    if (!svg) return;
    svg.innerHTML = state.drawings.map(d => {
      if (d.type === 'rect') {
        const x = Math.min(d.a.x,d.b.x), y = Math.min(d.a.y,d.b.y);
        return '<rect class="drawing-rect" x="' + x + '" y="' + y + '" width="' + Math.abs(d.b.x-d.a.x) + '" height="' + Math.abs(d.b.y-d.a.y) + '"/>';
      }
      const klass = d.type === 'measure' ? 'drawing-measure' : 'drawing-line';
      return '<line class="' + klass + '" x1="' + d.a.x + '" y1="' + d.a.y + '" x2="' + d.b.x + '" y2="' + d.b.y + '"/>';
    }).join('');
  }

  function setDrawMode(mode) {
    state.drawMode = mode;
    state.drawStart = null;
    [['cursorBtn',null],['lineBtn','line'],['rectBtn','rect'],['measureBtn','measure']].forEach(pair => {
      $(pair[0]).classList.toggle('active', pair[1] === mode);
    });
  }

  function bindDrawing() {
    $('chart').addEventListener('pointerdown', event => {
      if (!state.drawMode) return;
      state.drawStart = chartPoint(event);
    });
    $('chart').addEventListener('pointerup', event => {
      if (!state.drawMode || !state.drawStart) return;
      state.drawings.push({type:state.drawMode, a:state.drawStart, b:chartPoint(event)});
      state.drawStart = null;
      renderDrawings();
    });
  }

  defaults();
  ensureChart();
  bindDrawing();
  syncSetupSummary();

  $('setupToggle').onclick = toggleSetup;
  $('setupBtn').onclick = () => {
    $('setupCard').classList.remove('collapsed');
    $('setupToggle').setAttribute('aria-expanded','true');
    $('setupCard').scrollIntoView({behavior:'smooth'});
  };
  $('loadBtn').onclick = loadReplay;
  $('prevBtn').onclick = () => step(-1);
  $('nextBtn').onclick = () => step(1);
  $('playBtn').onclick = () => setPlaying(!state.timer);
  $('speed').onchange = () => { if (state.timer) setPlaying(true); };

  $('ticketHandle').onclick = () => openTicket(state.side);
  $('quickLong').onclick = () => openTicket('LONG');
  $('quickShort').onclick = () => openTicket('SHORT');
  $('closeTicket').onclick = closeTicket;
  $('backdrop').onclick = closeTicket;
  $('ticketLong').onclick = () => { state.side='LONG'; syncSide(); updateDraft(); };
  $('ticketShort').onclick = () => { state.side='SHORT'; syncSide(); updateDraft(); };

  ['riskValue','slPrice','tpPrice','lotSize','riskMethod','sizingMode'].forEach(id => {
    $(id).addEventListener('input', updateDraft);
    $(id).addEventListener('change', updateDraft);
  });

  $('openLongBtn').onclick = () => openTrade('LONG');
  $('openShortBtn').onclick = () => openTrade('SHORT');
  $('closeTradeBtn').onclick = closeTradeNow;
  $('fullscreenBtn').onclick = toggleFullscreen;

  $('cursorBtn').onclick = () => setDrawMode(null);
  $('lineBtn').onclick = () => setDrawMode('line');
  $('rectBtn').onclick = () => setDrawMode('rect');
  $('measureBtn').onclick = () => setDrawMode('measure');
  $('clearDrawingsBtn').onclick = () => { state.drawings=[]; renderDrawings(); };

  $('symbol').onchange = () => { $('chartSymbol').value=$('symbol').value; syncSetupSummary(); };
  $('timeframe').onchange = () => { $('chartTf').value=$('timeframe').value; syncSetupSummary(); };
  $('chartSymbol').onchange = () => { $('symbol').value=$('chartSymbol').value; loadReplay(); };
  $('chartTf').onchange = () => { $('timeframe').value=$('chartTf').value; loadReplay(); };
  $('startingBalance').oninput = syncSetupSummary;

  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!$('ticketSheet').classList.contains('hidden')) closeTicket();
    else if (document.body.classList.contains('stream-fullscreen')) toggleFullscreen();
  });

  loadReplay();
})();