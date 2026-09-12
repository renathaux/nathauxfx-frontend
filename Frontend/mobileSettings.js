(() => {
  'use strict';

  const BASE_URL = location.hostname === '127.0.0.1' || location.hostname === 'localhost'
    ? 'http://127.0.0.1:8001'
    : 'https://flowsignal-backend-3.onrender.com';
  const $ = id => document.getElementById(id);
  const DASHBOARD_PREFS_KEY = 'flowsignal_dashboard_preferences';
  const RISK_PREFS_KEY = 'flowsignal_risk_preferences';
  const SESSION_TOKEN_KEY = 'flowsignal_session_token';
  const ACCESS_CODE = 'FLOWTEST';

  const settingTargets = {
    menuGeneralSettingsBtn: 'general',
    menuRiskSettingsBtn: 'risk',
    menuBrokerAccountsBtn: 'broker',
    menuNotificationsSettingsBtn: 'notifications',
    menuStrategySettingsBtn: 'strategy'
  };

  const dashboardDefaults = {
    showDailyPnl:true, showWeeklyPnl:true, showMonthlyPnl:true, showFloatingPnl:true,
    showConfidence:true, showBuySellPct:true, showManualTradeButtons:true,
    showOpenTradesCounter:true, showPerformanceBar:true, showTradeLevels:true,
    showMarketStructurePanel:true, showRecentSignalHistory:true,
    showAccountBalance:true, showAccountNumber:true, showBrokerInfo:true
  };

  const riskDefaults = {
    riskPerTradePct:'1.00', maxDailyLoss:'', maxWeeklyLoss:'', maxOpenTrades:'1',
    tp1PercentOfTp2:'80', protectedSlPercentOfTp2:'50', breakEvenEnabled:true,
    allowedSymbols:'EURUSD,XAUUSD', defaultTradingMode:'PAPER'
  };

  const esc = value => String(value ?? '--')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function readObject(key, fallback={}){
    try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || '{}') || {}) }; }
    catch (_error) { return { ...fallback }; }
  }

  function writeObject(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function closeMenu(){
    const menu=$('mobileMenu'), backdrop=$('mobileBackdrop');
    if(menu){menu.classList.add('hidden');menu.setAttribute('aria-hidden','true');}
    if(backdrop){backdrop.classList.add('hidden');backdrop.setAttribute('aria-hidden','true');}
  }

  function openSettingsShell(title, html){
    closeMenu();
    const detail=$('mobileDetail'), backdrop=$('mobileBackdrop');
    if(!detail || !backdrop) return;
    detail.classList.remove('live-trading-sheet');
    detail.classList.add('mobile-settings-sheet');
    $('mobileDetailEyebrow').textContent='SETTINGS';
    $('mobileDetailTitle').textContent=title;
    $('mobileDetailBody').innerHTML=html;
    detail.classList.remove('hidden');
    detail.setAttribute('aria-hidden','false');
    backdrop.classList.remove('hidden');
    backdrop.setAttribute('aria-hidden','false');
    document.body.classList.add('sheet-open','mobile-settings-open');
  }

  function clearSettingsClass(){
    $('mobileDetail')?.classList.remove('mobile-settings-sheet');
    document.body.classList.remove('mobile-settings-open');
  }

  function status(message, error=false){
    const el=$('mobileSettingsStatus');
    if(!el) return;
    el.textContent=message || '';
    el.classList.toggle('error', Boolean(error));
  }

  function generalPanel(){
    const prefs=readObject(DASHBOARD_PREFS_KEY,dashboardDefaults);
    const rows=[
      ['showDailyPnl','Show Daily P/L'],['showWeeklyPnl','Show Weekly P/L'],['showMonthlyPnl','Show Monthly P/L'],
      ['showFloatingPnl','Show Floating P/L'],['showConfidence','Show Bias Strength'],['showBuySellPct','Show Bullish/Bearish Bias'],
      ['showManualTradeButtons','Show Buy/Sell Buttons'],['showOpenTradesCounter','Show Open Trades Counter'],
      ['showPerformanceBar','Show Performance Bar'],['showTradeLevels','Show Trade Levels'],
      ['showMarketStructurePanel','Show News Impact Panel'],['showRecentSignalHistory','Show Recent Signal History'],
      ['showAccountBalance','Show Account Balance'],['showAccountNumber','Show Account Number'],['showBrokerInfo','Show Broker Info']
    ];
    openSettingsShell('General',`<div class="mobile-settings-shell"><section class="mobile-settings-card"><h3>General Settings</h3><p>Control what appears on your dashboard.</p><div class="mobile-settings-list">${rows.map(([key,label])=>`<label class="mobile-setting-row"><span>${esc(label)}</span><input type="checkbox" data-mobile-dashboard-pref="${key}" ${prefs[key]!==false?'checked':''}></label>`).join('')}</div><div id="mobileSettingsStatus" class="mobile-settings-status"></div></section></div>`);
    document.querySelectorAll('[data-mobile-dashboard-pref]').forEach(input=>{
      input.addEventListener('change',()=>{
        const next=readObject(DASHBOARD_PREFS_KEY,dashboardDefaults);
        next[input.dataset.mobileDashboardPref]=input.checked;
        writeObject(DASHBOARD_PREFS_KEY,next);
        status('Saved.');
      });
    });
  }

  function riskFields(prefs){
    return `<div class="mobile-field-grid">
      <div class="mobile-field"><label>Risk per trade (%)</label><input type="number" step="0.01" min="0.05" max="1" data-mobile-risk="riskPerTradePct" value="${esc(prefs.riskPerTradePct)}"></div>
      <div class="mobile-field"><label>Max open trades</label><input type="number" step="1" min="0" data-mobile-risk="maxOpenTrades" value="${esc(prefs.maxOpenTrades)}"></div>
      <div class="mobile-field"><label>Max daily loss ($)</label><input type="number" step="1" min="0" data-mobile-risk="maxDailyLoss" value="${esc(prefs.maxDailyLoss)}"></div>
      <div class="mobile-field"><label>Max weekly loss ($)</label><input type="number" step="1" min="0" data-mobile-risk="maxWeeklyLoss" value="${esc(prefs.maxWeeklyLoss)}"></div>
      <div class="mobile-field"><label>TP1 toward TP2 (%)</label><input type="number" step="1" min="0" max="100" data-mobile-risk="tp1PercentOfTp2" value="${esc(prefs.tp1PercentOfTp2)}"></div>
      <div class="mobile-field"><label>Protected SL toward TP2 (%)</label><input type="number" step="1" min="0" max="100" data-mobile-risk="protectedSlPercentOfTp2" value="${esc(prefs.protectedSlPercentOfTp2)}"></div>
      <div class="mobile-field full"><label>Allowed symbols</label><input type="text" data-mobile-risk="allowedSymbols" value="${esc(prefs.allowedSymbols)}"></div>
      <div class="mobile-field"><label>Default mode</label><select data-mobile-risk="defaultTradingMode"><option value="PAPER" ${prefs.defaultTradingMode==='PAPER'?'selected':''}>PAPER</option><option value="LIVE" ${prefs.defaultTradingMode==='LIVE'?'selected':''}>LIVE</option></select></div>
      <label class="mobile-setting-row"><span>Break-even rule</span><input type="checkbox" data-mobile-risk-check="breakEvenEnabled" ${prefs.breakEvenEnabled!==false?'checked':''}></label>
    </div>`;
  }

  async function loadRiskFromBackend(){
    try{
      const response=await fetch(`${BASE_URL}/settings/risk`,{cache:'no-store'});
      const data=await response.json();
      if(!response.ok || !data?.ok || !data?.risk) return;
      const prefs={...riskDefaults,...data.risk,protectedSlPercentOfTp2:riskDefaults.protectedSlPercentOfTp2};
      if(Array.isArray(prefs.allowedSymbols)) prefs.allowedSymbols=prefs.allowedSymbols.join(',');
      writeObject(RISK_PREFS_KEY,prefs);
      if($('mobileDetail')?.classList.contains('mobile-settings-sheet') && $('mobileDetailTitle')?.textContent==='Risk Management') riskPanel(false);
    }catch(_error){}
  }

  function collectRisk(){
    const prefs=readObject(RISK_PREFS_KEY,riskDefaults);
    document.querySelectorAll('[data-mobile-risk]').forEach(input=>{ prefs[input.dataset.mobileRisk]=input.value; });
    document.querySelectorAll('[data-mobile-risk-check]').forEach(input=>{ prefs[input.dataset.mobileRiskCheck]=input.checked; });
    return prefs;
  }

  async function saveRisk(){
    const prefs=collectRisk();
    writeObject(RISK_PREFS_KEY,prefs);
    status('Saving…');
    const payload={...prefs,
      riskPerTradePct:Number(prefs.riskPerTradePct),
      maxDailyLoss:prefs.maxDailyLoss===''?null:Number(prefs.maxDailyLoss),
      maxWeeklyLoss:prefs.maxWeeklyLoss===''?null:Number(prefs.maxWeeklyLoss),
      maxOpenTrades:Number(prefs.maxOpenTrades),
      tp1PercentOfTp2:Number(prefs.tp1PercentOfTp2),
      protectedSlPercentOfTp2:Number(prefs.protectedSlPercentOfTp2),
      allowedSymbols:String(prefs.allowedSymbols||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean)
    };
    try{
      const response=await fetch(`${BASE_URL}/settings/risk`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json().catch(()=>({}));
      if(!response.ok || data.ok===false) throw new Error(data.detail||'Could not save risk settings');
      status(`Saved · Current risk: ${Number(prefs.riskPerTradePct).toFixed(2)}%`);
    }catch(error){status(error.message||'Could not save risk settings',true);}
  }

  function riskPanel(refresh=true){
    const prefs=readObject(RISK_PREFS_KEY,riskDefaults);
    openSettingsShell('Risk Management',`<div class="mobile-settings-shell"><section class="mobile-settings-card"><h3>Risk Management</h3><p>These settings apply to EURUSD and Gold automatically.</p>${riskFields(prefs)}<div id="mobileSettingsStatus" class="mobile-settings-status">Current risk: ${esc(prefs.riskPerTradePct)}%</div><div class="mobile-settings-actions"><button id="mobileRiskReset" type="button">Reset</button><button id="mobileRiskSave" class="primary" type="button">Save Changes</button></div></section></div>`);
    $('mobileRiskSave')?.addEventListener('click',saveRisk);
    $('mobileRiskReset')?.addEventListener('click',()=>{writeObject(RISK_PREFS_KEY,riskDefaults);riskPanel(false);status('Defaults restored locally.');});
    if(refresh) loadRiskFromBackend();
  }

  function notificationsPanel(){
    const enabled=localStorage.getItem('soundEnabled')!=='false';
    const permission=('Notification' in window)?Notification.permission:'unsupported';
    openSettingsShell('Notifications',`<div class="mobile-settings-shell"><section class="mobile-settings-card"><h3>Signal Notifications</h3><p>Sound and browser notifications for new BUY or SELL signals.</p><label class="mobile-setting-row"><span><strong>Signal alerts</strong><small>Play sound and show a notification.</small></span><input id="mobileSignalAlerts" type="checkbox" ${enabled?'checked':''}></label><div class="mobile-settings-note">Browser permission: <strong id="mobileNotificationPermission">${esc(permission)}</strong></div><div id="mobileSettingsStatus" class="mobile-settings-status"></div><div class="mobile-settings-actions"><button id="mobileTestAlert" class="primary" type="button">Test Alert</button></div></section></div>`);
    $('mobileSignalAlerts')?.addEventListener('change',async event=>{
      localStorage.setItem('soundEnabled',event.target.checked?'true':'false');
      if(event.target.checked && 'Notification' in window && Notification.permission==='default'){
        try{const next=await Notification.requestPermission();$('mobileNotificationPermission').textContent=next;}catch(_error){}
      }
      status('Saved.');
    });
    $('mobileTestAlert')?.addEventListener('click',()=>{
      try{new Audio('alert.mp3').play().catch(()=>{});}catch(_error){}
      if('Notification' in window && Notification.permission==='granted') new Notification('NathauxFX',{body:'Signal alert test'});
      status('Test alert sent.');
    });
  }

  async function brokerPanel(){
    openSettingsShell('Broker Accounts','<div class="mobile-settings-shell"><section class="mobile-settings-card"><h3>Broker Accounts</h3><p>Loading cTrader connection…</p><div id="mobileSettingsStatus" class="mobile-settings-status">Loading…</div></section></div>');
    try{
      const response=await fetch(`${BASE_URL}/panel-data`,{credentials:'include',cache:'no-store'});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      const account=data?._meta?.live_account||data?.live_account||{};
      const connected=account.connected===true;
      const id=account.account_id||account.id||account.login||'--';
      const broker=account.broker_name||account.broker||'cTrader';
      const mode=account.mode||account.environment||'--';
      openSettingsShell('Broker Accounts',`<div class="mobile-settings-shell"><section class="mobile-settings-card"><h3>Broker Accounts</h3><p>Current live broker connection.</p><div class="mobile-account-summary"><div class="mobile-account-chip ${connected?'connected':''}"><span>Status</span><strong>${connected?'Connected':'Disconnected'}</strong></div><div class="mobile-account-chip"><span>Broker</span><strong>${esc(broker)}</strong></div><div class="mobile-account-chip"><span>Account</span><strong>${esc(id)}</strong></div><div class="mobile-account-chip"><span>Mode</span><strong>${esc(mode)}</strong></div></div><div id="mobileSettingsStatus" class="mobile-settings-status"></div><div class="mobile-settings-actions"><button id="mobileBrokerRefresh" class="primary" type="button">Refresh</button></div></section></div>`);
      $('mobileBrokerRefresh')?.addEventListener('click',brokerPanel);
    }catch(error){status(error.message||'Could not load broker account',true);}
  }

  async function ensureSettingsToken(force=false){
    if(!force){const existing=localStorage.getItem(SESSION_TOKEN_KEY);if(existing)return existing;}
    try{
      const response=await fetch(`${BASE_URL}/session/access-code`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:ACCESS_CODE})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok || !data.token) return '';
      localStorage.setItem(SESSION_TOKEN_KEY,String(data.token));
      return String(data.token);
    }catch(_error){return '';}
  }

  async function settingsFetch(path, options={}, retry=true){
    const token=await ensureSettingsToken(false);
    if(!token) return null;
    const response=await fetch(`${BASE_URL}${path}`,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${token}`}});
    if(response.status===401 && retry){localStorage.removeItem(SESSION_TOKEN_KEY);await ensureSettingsToken(true);return settingsFetch(path,options,false);}
    return response;
  }

  function strategyForm(current={}){
    const value=(key,fallback='')=>current[key]??fallback;
    return `<div class="mobile-strategy-grid">
      <div class="mobile-field"><label>Minimum RR</label><input type="number" step="0.01" data-mobile-strategy="minimum_rr" value="${esc(value('minimum_rr'))}"></div>
      <div class="mobile-field"><label>Maximum RR</label><input type="number" step="0.01" data-mobile-strategy="maximum_rr" value="${esc(value('maximum_rr'))}"></div>
      <div class="mobile-field"><label>Minimum BOS Buffer</label><input type="number" step="1" data-mobile-strategy="bos_buffer_points" value="${esc(value('bos_buffer_points'))}"></div>
      <div class="mobile-field"><label>Minimum SL Distance</label><input type="number" step="1" data-mobile-strategy="minimum_sl_distance_points" value="${esc(value('minimum_sl_distance_points'))}"></div>
      <div class="mobile-field"><label>Post Trade Cooldown (min)</label><input type="number" step="1" data-mobile-strategy="post_trade_cooldown_minutes" value="${esc(value('post_trade_cooldown_minutes'))}"></div>
      <label class="mobile-field toggle"><span><label>Consolidation Filter</label></span><input type="checkbox" data-mobile-strategy-check="consolidation_filter_enabled" ${value('consolidation_filter_enabled',true)?'checked':''}></label>
    </div>`;
  }

  async function strategyPanel(){
    openSettingsShell('Strategy','<div class="mobile-settings-shell"><section class="mobile-settings-card"><h3>Strategy Settings</h3><p>Loading backend-authoritative strategy values…</p><div id="mobileSettingsStatus" class="mobile-settings-status">Loading…</div></section></div>');
    try{
      const response=await settingsFetch('/strategy/settings');
      if(!response) throw new Error('Could not establish the settings session.');
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.detail||'Could not load strategy settings');
      const current=data.current||{};
      openSettingsShell('Strategy',`<div class="mobile-settings-shell"><section class="mobile-settings-card"><h3>Strategy Settings</h3><p>Changes apply to future evaluations only. Existing positions are not modified.</p>${strategyForm(current)}<div class="mobile-settings-note">Fixed rules such as EMA trend filtering, closed M15 break and later M5 confirmation remain unchanged.</div><div id="mobileSettingsStatus" class="mobile-settings-status">Loaded.</div><div class="mobile-settings-actions"><button id="mobileStrategyReload" type="button">Reload</button><button id="mobileStrategySave" class="primary" type="button">Save Strategy</button></div></section></div>`);
      $('mobileStrategyReload')?.addEventListener('click',strategyPanel);
      $('mobileStrategySave')?.addEventListener('click',saveStrategy);
    }catch(error){status(error.message||'Could not load strategy settings',true);}
  }

  async function saveStrategy(){
    const settings={};
    document.querySelectorAll('[data-mobile-strategy]').forEach(input=>{const n=Number(input.value);settings[input.dataset.mobileStrategy]=Number.isFinite(n)?n:input.value;});
    document.querySelectorAll('[data-mobile-strategy-check]').forEach(input=>{settings[input.dataset.mobileStrategyCheck]=input.checked;});
    status('Saving…');
    try{
      const response=await settingsFetch('/strategy/settings',{method:'PUT',headers:{'Content-Type':'application/json','X-Request-Source':'flowsignal_web_app'},body:JSON.stringify({settings})});
      if(!response) throw new Error('Could not establish the settings session.');
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.detail||'Could not save strategy settings');
      status('Strategy saved.');
    }catch(error){status(error.message||'Could not save strategy settings',true);}
  }

  const openers={general:generalPanel,risk:riskPanel,broker:brokerPanel,notifications:notificationsPanel,strategy:strategyPanel};

  document.addEventListener('click',event=>{
    const anchor=event.target.closest?.('.desktop-settings-submenu a');
    if(!anchor) return;
    const source=new URL(anchor.getAttribute('href')||anchor.href,location.href);
    const key=settingTargets[source.searchParams.get('open')];
    if(!key) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    clearSettingsClass();
    openers[key]?.();
  },true);

  document.querySelectorAll('.bottom-nav button').forEach(button=>button.addEventListener('click',clearSettingsClass,true));
  $('mobileDetailClose')?.addEventListener('click',clearSettingsClass,true);
  $('mobileBackdrop')?.addEventListener('click',clearSettingsClass,true);
  window.addEventListener('pageshow',clearSettingsClass);
})();