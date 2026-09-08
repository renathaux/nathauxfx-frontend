(function () {
  'use strict';

  const TAB_ROLE_KEY = 'flowsignal_tab_role';
  const OWNER_TOKEN_KEY = 'flowsignal_session_token';
  const LEGACY_ROLE_KEY = 'flowsignal_role';
  const TAB_WINDOW_PREFIX = 'flowsignal-tab:';

  function normalizeRole(value) {
    const role = String(value || '').toLowerCase();
    return role === 'admin' || role === 'user' ? role : '';
  }

  function restorePersistentOwnerRole() {
    try {
      if (sessionStorage.getItem('flowsignal_user_session_token')) return false;
      if (normalizeRole(sessionStorage.getItem(TAB_ROLE_KEY)) === 'user') return false;

      const role = normalizeRole(localStorage.getItem(LEGACY_ROLE_KEY));
      const token = String(localStorage.getItem(OWNER_TOKEN_KEY) || '').trim();
      if (role !== 'admin' || !token) return false;

      sessionStorage.setItem(TAB_ROLE_KEY, 'admin');
      sessionStorage.removeItem('flowsignal_tab_signed_out');
      sessionStorage.removeItem('flowsignal_public_home_mode');
      sessionStorage.removeItem('flowsignal_binary_user_id');

      let current = String(window.name || '');
      let tabId = current.startsWith(TAB_WINDOW_PREFIX)
        ? current.slice(TAB_WINDOW_PREFIX.length)
        : '';
      if (!tabId) {
        tabId = crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        window.name = `${TAB_WINDOW_PREFIX}${tabId}`;
      }
      localStorage.setItem(`flowsignal_tab_admin_session:${tabId}`, JSON.stringify({ token }));
      localStorage.setItem('flowsignal_access', JSON.stringify({ granted: true, time: Date.now() }));
      return true;
    } catch (_error) {
      return false;
    }
  }

  restorePersistentOwnerRole();

  function authenticatedRole() {
    return normalizeRole(window.FlowSignalAuth?.user?.role);
  }

  function isChromeDesktop() {
    const ua = String(navigator.userAgent || '');
    return /Chrome\//.test(ua) && !/(Edg|OPR|SamsungBrowser)\//.test(ua) && window.matchMedia('(min-width: 701px)').matches;
  }

  function isSafariDesktop() {
    const ua = String(navigator.userAgent || '');
    return /Safari\//.test(ua) && /Version\//.test(ua) && !/(Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS)\//.test(ua) && window.matchMedia('(min-width: 701px)').matches;
  }

  const chromeDesktop = isChromeDesktop();
  const safariDesktop = isSafariDesktop();
  const supportedDesktop = chromeDesktop || safariDesktop;
  if (chromeDesktop) document.body?.classList.add('flowsignal-chrome-desktop');
  if (safariDesktop) document.body?.classList.add('flowsignal-safari-desktop');

  function loadUserAuth() {
    const existing = document.querySelector('script[data-flowsignal-user-auth]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'user-auth.js?v=5';
    script.async = false;
    script.dataset.flowsignalUserAuth = 'true';
    script.addEventListener('error', () => console.warn('USER_AUTH_LOAD_FAILED'));
    document.body.appendChild(script);
  }

  function loadBinaryMiniApp() {
    if (document.querySelector('script[data-flowsignal-binary-app]')) return;
    const script = document.createElement('script');
    script.src = 'binary/binary-app.js?v=24';
    script.async = true;
    script.dataset.flowsignalBinaryApp = 'true';
    script.addEventListener('error', () => console.warn('BINARY_APP_LOAD_FAILED'));
    document.body.appendChild(script);
  }

  function loadBinarySessionRecovery() {
    if (document.querySelector('script[data-flowsignal-binary-session-recovery]')) return;
    const script = document.createElement('script');
    script.src = 'binary/binary-session-recovery.js?v=1';
    script.async = true;
    script.dataset.flowsignalBinarySessionRecovery = 'true';
    script.addEventListener('error', () => console.warn('BINARY_SESSION_RECOVERY_LOAD_FAILED'));
    document.body.appendChild(script);
  }

  function installSafariSpeechNormalizer() {
    if (!safariDesktop || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
    if (window.speechSynthesis.__flowSignalSafariVoicePatched) return;
    const synth = window.speechSynthesis;
    const nativeSpeak = synth.speak.bind(synth);
    const prefix = (lang) => String(lang || document.documentElement.lang || 'en-US').toLowerCase().split('-')[0];
    function voiceFor(lang) {
      const voices = synth.getVoices?.() || [];
      const p = prefix(lang);
      const names = p === 'fr' ? ['Amélie', 'Audrey', 'Thomas'] : p === 'es' ? ['Mónica', 'Monica', 'Jorge', 'Paulina'] : ['Samantha', 'Ava', 'Allison', 'Susan', 'Alex'];
      for (const name of names) {
        const voice = voices.find((item) => item.name === name && prefix(item.lang) === p);
        if (voice) return voice;
      }
      return voices.find((item) => prefix(item.lang) === p && item.localService !== false) || voices.find((item) => prefix(item.lang) === p) || null;
    }
    synth.speak = function (utterance) {
      if (utterance instanceof SpeechSynthesisUtterance) {
        const voice = voiceFor(utterance.lang);
        if (voice) {
          utterance.voice = voice;
          if (!utterance.lang) utterance.lang = voice.lang;
        }
        utterance.rate = 0.94;
        utterance.pitch = 1;
        utterance.volume = 1;
      }
      return nativeSpeak(utterance);
    };
    synth.__flowSignalSafariVoicePatched = true;
  }
  installSafariSpeechNormalizer();

  function getTabRole() { return authenticatedRole() || normalizeRole(sessionStorage.getItem(TAB_ROLE_KEY)); }
  function setTabRole(role) {
    const normalized = normalizeRole(role);
    if (!normalized) return false;
    if (authenticatedRole() && normalized !== authenticatedRole()) return false;
    sessionStorage.setItem(TAB_ROLE_KEY, normalized);
    document.body.dataset.userRole = normalized;
    return true;
  }

  window.isAdminAccount = function () { return getTabRole() === 'admin'; };

  function currentStrategyHasFreshSignal() {
    const signal = String(document.getElementById('main-signal')?.textContent || '').trim().toUpperCase();
    return signal === 'BUY' || signal === 'SELL';
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element && element.textContent !== value) element.textContent = value;
  }

  function currentWaitReason() {
    const values = [
      document.getElementById('main-blocked-reason')?.textContent,
      document.getElementById('main-rr')?.textContent,
      document.getElementById('v2-shadow-reason')?.textContent,
    ].map((value) => String(value || '').trim()).filter(Boolean);
    return values.find((value) => /^WAIT(?:_|$)/i.test(value)) || values.find((value) => value !== '--' && value !== 'WAIT') || '--';
  }

  function forceVisible(element, display = 'block') {
    if (!element) return;
    element.classList.remove('hidden', 'admin-only-hidden');
    element.removeAttribute('hidden');
    element.setAttribute('aria-hidden', 'false');
    element.style.setProperty('display', display, 'important');
    element.style.setProperty('visibility', 'visible', 'important');
    element.style.setProperty('opacity', '1', 'important');
  }

  function applyChromeReadability() {
    if (!chromeDesktop) return;
    const bias = document.getElementById('fundamental-bias');
    if (bias) {
      bias.style.setProperty('font-size', '30px', 'important');
      bias.style.setProperty('line-height', '1', 'important');
      bias.style.setProperty('white-space', 'nowrap', 'important');
    }
  }

  function ensureSafariInsightVisibility() {
    if (!safariDesktop) return;
    forceVisible(document.querySelector('.news-impact-panel'));
    forceVisible(document.getElementById('fundamental-insight-card'));
    forceVisible(document.getElementById('v2-shadow-card'));
  }

  function keepAnalysisCardsVisible() {
    const smc = document.querySelector('.main-smc-panel');
    const intel = document.getElementById('main-smc-plan-intel');
    const checks = document.querySelector('.entry-strategy-debug');
    forceVisible(smc);
    forceVisible(intel);
    forceVisible(checks);
    if (checks) checks.open = true;
  }

  function ensureDesktopAnalysisLayout() {
    if (!supportedDesktop) return;
    const left = document.querySelector('.left-panel') || document.querySelector('.left-column') || document.getElementById('eurusd-card')?.parentElement;
    const checks = document.querySelector('.entry-strategy-debug');
    const gold = document.getElementById('gold-card');
    if (left && checks && gold && (checks.parentElement !== left || gold.nextElementSibling !== checks)) {
      gold.insertAdjacentElement('afterend', checks);
    }
  }

  function ensureDesktopHistoryPlacement() {
    if (!supportedDesktop) return;
    const grid = document.querySelector('.dashboard-grid');
    const history = document.querySelector('.history-section');
    if (!grid || !history) return;

    if (history.parentElement !== grid) {
      grid.appendChild(history);
    }

    history.style.setProperty('grid-column', '1 / -1', 'important');
    history.style.setProperty('grid-row', '2', 'important');
    history.style.setProperty('position', 'relative', 'important');
    history.style.setProperty('left', 'auto', 'important');
    history.style.setProperty('right', 'auto', 'important');
    history.style.setProperty('bottom', 'auto', 'important');
    history.style.setProperty('width', '100%', 'important');
    history.style.setProperty('margin', '0', 'important');
    history.style.setProperty('align-self', 'start', 'important');
  }

  function clearExpiredEntryChecks() {
    if (!supportedDesktop || currentStrategyHasFreshSignal()) return;
    keepAnalysisCardsVisible();
    ['strategy-debug-smc', 'strategy-debug-swing-break', 'strategy-debug-15m-close', 'strategy-debug-5m-confirm', 'strategy-debug-swing-sl'].forEach((id) => setText(id, 'NO'));
    setText('strategy-debug-decision', 'WAIT');
    setText('strategy-debug-block-reason', currentWaitReason());
  }

  function syncCurrentStrategyPresentation() {
    if (!supportedDesktop) return;
    keepAnalysisCardsVisible();
    ensureDesktopAnalysisLayout();
    applyChromeReadability();
    if (!currentStrategyHasFreshSignal()) clearExpiredEntryChecks();
  }

  function ensureUserAnalysisVisibility() {
    if (!supportedDesktop || getTabRole() !== 'user') {
      if (supportedDesktop) syncCurrentStrategyPresentation();
      return;
    }
    const panel = document.querySelector('.main-trade-panel');
    const card = document.querySelector('.main-trade-card');
    forceVisible(panel);
    forceVisible(card);
    [panel, card].forEach((element) => {
      if (!element) return;
      element.style.setProperty('height', 'auto', 'important');
      element.style.setProperty('max-height', 'none', 'important');
      element.style.setProperty('overflow', 'visible', 'important');
    });
    keepAnalysisCardsVisible();
    syncCurrentStrategyPresentation();
  }

  function refreshRoleUi() {
    const role = getTabRole();
    if (!role) return;
    document.body.dataset.userRole = role;
    try { window.applyRoleVisibility?.(); } catch (_error) {}
    try { window.updatePnlVisibility?.(); } catch (_error) {}
    applyChromeReadability();
    ensureSafariInsightVisibility();
    ensureDesktopAnalysisLayout();
    ensureDesktopHistoryPlacement();
    if (supportedDesktop) ensureUserAnalysisVisibility();
  }

  document.addEventListener('flowsignal:authenticated', () => {
    const role = authenticatedRole();
    if (role) sessionStorage.setItem(TAB_ROLE_KEY, role);
    setTimeout(refreshRoleUi, 0);
    setTimeout(refreshRoleUi, 250);
  });
  window.addEventListener('load', () => {
    setTimeout(refreshRoleUi, 0);
    setTimeout(refreshRoleUi, 300);
    setTimeout(ensureDesktopHistoryPlacement, 700);
  }, { once: true });

  refreshRoleUi();
  loadUserAuth();
  loadBinaryMiniApp();
  loadBinarySessionRecovery();

  window.FlowSignalTabRole = {
    get: getTabRole,
    set(role) {
      if (!setTabRole(role)) return false;
      refreshRoleUi();
      return true;
    },
  };
})();