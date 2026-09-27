(() => {
  'use strict';
  if (window.innerWidth <= 700) return;
  if (window.location.pathname.includes('/app.html')) return;

  const path = window.location.pathname;
  const isStudio = path.includes('strategy-studio');
  const isSimulator = path.includes('strategy-simulator');
  const isReplay = path.includes('manual-replay');

  document.body.classList.add('nfx-shared-live-topbar');
  if (isReplay) document.body.classList.add('nfx-page-manual-replay');

  const header = document.createElement('header');
  header.className = 'nfx-shared-topbar';
  header.innerHTML =
    '<button class="nfx-shared-menu-toggle" type="button" aria-label="Toggle navigation">☰</button>' +
    '<a class="nfx-shared-brand" href="/app.html"><span class="nfx-shared-brand-wave">≋</span><span>NathauxFX</span></a>' +
    '<div class="nfx-shared-topbar-center"></div>' +
    '<div class="nfx-shared-topbar-actions">' +
      (isReplay ? '<button class="nfx-shared-page-action" id="nfxReplaySettingsProxy" type="button" aria-label="Replay UI settings">⚙</button>' : '') +
      ((isStudio || isSimulator) ? '<button class="nfx-shared-page-action" id="nfxStudioThemeProxy" type="button" aria-label="Toggle page theme">☀</button>' : '') +
      '<button class="nfx-shared-voice" type="button" aria-disabled="true" title="Voice controls are available on the Live Dashboard">Voice OFF</button>' +
      '<select class="nfx-shared-lang" aria-label="Language"><option value="en">EN</option><option value="fr">FR</option><option value="es">ES</option></select>' +
      '<button class="nfx-shared-page-action" id="nfxSharedLogout" type="button" aria-label="Log out">Log out</button>' +
    '</div>';

  document.body.insertBefore(header, document.body.firstChild);

  const menuButton = header.querySelector('.nfx-shared-menu-toggle');
  const sidebar = document.querySelector('.app-sidebar');

  let drawer = null;
  let backdrop = null;
  if (!sidebar) {
    drawer = document.createElement('aside');
    drawer.className = 'nfx-shared-drawer';
    drawer.innerHTML =
      '<nav aria-label="NathauxFX navigation">' +
        '<a href="/app.html">⌂ Dashboard</a>' +
        '<a href="/app.html?desktop=1&open=menuPaperBtn">↗ Live Trading</a>' +
        '<a href="/strategy-studio.html">◇ Strategy Studio</a>' +
        '<a href="/strategy-simulator.html">↻ Simulator</a>' +
        '<a href="/manual-replay" class="'+(isReplay?'active':'')+'">↺ Manual Replay</a>' +
        '<a href="/app.html?desktop=1&open=menuHistoryBtn">◷ History</a>' +
        '<a href="/app.html?desktop=1&open=menuStatsBtn">▤ Analytics</a>' +
      '</nav>';
    backdrop = document.createElement('div');
    backdrop.className = 'nfx-shared-drawer-backdrop';
    document.body.appendChild(drawer);
    document.body.appendChild(backdrop);
  }

  menuButton?.addEventListener('click', () => {
    if (sidebar) {
      document.body.classList.toggle('nfx-side-collapsed');
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
      return;
    }
    drawer?.classList.toggle('open');
    backdrop?.classList.toggle('open');
  });
  backdrop?.addEventListener('click', () => {
    drawer?.classList.remove('open');
    backdrop?.classList.remove('open');
  });

  const replayProxy = document.getElementById('nfxReplaySettingsProxy');
  replayProxy?.addEventListener('click', () => document.getElementById('uiSettingsBtn')?.click());

  const studioThemeProxy = document.getElementById('nfxStudioThemeProxy');
  const originalTheme = document.getElementById('themeToggle');
  const syncThemeIcon = () => {
    if (!studioThemeProxy) return;
    studioThemeProxy.textContent = document.documentElement.dataset.theme === 'light' ? '☾' : '☀';
  };
  studioThemeProxy?.addEventListener('click', () => {
    originalTheme?.click();
    setTimeout(syncThemeIcon,0);
  });
  syncThemeIcon();

  async function logoutSharedSession() {
    const auth = window.FlowSignalAuth;
    if (auth && typeof auth.logout === 'function') {
      await auth.logout();
      return;
    }

    const userSessionKey = 'flowsignal_user_session_token';
    const csrfKey = 'flowsignal_csrf_token';
    const cookieSentinel = '__flowsignal_cookie_session__';
    const rawToken = String(sessionStorage.getItem(userSessionKey) || '').trim();
    const token = rawToken === cookieSentinel ? '' : rawToken;
    const csrf = String(sessionStorage.getItem(csrfKey) || '').trim();

    try {
      let logoutCsrf = csrf;
      let logoutToken = token;
      if (!logoutCsrf) {
        const sessionHeaders = {};
        if (logoutToken) sessionHeaders.Authorization = 'FlowSignalUser ' + logoutToken;
        const sessionResponse = await fetch('/api/proxy/auth/session', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: sessionHeaders
        });
        if (sessionResponse.ok) {
          const sessionPayload = await sessionResponse.json().catch(() => ({}));
          logoutCsrf = String(sessionPayload?.csrf_token || '').trim();
        }
      }
      const headers = {};
      if (logoutCsrf) headers['X-FlowSignal-CSRF'] = logoutCsrf;
      if (logoutToken) headers.Authorization = 'FlowSignalUser ' + logoutToken;
      await fetch('/api/proxy/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers
      });
    } catch (_) {}

    const windowName = String(window.name || '');
    if (windowName.startsWith('flowsignal-tab:')) {
      const tabId = windowName.slice('flowsignal-tab:'.length);
      if (tabId) {
        try {
          localStorage.removeItem('flowsignal_tab_user_session:' + tabId);
          localStorage.removeItem('flowsignal_tab_admin_session:' + tabId);
        } catch (_) {}
      }
    }
    try {
      localStorage.removeItem('flowsignal_user_session_persist');
      localStorage.removeItem('flowsignal_session_token');
      localStorage.removeItem('flowsignal_login_hint');
    } catch (_) {}
    try {
      sessionStorage.setItem('flowsignal_tab_signed_out', '1');
      sessionStorage.removeItem(userSessionKey);
      sessionStorage.removeItem(csrfKey);
      sessionStorage.removeItem('flowsignal_tab_role');
      sessionStorage.removeItem('flowsignal_public_home');
    } catch (_) {}

    window.location.replace('/app.html?home=1');
  }

  document.getElementById('nfxSharedLogout')?.addEventListener('click', () => {
    logoutSharedSession();
  });

  const lang = header.querySelector('.nfx-shared-lang');
  try {
    lang.value = localStorage.getItem('flowsignal_language') || 'en';
  } catch (_) {}
  lang?.addEventListener('change', () => {
    try { localStorage.setItem('flowsignal_language', lang.value); } catch (_) {}
  });
})();
