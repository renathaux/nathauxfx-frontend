(() => {
  const BASE_URL = location.hostname === "127.0.0.1" || location.hostname === "localhost"
    ? "http://127.0.0.1:8001"
    : "https://flowsignal-backend-3.onrender.com";
  const PANEL_CACHE_KEY = "flowsignal_mobile_panel_cache_v1";
  const OWNER_TOKEN_KEY = "flowsignal_session_token";
  const $ = id => document.getElementById(id);
  const first = (...values) => values.find(v => v !== undefined && v !== null && v !== "");
  const esc = value => String(value ?? "--")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  let currentData = null;
  let currentLiveEnabled = false;
  let currentPaperEnabled = false;
  let currentMode = "paper";
  let loading = false;

  function list(value){
    if(Array.isArray(value)) return value.filter(Boolean);
    if(value && typeof value === "object") return Object.values(value).filter(Boolean);
    return [];
  }

  function number(value, fallback = 0){
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function money(value){
    const n = number(value, 0);
    return `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}`;
  }

  function timeText(value){
    if(!value) return "--";
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
  }

  function ownerHeaders(){
    const token = String(localStorage.getItem(OWNER_TOKEN_KEY) || "").trim();
    return token ? { Authorization:`Bearer ${token}` } : {};
  }

  function liveHistory(data){
    const meta = data?._meta || {};
    return list(first(data?.live_recent_history, meta.live_recent_history, data?.live_history, meta.live_history, []));
  }

  function activeLive(data){
    const meta = data?._meta || {};
    return list(first(data?.live_active_orders, meta.live_active_orders, data?.live_positions, meta.live_positions, []));
  }

  function paperHistory(data){
    return list(data?.paper_trade_history || []);
  }

  function activePaper(data){
    return list(data?.paper_trades || {});
  }

  function resultClass(trade){
    const pnl = Number(first(trade?.pnl, trade?.profit, trade?.realized_pl, trade?.realized_pnl));
    const result = String(first(trade?.result, trade?.status, trade?.outcome, "")).toUpperCase();
    if(Number.isFinite(pnl) && pnl > 0) return "positive";
    if(Number.isFinite(pnl) && pnl < 0) return "negative";
    if(/WIN|WON|TP|PROFIT/.test(result)) return "positive";
    if(/LOSS|LOST|SL/.test(result)) return "negative";
    return "";
  }

  function liveStats(data){
    const meta = data?._meta || {};
    const backend = first(data?.live_trade_stats, meta.live_trade_stats, data?.live_stats, meta.live_stats, {}) || {};
    const history = liveHistory(data);
    const runningFallback = activeLive(data).length;
    const winsFallback = history.filter(t => resultClass(t) === "positive").length;
    const lossesFallback = history.filter(t => resultClass(t) === "negative").length;
    const wins = number(first(backend.wins, backend.win_count, winsFallback), winsFallback);
    const losses = number(first(backend.losses, backend.loss_count, lossesFallback), lossesFallback);
    const running = number(first(backend.running, backend.open, backend.active, runningFallback), runningFallback);
    const total = number(first(backend.total, backend.total_trades, wins + losses + running), wins + losses + running);
    return { wins, losses, running, total };
  }

  function paperStats(data){
    const backend = data?.paper_trade_stats || {};
    const history = paperHistory(data);
    const runningFallback = activePaper(data).length;
    const winsFallback = history.filter(t => resultClass(t) === "positive").length;
    const lossesFallback = history.filter(t => resultClass(t) === "negative").length;
    const wins = number(first(backend.wins, backend.win_count, winsFallback), winsFallback);
    const losses = number(first(backend.losses, backend.loss_count, lossesFallback), lossesFallback);
    const running = number(first(backend.running, backend.open, backend.active, runningFallback), runningFallback);
    const total = number(first(backend.total, backend.total_trades, wins + losses + running), wins + losses + running);
    return { wins, losses, running, total };
  }

  function tradeHistoryMarkup(rows, paper=false){
    rows = list(rows).slice(0, 20);
    if(!rows.length){
      return `<div class="live-history-empty"><strong>${paper ? "No paper trades yet" : "No recent live trades"}</strong><span>${paper ? "New paper trades will appear after the next valid setup." : "Closed live trades will appear here."}</span></div>`;
    }
    return `<div class="live-history-list">${rows.map(trade => {
      const symbol = first(trade?.symbol, "--");
      const side = String(first(trade?.side, trade?.signal, trade?.action, "--")).toUpperCase();
      const pnlRaw = first(trade?.pnl, trade?.profit, trade?.realized_pl, trade?.realized_pnl);
      const pnl = Number.isFinite(Number(pnlRaw)) ? money(pnlRaw) : String(first(trade?.result, trade?.status, "--"));
      const when = timeText(first(trade?.closed_at, trade?.time, trade?.timestamp, trade?.created_at));
      const cls = resultClass(trade);
      return `<div class="live-history-card ${cls}"><strong>${esc(symbol)} · ${esc(side)}</strong><b>${esc(pnl)}</b><span>${esc(first(trade?.result, trade?.status, paper ? "Paper" : "Closed"))}</span><small>${esc(when)}</small></div>`;
    }).join("")}</div>`;
  }

  function activePaperMarkup(data){
    const trades = data?.paper_trades || {};
    const active = Object.entries(trades).filter(([,trade]) => Boolean(trade));
    if(!active.length){
      return `<div class="paper-active-empty"><strong>No active paper trades</strong><span>Paper auto will track one setup per symbol when conditions align.</span></div>`;
    }
    return `<div class="paper-active-list">${active.map(([symbol,trade]) => `<div class="paper-active-card"><strong>${esc(symbol)} · ${esc(String(first(trade.side, trade.signal, "--")).toUpperCase())}</strong><span>Entry ${esc(first(trade.entry,"--"))} · SL ${esc(first(trade.sl,"--"))}</span><small>TP1 ${esc(first(trade.tp1,"--"))} · TP2 ${esc(first(trade.tp2,"--"))}</small></div>`).join("")}</div>`;
  }

  function activeLiveMarkup(data){
    const active = activeLive(data);
    if(!active.length){
      return `<div class="paper-active-empty"><strong>No active live trades</strong><span>Live auto will show the running strategy here after a live order opens.</span></div>`;
    }
    return `<div class="paper-active-list">${active.map(trade => {
      const symbol = first(trade?.symbol, trade?.symbol_name, "--");
      const side = String(first(trade?.side, trade?.signal, trade?.action, trade?.trade_side, "--")).toUpperCase();
      const entry = first(trade?.entry, trade?.entry_price, trade?.open_price, "--");
      const sl = first(trade?.sl, trade?.stop_loss, trade?.stopLoss, "--");
      const tp1 = first(trade?.tp1, trade?.take_profit_1, trade?.takeProfit1, "--");
      const tp2 = first(trade?.tp2, trade?.take_profit, trade?.take_profit_2, trade?.takeProfit, "--");
      return `<div class="paper-active-card"><strong>${esc(symbol)} · ${esc(side)}</strong><span>Entry ${esc(entry)} · SL ${esc(sl)}</span><small>TP1 ${esc(tp1)} · TP2 ${esc(tp2)}</small></div>`;
    }).join("")}</div>`;
  }

  function statsMarkup(stats){
    return `<div class="live-stats-grid">
      <div class="live-stat-card win"><strong>${stats.wins}</strong><span>Wins</span></div>
      <div class="live-stat-card loss"><strong>${stats.losses}</strong><span>Losses</span></div>
      <div class="live-stat-card running"><strong>${stats.running}</strong><span>Running</span></div>
      <div class="live-stat-card total"><strong>${stats.total}</strong><span>Total</span></div>
    </div>`;
  }

  function render(data){
    currentData = data || {};
    const meta = currentData?._meta || {};
    currentLiveEnabled = Boolean(first(meta.live_auto_enabled, currentData.live_auto_enabled, false));
    currentPaperEnabled = Boolean(first(meta.paper_auto_enabled, currentData.paper_auto_enabled, false));
    const broker = first(meta.live_account, currentData.live_account, {}) || {};
    const connected = broker.connected === true;
    const weekly = first(currentData.weekly_total_pl, currentData.weekly_realized_pl, meta.weekly_total_pl, meta.weekly_realized_pl, 0);
    const floating = first(currentData.floating_live_pl, meta.floating_live_pl, 0);
    const body = $("mobileDetailBody");
    if(!body) return;

    const isPaper = currentMode === "paper";
    const stats = isPaper ? paperStats(currentData) : liveStats(currentData);

    body.innerHTML = `
      <div class="live-trading-shell ${isPaper ? "paper-mode" : "live-mode"}">
        ${isPaper ? `
          <div class="paper-toggle-row">
            <button id="mobilePaperAutoToggle" class="live-auto-toggle paper ${currentPaperEnabled ? "on" : "off"}" type="button">Paper Auto: ${currentPaperEnabled ? "ON" : "OFF"}</button>
            <span id="mobilePaperToggleMessage" class="live-toggle-message"></span>
          </div>` : `
          <div class="live-trading-top">
            <button id="mobileLiveAutoToggle" class="live-auto-toggle ${currentLiveEnabled ? "on" : "off"}" type="button">Live Auto: ${currentLiveEnabled ? "ON" : "OFF"}</button>
            <div class="live-metric-card"><span>Weekly P/L</span><strong>${esc(money(weekly))}</strong></div>
            <div class="live-metric-card"><span>Floating P/L</span><strong>${esc(money(floating))}</strong></div>
          </div>
          <div class="live-broker-row">
            <span class="live-broker-badge ${connected ? "connected" : "disconnected"}">Live Broker: ${connected ? "Connected" : "Disconnected"}</span>
            <span id="mobileLiveToggleMessage" class="live-toggle-message"></span>
          </div>`}

        <div class="trade-mode-tabs" role="tablist" aria-label="Auto trading mode">
          <button id="mobilePaperTab" class="${isPaper ? "active" : ""}" type="button">PAPER TRADES</button>
          <button id="mobileLiveTab" class="${!isPaper ? "active" : ""}" type="button">LIVE TRADES</button>
        </div>

        <section class="paper-active-section"><h3>✦ ACTIVE STRATEGIES</h3>${isPaper ? activePaperMarkup(currentData) : activeLiveMarkup(currentData)}</section>
        ${statsMarkup(stats)}
        <section class="live-trading-section">
          <h3>${isPaper ? "RECENT TRADES" : "RECENT LIVE TRADES"}</h3>
          ${tradeHistoryMarkup(isPaper ? paperHistory(currentData) : liveHistory(currentData), isPaper)}
        </section>
      </div>`;

    $("mobilePaperTab")?.addEventListener("click", () => { currentMode = "paper"; render(currentData); });
    $("mobileLiveTab")?.addEventListener("click", () => { currentMode = "live"; render(currentData); });
    $("mobileLiveAutoToggle")?.addEventListener("click", toggleLiveAuto);
    $("mobilePaperAutoToggle")?.addEventListener("click", togglePaperAuto);
  }

  function openShell(){
    document.querySelectorAll(".bottom-nav button").forEach(button => button.classList.toggle("active", button.dataset.nav === "live"));
    const menu = $("mobileMenu");
    const detail = $("mobileDetail");
    const backdrop = $("mobileBackdrop");
    if(menu){ menu.classList.add("hidden"); menu.setAttribute("aria-hidden", "true"); }
    if(!detail || !backdrop) return;
    detail.classList.remove("mobile-settings-sheet");
    document.body.classList.remove("mobile-settings-open");
    $("mobileDetailEyebrow").textContent = "AUTO TRADE";
    $("mobileDetailTitle").textContent = "Auto Trade";
    $("mobileDetailBody").innerHTML = '<div class="live-trading-loading">Loading Auto Trade…</div>';
    detail.classList.add("live-trading-sheet");
    detail.classList.remove("hidden");
    detail.setAttribute("aria-hidden", "false");
    backdrop.classList.remove("hidden");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.classList.add("sheet-open", "live-trading-open");
  }

  async function loadLiveData(){
    if(loading) return;
    loading = true;
    try{
      const response = await fetch(`${BASE_URL}/panel-data`, { credentials:"include", cache:"no-store" });
      if(!response.ok) throw new Error(`panel ${response.status}`);
      const data = await response.json();
      currentData = data;
      try{ localStorage.setItem(PANEL_CACHE_KEY, JSON.stringify(data)); }catch(_error){}
      if(!$("mobileDetail")?.classList.contains("live-trading-sheet")) return;
      render(data);
    }catch(error){
      console.warn("mobile auto trading refresh failed", error);
      const body = $("mobileDetailBody");
      if(body) body.innerHTML = '<div class="live-history-empty"><strong>Auto Trade unavailable</strong><span>Could not refresh trading data.</span></div>';
    }finally{
      loading = false;
    }
  }

  function openLiveTrading(event){
    event?.preventDefault?.();
    event?.stopPropagation?.();
    openShell();
    try{
      const cached = JSON.parse(localStorage.getItem(PANEL_CACHE_KEY) || "null");
      if(cached) render(cached);
    }catch(_error){}
    loadLiveData();
  }

  async function toggleLiveAuto(){
    const button = $("mobileLiveAutoToggle");
    const message = $("mobileLiveToggleMessage");
    const nextEnabled = !currentLiveEnabled;
    if(!window.confirm(`Turn Live Auto ${nextEnabled ? "ON" : "OFF"}?`)) return;
    if(button) button.disabled = true;
    if(message) message.textContent = "Saving…";
    try{
      const headers = { "Content-Type":"application/json", ...ownerHeaders() };
      const response = await fetch(`${BASE_URL}/live-auto-toggle`, {
        method:"POST",
        credentials:"include",
        headers,
        body:JSON.stringify({ enabled:nextEnabled, source:"flowsignal_web_app" })
      });
      const result = await response.json().catch(() => ({}));
      if(!response.ok) {
        const raw = String(result.detail || result.message || `HTTP ${response.status}`);
        if(raw.includes("OWNER_SESSION_REQUIRED")) throw new Error("Owner/Admin session required. Log in with the owner account, then try again.");
        throw new Error(raw);
      }
      currentLiveEnabled = Boolean(first(result.enabled, nextEnabled));
      if(message) message.textContent = result.message || "Saved";
      await loadLiveData();
    }catch(error){
      if(message) message.textContent = String(error.message || "Could not change Live Auto");
      if(button) button.disabled = false;
    }
  }

  async function togglePaperAuto(){
    const button = $("mobilePaperAutoToggle");
    const message = $("mobilePaperToggleMessage");
    const nextEnabled = !currentPaperEnabled;
    if(!window.confirm(`Turn Paper Auto ${nextEnabled ? "ON" : "OFF"}?`)) return;
    if(button) button.disabled = true;
    if(message) message.textContent = "Saving…";
    try{
      const response = await fetch(`${BASE_URL}/paper-auto-toggle`, {
        method:"POST",
        credentials:"include",
        headers:{ "Content-Type":"application/json", ...ownerHeaders() },
        body:JSON.stringify({ enabled:nextEnabled, source:"flowsignal_web_app" })
      });
      const result = await response.json().catch(() => ({}));
      if(!response.ok) throw new Error(result.detail || result.message || `HTTP ${response.status}`);
      currentPaperEnabled = Boolean(first(result.enabled, nextEnabled));
      if(message) message.textContent = result.message || "Saved";
      await loadLiveData();
    }catch(error){
      if(message) message.textContent = String(error.message || "Could not change Paper Auto");
      if(button) button.disabled = false;
    }
  }

  function clearLiveClass(){
    $("mobileDetail")?.classList.remove("live-trading-sheet");
    document.body.classList.remove("live-trading-open");
  }

  const liveButton = document.querySelector('.bottom-nav button[data-nav="live"]');
  if(liveButton) liveButton.onclick = openLiveTrading;

  document.querySelectorAll('a[href*="open=menuPaperBtn"]').forEach(link => {
    link.addEventListener("click", event => {
      if(window.innerWidth <= 700) openLiveTrading(event);
    }, true);
  });

  document.querySelectorAll('.bottom-nav button:not([data-nav="live"])').forEach(button => {
    button.addEventListener("click", clearLiveClass, true);
  });
  $("mobileDetailClose")?.addEventListener("click", clearLiveClass, true);
  $("mobileBackdrop")?.addEventListener("click", clearLiveClass, true);
})();