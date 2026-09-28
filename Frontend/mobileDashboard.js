(() => {
  const BASE_URL = location.hostname === "127.0.0.1" || location.hostname === "localhost"
    ? "http://127.0.0.1:8001"
    : "https://flowsignal-backend-3.onrender.com";

  const state = { symbol: "EURUSD", timeframe: "5m", panel: null, performance: null, chart: null, series: null, loading: false };
  const $ = id => document.getElementById(id);
  const first = (...v) => v.find(x => x !== undefined && x !== null && x !== "");
  const finite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const escapeHtml = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

  function money(v){const n=finite(v);return `${n>=0?"+":"-"}$${Math.abs(n).toFixed(2)}`;}
  function colorMoney(el,v){if(!el)return;const n=finite(v);el.classList.toggle("positive",n>=0);el.classList.toggle("negative",n<0);el.textContent=money(n);}
  function normalizeSignal(v){const s=String(v||"WAIT").toUpperCase();if(s.includes("BUY"))return"BUY";if(s.includes("SELL"))return"SELL";return"WAIT";}
  function normalizeSide(v){const s=String(v||"").toUpperCase();if(["1","BUY","LONG"].includes(s))return"BUY";if(["2","SELL","SHORT"].includes(s))return"SELL";return s||"--";}
  function formatPrice(v,symbol=state.symbol){const n=Number(v);if(!Number.isFinite(n))return"--";return n.toFixed(symbol==="XAUUSD"?2:5);}
  function readable(v){return String(v??"--").replaceAll("_"," ");}
  function structureText(value){
    if(!value)return"--";
    if(typeof value!=="object")return readable(value);
    const raw=first(value.label,value.name,value.bias,value.market_bias,value.structure,value.direction,value.trend,value.state,value.status);
    if(!raw)return"--";
    const text=readable(raw).toUpperCase();
    return /BULLISH|BEARISH/.test(text)&&!text.includes("BIAS")?`${text} BIAS`:text;
  }

  function asArray(v){if(Array.isArray(v))return v.filter(Boolean);if(v&&typeof v==="object")return Object.values(v).filter(x=>x&&typeof x==="object");return[];}
  function activeOrders(data){return asArray(first(data?.live_active_orders,data?._meta?.live_active_orders,data?.live?.active_orders,{}));}
  function positions(data){const choices=[data?.live_positions,data?._meta?.live_positions,data?.live?.positions,data?.active_trades];for(const c of choices){const a=asArray(c);if(a.length)return a;}return activeOrders(data);}
  function allActive(data){const seen=new Set();const out=[];[...activeOrders(data),...positions(data)].forEach(p=>{const key=String(first(p.position_id,p.broker_position_id,p.trade_id,p.order_id,`${p.symbol}-${p.entry}`));if(!seen.has(key)){seen.add(key);out.push(p);}});return out;}

  function setMeter(prefix,buy,sell,strength){[["Buy",buy],["Sell",sell],["Str",strength]].forEach(([name,value])=>{const pct=Math.max(0,Math.min(100,finite(value)));const bar=$(`m${prefix}${name}`),txt=$(`m${prefix}${name}Text`);if(bar)bar.style.width=`${pct}%`;if(txt)txt.textContent=`${Math.round(pct)}%`;});const conf=$(`m${prefix}Confidence`);if(conf)conf.textContent=`${Math.round(finite(strength))}%`;}
  function renderSignals(data){const plan=symbol=>{const raw=data?.[symbol]||{};const authority=window.NathauxLiveAuthority.authorityDisplay({...raw,live_strategy_display:data?._meta?.live_strategy_display_by_symbol?.[symbol]||raw.live_strategy_display});return authority?{...raw,strategy_decision:authority.signal||"WAIT"}:raw;};const eur=plan("EURUSD"),gold=plan("XAUUSD");$("mEurSignal").textContent=normalizeSignal(first(eur.strategy_decision,eur.display_signal,eur.final_signal,eur.signal));$("mGoldSignal").textContent=normalizeSignal(first(gold.strategy_decision,gold.display_signal,gold.final_signal,gold.signal));setMeter("Eur",first(eur.buy_pct,eur.buy_percentage,0),first(eur.sell_pct,eur.sell_percentage,0),first(eur.confidence,eur.bias_strength,0));setMeter("Gold",first(gold.buy_pct,gold.buy_percentage,0),first(gold.sell_pct,gold.sell_percentage,0),first(gold.confidence,gold.bias_strength,0));}

  function renderPerformance(data, perf){
    const active=allActive(data);
    const daily=first(data?.daily_total_pl,data?.daily_realized_pl,data?._meta?.daily_total_pl,0);
    const weekly=first(data?.weekly_total_pl,data?.weekly_realized_pl,data?._meta?.weekly_total_pl,perf?.weeklyPnl,0);
    const floating=first(data?.floating_live_pl,data?._meta?.floating_live_pl,perf?.floatingPnl,0);
    const count=first(data?.broker_open_positions_count,data?._meta?.broker_open_positions_count,perf?.openTrades,active.length,0);
    colorMoney($("mDaily"),daily);colorMoney($("mWeekly"),weekly);colorMoney($("mLive"),floating);$("mOpenCount").textContent=String(finite(count));
  }

  function chosenPosition(data){const rows=allActive(data);return rows.find(p=>String(p.symbol||"").toUpperCase()===state.symbol)||rows[0]||null;}
  function renderTrade(data){const p=chosenPosition(data),empty=$("mTradeEmpty"),body=$("mTradeBody");if(!p){empty.classList.remove("hidden");body.classList.add("hidden");$("mTradeHeading").textContent="OPEN TRADE";return;}empty.classList.add("hidden");body.classList.remove("hidden");const symbol=String(first(p.symbol,state.symbol)).toUpperCase(),side=normalizeSide(first(p.side,p.action,p.tradeSide));$("mTradeHeading").textContent=`OPEN TRADE · ${symbol}`;$("mTradeSymbol").textContent=symbol;$("mTradeSide").textContent=side;$("mTradeSide").dataset.side=side;colorMoney($("mTradePnl"),first(p.floating_pl,p.floating_pnl,p.broker_pnl,p.pnl,p.profit,0));$("mLot").textContent=first(p.display_lots,p.lots,p.volume_lots,p.lot_size,p.volume,"--");$("mEntry").textContent=formatPrice(first(p.entry,p.entry_price),symbol);$("mSl").textContent=formatPrice(first(p.current_sl,p.sl,p.stop_loss),symbol);$("mTp1").textContent=formatPrice(first(p.tp1,p.take_profit_1),symbol);$("mTp2").textContent=formatPrice(first(p.tp2,p.take_profit,p.take_profit_2),symbol);$("mTradeManagement").innerHTML=window.NathauxLiveAuthority.managementMarkup(p);}

  function rawCandles(data,symbol,tf){return first(data?.candles?.[symbol]?.[tf],data?.[symbol]?.candles?.[tf],data?.market_data?.[symbol]?.[tf],[])||[];}
  function candleTime(v){if(typeof v==="number")return v>2e12?Math.floor(v/1000):Math.floor(v);const t=new Date(v).getTime();return Number.isFinite(t)?Math.floor(t/1000):0;}
  function normalizeCandles(rows){return Array.isArray(rows)?rows.map(c=>({time:candleTime(first(c.time,c.timestamp,c.ts,c.open_time,c.openTime)),open:finite(c.open,NaN),high:finite(c.high,NaN),low:finite(c.low,NaN),close:finite(c.close,NaN)})).filter(c=>c.time&&[c.open,c.high,c.low,c.close].every(Number.isFinite)).sort((a,b)=>a.time-b.time):[];}
  function aggregate(rows,seconds){const m=new Map();rows.forEach(c=>{const t=Math.floor(c.time/seconds)*seconds,e=m.get(t);if(!e)m.set(t,{time:t,open:c.open,high:c.high,low:c.low,close:c.close});else{e.high=Math.max(e.high,c.high);e.low=Math.min(e.low,c.low);e.close=c.close;}});return[...m.values()].sort((a,b)=>a.time-b.time);}
  function candleArray(data,symbol,tf){const d=normalizeCandles(rawCandles(data,symbol,tf));if(d.length)return d;const h=normalizeCandles(rawCandles(data,symbol,"1h"));if(tf==="4h")return aggregate(h,14400);if(tf==="1d")return aggregate(h,86400);return[];}
  function ensureChart(){const host=$("mobileChart");if(!host||!window.LightweightCharts)return false;if(!state.chart){state.chart=LightweightCharts.createChart(host,{autoSize:true,layout:{background:{color:"#06101b"},textColor:"#8fa0b6"},grid:{vertLines:{color:"#142238"},horzLines:{color:"#142238"}},rightPriceScale:{visible:false,borderVisible:false,minimumWidth:0,scaleMargins:{top:.1,bottom:.12}},timeScale:{borderColor:"#22344b",timeVisible:true,secondsVisible:false,rightOffset:0},handleScale:true,handleScroll:true});state.series=state.chart.addCandlestickSeries({priceScaleId:"",upColor:"#2fb7a3",downColor:"#ef5b5b",wickUpColor:"#2fb7a3",wickDownColor:"#ef5b5b",borderVisible:false,priceLineVisible:false,lastValueVisible:false});try{state.series.priceScale().applyOptions({autoScale:true,scaleMargins:{top:.1,bottom:.12}});}catch(_){}}return true;}
  function renderChart(){if(!state.panel||!ensureChart())return;const rows=candleArray(state.panel,state.symbol,state.timeframe);$("mChartHeading").textContent=`CHART · ${state.symbol}`;if(!rows.length){$("mOhlc").textContent="Waiting for candles";state.series.setData([]);return;}state.series.setData(rows);state.chart.timeScale().fitContent();state.chart.applyOptions({rightPriceScale:{visible:false,borderVisible:false,minimumWidth:0},timeScale:{rightOffset:0}});const c=rows.at(-1);$("mOhlc").textContent=`O ${formatPrice(c.open)} H ${formatPrice(c.high)} L ${formatPrice(c.low)} C ${formatPrice(c.close)}`;}

  function smcIntel(data){const plan=data?.[state.symbol]||{};return first(plan.smc_plan_intel,plan.smc_intel,plan.smc,{})||{};}
  function confirmations(intel,plan){const direct=first(intel.confirmations,intel.confirmation_status,plan.confirmations);if(Array.isArray(direct)){const done=direct.filter(x=>typeof x==="object"?first(x.done,x.confirmed,x.ok,false):Boolean(x)).length;return `${done} / ${direct.length}`;}if(direct&&typeof direct==="object"){const vals=Object.values(direct);const done=vals.filter(x=>typeof x==="object"?first(x.done,x.confirmed,x.ok,false):Boolean(x)).length;return `${done} / ${vals.length}`;}const total=finite(first(intel.total_confirmations,intel.confirmation_total),0),done=finite(first(intel.confirmed_count,intel.confirmations_met),0);if(total)return `${done} / ${total}`;const progress=finite(first(intel.progress,intel.progress_pct),NaN);if(Number.isFinite(progress)&&progress>=100)return "6 / 6";return "--";}
  function renderSmc(data){const raw=data?.[state.symbol]||{};const authority=window.NathauxLiveAuthority.authorityDisplay({...raw,live_strategy_display:data?._meta?.live_strategy_display_by_symbol?.[state.symbol]||raw.live_strategy_display});if(authority){$("mSmcStructure").textContent=authority.strategy_name;$("mSmcTrigger").textContent=readable(authority.reason||authority.signal);$("mSmcConfirm").textContent=authority.signal||"WAIT";return;}const plan=raw,intel=smcIntel(data),active=allActive(data).some(p=>String(p.symbol||"").toUpperCase()===state.symbol);const structure=first(intel.market_structure,intel.structure,intel.market_bias,plan.market_structure,plan.market_bias,plan.trend_15m,plan.trend,"--");const trigger=active?"RUNNING":first(intel.next_trigger,intel.trigger,plan.next_trigger,plan.execution_status,plan.strategy_decision,plan.signal,"--");$("mSmcStructure").textContent=structureText(structure);$("mSmcTrigger").textContent=readable(trigger);$("mSmcConfirm").textContent=confirmations(intel,plan);}

  function renderConnection(ok){const el=$("mobileConnection");el.textContent=ok?"● LIVE":"Connection issue";el.classList.toggle("negative",!ok);}
  function renderAll(){renderSignals(state.panel);renderPerformance(state.panel,state.performance);renderTrade(state.panel);renderSmc(state.panel);renderChart();}

  async function loadData(){if(state.loading)return;state.loading=true;try{const [panelRes,perfRes]=await Promise.all([fetch(`${BASE_URL}/panel-data`,{credentials:"include",cache:"no-store"}),fetch(`${BASE_URL}/performance/summary`,{credentials:"include",cache:"no-store"}).catch(()=>null)]);if(!panelRes.ok)throw new Error(`panel ${panelRes.status}`);state.panel=await panelRes.json();state.performance=perfRes&&perfRes.ok?await perfRes.json():null;renderAll();renderConnection(true);}catch(e){renderConnection(false);console.error("mobile dashboard refresh failed",e);}finally{state.loading=false;}}

  function detailRow(k,v){if(v===undefined||v===null||v==="")return"";const shown=typeof v==="object"?JSON.stringify(v):String(v);return `<div class="detail-row"><span>${escapeHtml(readable(k))}</span><strong>${escapeHtml(shown)}</strong></div>`;}
  function showBackdrop(){const b=$("mobileBackdrop");b.classList.remove("hidden");b.setAttribute("aria-hidden","false");document.body.classList.add("sheet-open");}
  function hideBackdrop(){const b=$("mobileBackdrop");b.classList.add("hidden");b.setAttribute("aria-hidden","true");document.body.classList.remove("sheet-open");}
  function closeAllSheets(){[$("mobileMenu"),$("mobileDetail")].forEach(el=>{el.classList.add("hidden");el.setAttribute("aria-hidden","true");});hideBackdrop();}
  function openDetail(title,html,eyebrow="DETAILS"){$("mobileMenu").classList.add("hidden");$("mobileMenu").setAttribute("aria-hidden","true");$("mobileDetailTitle").textContent=title;$("mobileDetailEyebrow").textContent=eyebrow;$("mobileDetailBody").innerHTML=html;$("mobileDetail").classList.remove("hidden");$("mobileDetail").setAttribute("aria-hidden","false");showBackdrop();}
  function smcDetail(){const plan=state.panel?.[state.symbol]||{},intel=smcIntel(state.panel),structure=first(intel.market_structure,intel.structure,intel.market_bias,plan.market_structure,plan.market_bias,plan.trend_15m,plan.trend);openDetail("SMC Plan",`<div class="detail-card"><h3>SMC Plan · ${state.symbol}</h3>${[["Market structure",structureText(structure)],["Next trigger",first(intel.next_trigger,plan.execution_status,plan.strategy_decision)],["Entry",first(intel.next_entry_zone,intel.entry_zone,plan.entry)],["SL",first(intel.estimated_sl,plan.sl)],["TP",first(intel.estimated_tp,plan.tp2)],["Confirmations",confirmations(intel,plan)]].map(([k,v])=>detailRow(k,v)).join("")}</div>`,"STRATEGY");}
  async function v2Detail(){openDetail("V2 Shadow",'<div class="detail-card"><p>Loading V2 Shadow…</p></div>',"RESEARCH");try{const r=await fetch(`${BASE_URL}/shadow/v2/summary?symbol=${state.symbol}`,{cache:"no-store"}),v=await r.json();openDetail("V2 Shadow",`<div class="detail-card"><h3>V2 Shadow · ${state.symbol}</h3>${Object.entries(v).map(([k,x])=>detailRow(k,x)).join("")}</div>`,"RESEARCH");}catch(e){openDetail("V2 Shadow",'<div class="detail-card"><p>V2 data unavailable.</p></div>',"RESEARCH");}}
  async function fundamentalDetail(){openDetail("Fundamental Insight",'<div class="detail-card"><p>Loading fundamentals…</p></div>',"MARKET BIAS");try{const r=await fetch(`${BASE_URL}/fundamentals/insight?symbol=${state.symbol}`,{cache:"no-store"}),v=await r.json();openDetail("Fundamental Insight",`<div class="detail-card"><h3>${state.symbol}</h3>${Object.entries(v).map(([k,x])=>detailRow(k,x)).join("")}</div>`,"MARKET BIAS");}catch(e){openDetail("Fundamental Insight",'<div class="detail-card"><p>Fundamental data unavailable.</p></div>',"MARKET BIAS");}}
  function historyDetail(){const rows=first(state.panel?.live_recent_history,state.panel?._meta?.live_recent_history,[]);openDetail("Signal History",`<div class="detail-card"><h3>Recent Signals</h3>${(Array.isArray(rows)?rows:[]).slice(0,30).map(x=>detailRow(`${first(x.symbol,"")} ${first(x.signal,x.side,"")}`,first(x.result,x.status,x.pips,""))).join("")||"<p>No recent signals.</p>"}</div>`,"RECENT ACTIVITY");}

  function selectSymbol(symbol){state.symbol=symbol;document.querySelectorAll(".symbol-switch-btn").forEach(b=>b.classList.toggle("active",b.dataset.symbol===symbol));renderTrade(state.panel||{});renderSmc(state.panel||{});renderChart();}
  function selectTf(tf){state.timeframe=tf;document.querySelectorAll(".tf").forEach(b=>b.classList.toggle("active",b.dataset.tf===tf));renderChart();}
  function openMenu(){$("mobileDetail").classList.add("hidden");$("mobileDetail").setAttribute("aria-hidden","true");$("mobileMenu").classList.remove("hidden");$("mobileMenu").setAttribute("aria-hidden","false");showBackdrop();}
  function closeMenu(){closeAllSheets();}

  $("mobileMenuBtn").onclick=openMenu;
  $("mobileMenuClose").onclick=closeMenu;
  $("mobileDetailClose").onclick=closeAllSheets;
  $("mobileBackdrop").onclick=closeAllSheets;
  $("mSmcBtn").onclick=smcDetail;
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeAllSheets();});
  document.querySelectorAll(".symbol-switch-btn").forEach(b=>b.onclick=()=>selectSymbol(b.dataset.symbol));
  document.querySelectorAll(".tf").forEach(b=>b.onclick=()=>selectTf(b.dataset.tf));
  document.querySelectorAll("#mobileMenu [data-panel]").forEach(b=>b.onclick=()=>({fundamental:fundamentalDetail,v2:v2Detail,smc:smcDetail,history:historyDetail}[b.dataset.panel]||(()=>{}))());
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".bottom-nav button").forEach(x=>x.classList.remove("active"));b.classList.add("active");if(b.dataset.nav==="menu")openMenu();else if(b.dataset.nav==="trades")historyDetail();else if(b.dataset.nav==="signals")historyDetail();else if(b.dataset.nav==="chart")$("mobileChart")?.focus?.();else closeAllSheets();});

  loadData();setInterval(loadData,5000);window.addEventListener("load",()=>setTimeout(renderChart,300));
})();