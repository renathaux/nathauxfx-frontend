(() => {
  'use strict';

  if (window.innerWidth <= 700) return;

  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const page = path.includes('manual-replay')
    ? 'manual-replay'
    : path.includes('strategy-studio')
      ? 'strategy-studio'
      : path.includes('strategy-simulator')
        ? 'strategy-simulator'
        : 'app';

  document.body.dataset.nfxPage = page;
  document.body.classList.add('nfx-unified-desktop');

  function selectedAppSection() {
    const open = params.get('open') || '';
    if (open === 'menuPaperBtn') return 'live';
    if (open === 'menuHistoryBtn') return 'history';
    if (open === 'menuStatsBtn') return 'analytics';
    if (/menu.*SettingsBtn/.test(open)) return 'settings';
    return 'dashboard';
  }

  const active = page === 'app' ? selectedAppSection() : page;

  const sidebarItems = [
    ['dashboard','▦','Dashboard','/app.html'],
    ['live','↗','Live Trading','/app.html?desktop=1&open=menuPaperBtn'],
    ['strategy-studio','◇','Strategy Studio','/strategy-studio.html'],
    ['strategy-simulator','↻','Simulator','/strategy-simulator.html'],
    ['manual-replay','↺','Manual Replay','/manual-replay'],
    ['history','◷','History','/app.html?desktop=1&open=menuHistoryBtn'],
    ['analytics','▥','Analytics','/app.html?desktop=1&open=menuStatsBtn'],
    ['settings','⚙','Settings','/app.html?desktop=1&open=menuGeneralSettingsBtn'],
  ];

  function nav(items) {
    return items.map(([key,icon,label,href]) =>
      '<a href="'+href+'" class="'+(active===key?'active':'')+'"><span class="nfx-shell-nav-icon">'+icon+'</span><span>'+label+'</span></a>'
    ).join('');
  }

  const shell = document.createElement('div');
  shell.className = 'nfx-desktop-shell' + (page === 'app' ? ' nfx-shell-hidden' : '');
  shell.innerHTML =
    '<header class="nfx-shell-topbar">' +
      '<a class="nfx-shell-brand" href="/app.html">' +
        '<span class="nfx-shell-brand-mark">N</span>' +
        '<span class="nfx-shell-brand-copy"><strong>NathauxFX</strong><small>Trade. Replay. Improve.</small></span>' +
      '</a>' +
      '<nav class="nfx-shell-tabs" aria-label="Trading workspaces">' +
        '<a href="/manual-replay" class="'+(page==='manual-replay'?'active':'')+'">Manual Replay</a>' +
        '<a href="/strategy-simulator.html" class="'+(page==='strategy-simulator'?'active':'')+'">Strategy Simulator</a>' +
        '<a href="/strategy-studio.html" class="'+(page==='strategy-studio'?'active':'')+'">Strategy Studio</a>' +
      '</nav>' +
      '<span class="nfx-shell-top-spacer"></span>' +
      '<button id="nfxUnifiedTheme" class="nfx-shell-theme" type="button" aria-label="Toggle light or dark mode">☀</button>' +
      '<div class="nfx-shell-account"><span class="nfx-shell-avatar">N</span><span class="nfx-shell-account-copy"><strong>NathauxFX</strong><small>Trader</small></span></div>' +
    '</header>' +
    '<aside class="nfx-shell-sidebar">' +
      '<nav aria-label="NathauxFX navigation">'+nav(sidebarItems)+'</nav>' +
      '<div class="nfx-shell-sidebar-footer"><div class="nfx-shell-promo"><b>◇</b><strong>Trade Smarter.<br>Build. Test. Execute.</strong><small>One workspace for live trading, strategy design and replay.</small></div><small class="nfx-shell-footer-label">NATHAUXFX · TRADING WORKSPACE</small></div>' +
    '</aside>';
  document.body.appendChild(shell);

  function readTheme() {
    try {
      return localStorage.getItem('nathauxfx_unified_theme')
        || localStorage.getItem('nathauxfx_studio_theme')
        || 'light';
    } catch (_) {
      return 'light';
    }
  }

  function persistReplayTheme(theme) {
    try {
      const key = 'nathauxfx_manual_replay_ui_v1';
      const current = JSON.parse(localStorage.getItem(key) || '{}');
      current.theme = theme;
      localStorage.setItem(key, JSON.stringify(current));
    } catch (_) {}
  }

  function applyTheme(theme, persist = true) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    document.body.dataset.replayTheme = next;
    document.body.classList.toggle('nfx-theme-light', next === 'light');
    document.body.classList.toggle('nfx-theme-dark', next === 'dark');
    const button = document.getElementById('nfxUnifiedTheme');
    if (button) {
      button.textContent = next === 'light' ? '☀' : '☾';
      button.setAttribute('aria-label', next === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    }
    if (persist) {
      try {
        localStorage.setItem('nathauxfx_unified_theme', next);
        localStorage.setItem('nathauxfx_studio_theme', next);
      } catch (_) {}
      persistReplayTheme(next);
    }
    window.dispatchEvent(new CustomEvent('nathauxfx:themechange',{detail:{theme:next}}));
  }

  applyTheme(readTheme(), false);
  document.getElementById('nfxUnifiedTheme')?.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  });

  function syncAppShell() {
    if (page !== 'app') {
      document.body.classList.add('nfx-app-ready');
      shell.classList.remove('nfx-shell-hidden');
      return;
    }
    const app = document.getElementById('mainApp');
    const ready = Boolean(app && !app.classList.contains('hidden') && !app.classList.contains('locked'));
    document.body.classList.toggle('nfx-app-ready', ready);
    shell.classList.toggle('nfx-shell-hidden', !ready);
    if (ready) requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  syncAppShell();
  if (page === 'app') {
    const app = document.getElementById('mainApp');
    if (app) new MutationObserver(syncAppShell).observe(app,{attributes:true,attributeFilter:['class','style']});
    document.addEventListener('flowsignal:authenticated',syncAppShell);
    window.addEventListener('pageshow',syncAppShell);
  }
})();
